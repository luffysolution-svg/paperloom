#!/usr/bin/env python3

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

try:
    import websocket
except ImportError as exc:
    raise SystemExit("python websocket-client is required for this smoke script") from exc


# 40002 是 frontend/web-react 那个 Vite 迁移工作区的端口（见 README），本脚本断言的
# 是 frontend/web 的 DOM，默认必须指向本工作区的开发端口 40001
# （与 scripts/frontend-homepage-smoke.py 一致）。
DEFAULT_URL = "http://127.0.0.1:40001/?mock=parallel"


def parse_args():
    parser = argparse.ArgumentParser(description="Smoke test RetainPDF parallel translation/render status in Chromium.")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--chromium", default="")
    parser.add_argument("--debug-port", type=int, default=9234)
    parser.add_argument("--wait-seconds", type=float, default=6)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def chromium_binary(explicit):
    if explicit:
        return explicit
    for candidate in (
        "/snap/bin/chromium",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ):
        if shutil.which(candidate) or shutil.which(candidate.split("/")[-1]) or candidate.startswith("/Applications/"):
            return candidate
    found = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if found:
        return found
    raise SystemExit("Chromium/Chrome binary not found")


def wait_for_page(debug_port):
    endpoint = f"http://127.0.0.1:{debug_port}/json/list"
    for _ in range(80):
        try:
            with urllib.request.urlopen(endpoint, timeout=1) as response:
                targets = json.load(response)
            for target in targets:
                if target.get("type") == "page" and target.get("webSocketDebuggerUrl"):
                    return target
        except Exception:
            pass
        time.sleep(0.1)
    raise RuntimeError("Chromium DevTools page target unavailable")


def make_cdp(ws):
    counter = {"id": 0}
    events = []

    def send(method, params=None):
        counter["id"] += 1
        message_id = counter["id"]
        ws.send(json.dumps({"id": message_id, "method": method, "params": params or {}}))
        while True:
            message = json.loads(ws.recv())
            event_method = message.get("method")
            if event_method == "Runtime.exceptionThrown":
                details = message.get("params", {}).get("exceptionDetails", {})
                events.append([
                    "exception",
                    details.get("text"),
                    details.get("exception", {}).get("description"),
                ])
            elif event_method == "Runtime.consoleAPICalled":
                args = message.get("params", {}).get("args", [])
                events.append([
                    "console",
                    message.get("params", {}).get("type"),
                    " ".join(str(item.get("value") or item.get("description") or "") for item in args),
                ])
            if message.get("id") == message_id:
                return message

    return send, events


def evaluate(send, expression):
    result = send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    return result.get("result", {}).get("result", {}).get("value") or {}


def append_mock_query(url):
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    if query.get("mock") == ["parallel"]:
        return url
    separator = "&" if parsed.query else "?"
    return f"{url}{separator}mock=parallel"


def collect_report(send):
    # 落点说明（主页页面级状态卡 #job-status-card 已下线后的改写）：
    # 本脚本本意是「点最近任务卡 → 能看到该任务的阶段/进度，且不被后台 render
    # 预热抢走主舞台」。进度主场已收敛到书籍详情弹窗的「进度」Tab：
    #   点书架卡（.recent-job-item[data-book-card]）→ #book-detail-dialog
    #   → 点 #book-detail-tab-processing → #book-detail-panel-processing
    #   → #book-detail-status-section → 嵌入状态卡 #book-detail-job-status-card
    # 卡内 id 是原契约名加 book-detail- 前缀（createPrefixedStatusCardIds）。
    # 书籍详情的 Tab 是 Radix Tabs，激活挂在 mousedown 上，所以模拟点击补全
    # mousedown→click。
    return evaluate(send, """
(async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fire = (el, type) => el?.dispatchEvent?.(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
  const click = (el) => { fire(el, "mousedown"); fire(el, "click"); };
  const flat = (el) => (el?.innerText || el?.textContent || "").replace(/\\s+/g, " ").trim();
  const cardSelector = "[data-book-card], recent-job-card, .recent-job-item";

  const firstCard = document.querySelector(cardSelector);
  click(firstCard);
  await delay(1200);
  click(document.getElementById("book-detail-tab-processing"));
  await delay(1800);

  const panel = document.getElementById("book-detail-panel-processing");
  const statusCard = document.getElementById("book-detail-job-status-card");
  const selectedStep = statusCard?.querySelector?.(".status-stage-step[aria-selected='true'], .status-stage-step.is-selected");
  const activeStep = statusCard?.querySelector?.(".status-stage-step.is-active");
  return {
    href: location.href,
    cardCount: document.querySelectorAll(cardSelector).length,
    firstJobId: firstCard?.jobId || firstCard?.dataset?.jobId || "",
    firstCardText: flat(firstCard),
    firstCardStatus: firstCard?.dataset?.status || "",
    firstCardBadges: Array.from(firstCard?.querySelectorAll?.("[data-badge-label]") || []).map((el) => el.dataset.badgeLabel),
    firstCardProgressWidths: Array.from(firstCard?.querySelectorAll?.("[style*='width']") || []).map((el) => el.style?.width || "").filter(Boolean),
    detailOpen: document.getElementById("book-detail-dialog") ? "1" : "",
    processingPanelOpen: panel && !panel.hasAttribute("hidden") ? "1" : "",
    statusSectionPresent: document.getElementById("book-detail-status-section") ? "1" : "",
    statusCardPresent: statusCard ? "1" : "",
    statusHidden: Boolean(statusCard?.classList?.contains("hidden")),
    statusText: flat(statusCard),
    ringLabel: document.getElementById("book-detail-status-ring-label")?.textContent || "",
    ringValue: document.getElementById("book-detail-status-ring-value")?.textContent || "",
    stageDetail: document.getElementById("book-detail-status-stage-detail")?.textContent || "",
    progressPercent: document.getElementById("book-detail-status-progress-percent")?.textContent || "",
    progressText: document.getElementById("book-detail-job-progress-text")?.textContent || "",
    selectedStageKey: selectedStep?.dataset?.stageKey || statusCard?.dataset?.selectedStage || "",
    activeStageKey: activeStep?.dataset?.stageKey || "",
  };
})()
""")


