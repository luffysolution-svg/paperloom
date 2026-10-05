#!/usr/bin/env python3

import argparse
import json
import os
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


# 40002 是 frontend/web-react（Vite 迁移工作区）；本脚本断言的是
# frontend/web 的 DOM，它跑在 40001。
DEFAULT_URL = "http://127.0.0.1:40001/?mock=translate"


def parse_args():
    parser = argparse.ArgumentParser(description="Smoke test RetainPDF mock submit lifecycle in Chromium.")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--chromium", default="")
    parser.add_argument("--debug-port", type=int, default=9233)
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
        # macOS：上面几个路径都不存在，缺这一条会直接 SystemExit
        #（与 frontend-homepage-smoke.py 对齐）。
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ):
        if candidate.startswith("/Applications/") and os.path.exists(candidate):
            return candidate
        if shutil.which(candidate) or shutil.which(candidate.split("/")[-1]):
            return candidate
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
    if "mock" in query:
        return url
    separator = "&" if parsed.query else "?"
    return f"{url}{separator}mock=translate"


def run_mock_submit(send):
    return evaluate(send, """
(async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const snapshots = [];
  let createdEvents = 0;
  let updatedEvents = 0;
  document.addEventListener("retainpdf:library-job-created", () => { createdEvents += 1; });
  document.addEventListener("retainpdf:library-job-updated", () => { updatedEvents += 1; });

  const snapshot = (label) => {
    const cards = Array.from(document.querySelectorAll("recent-job-card, .recent-job-item"));
    const first = cards[0];
    snapshots.push({
      label,
      cardCount: cards.length,
      firstJobId: first?.jobId || first?.dataset?.jobId || "",
      firstText: (first?.innerText || first?.textContent || "").replace(/\\s+/g, " ").trim(),
      workflowOpen: document.getElementById("translation-workflow-dialog")?.dataset?.open || "",
      submitDisabled: Boolean(document.getElementById("submit-btn")?.disabled),
      // 进行中的状态改读卡片真正画出来的东西：data-status + 封面进度条宽度。
      // （原来这里还采 #status-section 的 hidden 类——那个 id 早就不在 DOM 里了，
      //  Boolean(null?.…) 恒为 false，而且从来没有任何断言读它，纯死字段。）
      firstStatus: first?.dataset?.status || "",
      firstProgressWidths: first
        ? Array.from(first.querySelectorAll("[style*='width']")).map((node) => node.style.width)
        : [],
    });
  };

  snapshot("initial");
  document.querySelector("#library-add-pdf-btn")?.click?.();
  await delay(120);
  snapshot("opened");
  const submit = document.querySelector("#submit-btn");
  submit?.click?.();
  await delay(900);
  snapshot("submitted");
  await delay(1800);
  snapshot("settled");

  return {
    href: location.href,
    createdEvents,
    updatedEvents,
    snapshots,
  };
})()
""")


def assert_mock_submit(report, events):
    errors = []
    snapshots = report.get("snapshots") or []
    opened = next((item for item in snapshots if item.get("label") == "opened"), {})
    submitted = next((item for item in snapshots if item.get("label") == "submitted"), {})
    settled = next((item for item in snapshots if item.get("label") == "settled"), {})
    if opened.get("workflowOpen") != "1":
        errors.append("add PDF did not open workflow dialog")
    if opened.get("submitDisabled"):
        errors.append("mock submit button is disabled")
    if report.get("createdEvents", 0) < 1:
        errors.append("mock submit did not publish library-job-created")
    if "mock-job-20260415" not in f"{submitted.get('firstJobId', '')} {settled.get('firstJobId', '')}":
        errors.append("mock job card was not present after submit")
    # 进行中的卡片不再写阶段角标（library-card-badge.ts 的决策：角标文案易截断，
    # 改由封面进度/动画表达），所以 "翻译中"/"处理中" 在 DOM 里确实不存在了。
    # 改断言卡片真正画出来的两样东西：运行态 + 封面进度条。
    active = [item for item in (submitted, settled) if item]
    if not any(f"{item.get('firstStatus', '')}" in {"running", "queued"} for item in active):
        errors.append("mock job card did not enter a running state after submit")
    if not any(item.get("firstProgressWidths") for item in active):
        errors.append("mock job card drew no progress bar while running")
    if int(settled.get("cardCount") or 0) < 1:
        errors.append("recent job cards disappeared after mock submit")
    exceptions = [event for event in events if event and event[0] == "exception"]
    if exceptions:
        errors.append(f"runtime exceptions: {exceptions[:3]}")
    if errors:
        raise AssertionError("; ".join(errors))


def main():
    args = parse_args()
    binary = chromium_binary(args.chromium)
    profile = tempfile.mkdtemp(prefix="retainpdf-mock-submit-")
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
        report = run_mock_submit(send)
        assert_mock_submit(report, events)
        if args.json:
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2))
        else:
            settled = next((item for item in report.get("snapshots", []) if item.get("label") == "settled"), {})
            print(f"mock submit smoke ok: {settled.get('cardCount')} cards, first={settled.get('firstJobId')}")
        return 0
    except Exception as exc:
        if "report" in locals():
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2), file=sys.stderr)
        print(f"mock submit smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