def percent_values(raw_widths):
    """把 ["13%"] 这类内联宽度解析成数值，无法解析的丢弃。"""
    values = []
    for raw in raw_widths:
        try:
            values.append(float(str(raw).replace("%", "").strip()))
        except ValueError:
            continue
    return values


def assert_parallel_status(report, events):
    errors = []
    card_text = report.get("firstCardText", "")
    status_text = report.get("statusText", "")
    combined = " ".join([
        card_text,
        status_text,
        report.get("ringLabel", ""),
        report.get("ringValue", ""),
        report.get("stageDetail", ""),
        report.get("progressText", ""),
    ])
    # 旧断言读的是 #translation-workflow-dialog 的 data-open 和 #status-section
    # 的 hidden；那个工作流弹窗不再是进度入口（"进度主场永远在本面板，绝不打开
    # #translation-workflow-dialog"），主页页面级状态卡也已下线。同一件事现在的
    # 落点：点卡片要能打开书籍详情 → 进度 Tab 展开 → 状态区/嵌入卡真的挂出来且可见。
    if report.get("detailOpen") != "1":
        errors.append("book detail dialog did not open from the recent job card")
    if report.get("processingPanelOpen") != "1":
        errors.append("book detail processing tab did not open")
    if report.get("statusSectionPresent") != "1" or report.get("statusCardPresent") != "1":
        errors.append("processing tab did not mount the job status card")
    if report.get("statusHidden"):
        errors.append("job status card mounted hidden")
    # 旧断言读卡面文案里的「翻译中 / 渲染中」。书架卡片进行中已经不写阶段角标了
    # （library-card-badge.ts 文件头决策表：「进行中（排队/OCR/翻译/渲染）不在角标
    # 写文案（易截断），改由封面中央加载动画表达」），所以那两个字符串在 DOM 里确实
    # 不存在了。同一件事改由卡片真正画出来的东西承担：进行中卡片底部那条进度条的
    # 宽度 = recentJobProgressPercent(item)。parallel 场景里主泳道翻译是 120/900≈13%、
    # 后台 render 预热是 2/3≈67%——两者数值相隔极远，「卡片跟的是主泳道还是被后台
    # 预热盖掉」照样是可判的，判据比文案更贴近真实渲染。
    card_widths = percent_values(report.get("firstCardProgressWidths") or [])
    card_badges = [str(label) for label in (report.get("firstCardBadges") or [])]
    if report.get("firstCardStatus", "") not in ("queued", "running", "pending", "processing", "validating"):
        errors.append(f"recent job card is not showing the job as running: status={report.get('firstCardStatus')!r}")
    if not any(12.0 <= width <= 14.5 for width in card_widths):
        errors.append(
            "recent job card progress bar is not tracking the main translation lane "
            f"(120/900 = 13%), got {report.get('firstCardProgressWidths')}"
        )
    if any(60.0 <= width <= 75.0 for width in card_widths):
        errors.append(
            "recent job card was overwritten by background render stage "
            f"(render prewarm 2/3 = 67%), got {report.get('firstCardProgressWidths')}"
        )
    if any("渲染" in label for label in card_badges):
        errors.append(f"recent job card badge was overwritten by background render stage: {card_badges}")
    if "翻译" not in combined:
        errors.append("status card is not showing translation content")
    if "第 120/900 批" not in combined and "120/900" not in combined:
        errors.append("status card did not preserve translation batch progress")
    if report.get("selectedStageKey") == "render":
        errors.append("status card selected render stage for background prewarm")
    if report.get("activeStageKey") == "render":
        errors.append("status card flow highlighted render stage for background prewarm")
    exceptions = [event for event in events if event and event[0] == "exception"]
    if exceptions:
        errors.append(f"runtime exceptions: {exceptions[:3]}")
    if errors:
        raise AssertionError("; ".join(errors))


def main():
    args = parse_args()
    binary = chromium_binary(args.chromium)
    profile = tempfile.mkdtemp(prefix="retainpdf-parallel-status-")
    proc = subprocess.Popen([
        binary,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-extensions",
        f"--remote-debugging-port={args.debug_port}",
        "--remote-allow-origins=*",
        f"--user-data-dir={profile}",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        target = wait_for_page(args.debug_port)
        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=5)
        send, events = make_cdp(ws)
        send("Runtime.enable")
        send("Page.enable")
        send("Network.enable")
        send("Page.navigate", {"url": append_mock_query(args.url)})
        time.sleep(args.wait_seconds)
        report = collect_report(send)
        assert_parallel_status(report, events)
        if args.json:
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2))
        else:
            print(f"parallel status smoke ok: first={report.get('firstJobId')}, progress={report.get('progressText')}")
        return 0
    except Exception as exc:
        if "report" in locals():
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2), file=sys.stderr)
        print(f"parallel status smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
