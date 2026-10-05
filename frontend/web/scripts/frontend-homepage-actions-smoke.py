#!/usr/bin/env python3

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

try:
    import websocket
except ImportError as exc:
    raise SystemExit("python websocket-client is required for this smoke script") from exc


# 40002 是 frontend/web-react（Vite 迁移工作区）；本脚本断言的是
# frontend/web 的 DOM，它跑在 40001。
DEFAULT_URL = "http://127.0.0.1:40001/"


def parse_args():
    parser = argparse.ArgumentParser(description="Smoke test RetainPDF homepage actions in Chromium.")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--chromium", default="")
    parser.add_argument("--debug-port", type=int, default=9232)
    parser.add_argument("--wait-seconds", type=float, default=8)
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


def run_actions(send):
    # 这段以前是**同步**的：点一下就立刻读 DOM，而 React 要下一拍才挂上对话框，
    # 于是三条「是否可达」的断言天然读到空。改成 async + delay。
    #
    # 入口也变了：#credentials-btn / #app-update-btn 并不长在主页上，它们在设置
    # 弹窗内部（SettingsDialog 的 api / update 面板）。主页的真实入口是
    # #app-settings-btn；点开后 API 区内嵌凭据工作台（#browser-api-key），
    # 更新区内是 #app-update-btn。Radix 的 Tab 触发挂在 mousedown 上，所以切
    # tab 要补 mousedown，不能只 dispatch click。
    return evaluate(send, """
(async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const click = (selector) => {
    const node = document.querySelector(selector);
    node?.click?.();
    return Boolean(node);
  };
  const pressTab = (name) => {
    const node = document.querySelector(`[data-settings-tab="${name}"]`);
    node?.dispatchEvent?.(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    node?.click?.();
    return Boolean(node);
  };
  const esc = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  const firstCard = document.querySelector("recent-job-card, .recent-job-item");
  const firstJobId = firstCard?.jobId || firstCard?.dataset?.jobId || "";

  // ① 添加 PDF → 上传工作流弹窗
  const addPdf = click("#library-add-pdf-btn");
  await delay(900);
  const workflowOpen = document.getElementById("translation-workflow-dialog")?.dataset?.open || "";
  esc();
  await delay(600);

  // ② 设置 → API 区（凭据工作台内嵌，不再是独立的 browser-credentials-dialog）
  const settings = click("#app-settings-btn");
  await delay(900);
  const settingsExists = Boolean(document.getElementById("app-settings-dialog"));
  pressTab("api");
  await delay(600);
  const credentialsReachable = Boolean(document.getElementById("browser-api-key"));

  // ③ 同一个设置弹窗里切到「更新」区
  const update = pressTab("update");
  await delay(700);
  const updatePanel = document.querySelector('[data-settings-panel="update"]');
  const updateReachable = Boolean(updatePanel && !updatePanel.hasAttribute("hidden")
    && document.getElementById("app-update-btn"));
  esc();
  await delay(600);

  // ④ 卡片上的阅读入口与详情入口
  const reader = firstCard?.querySelector?.(".recent-job-reader");
  reader?.click?.();
  await delay(400);
  firstCard?.dispatchEvent?.(new MouseEvent("click", { bubbles: true }));
  await delay(700);

  return {
    href: location.href,
    cardCount: document.querySelectorAll("recent-job-card, .recent-job-item").length,
    firstJobId,
    addPdf,
    workflowOpen,
    settings,
    settingsExists,
    credentialsReachable,
    update,
    updateReachable,
    readerExists: Boolean(reader),
    readerDialogExists: Boolean(document.getElementById("reader-dialog")),
    detailDialogExists: Boolean(document.getElementById("job-detail-modal")
      || document.getElementById("status-detail-dialog")
      || document.getElementById("book-detail-dialog")),
  };
})()
""")


def assert_actions(report, events):
    errors = []
    if not report.get("addPdf") or report.get("workflowOpen") != "1":
        errors.append("add PDF button did not open workflow dialog")
    if not report.get("settings") or not report.get("settingsExists"):
        errors.append("settings dialog is not reachable")
    if not report.get("credentialsReachable"):
        errors.append("credentials workbench is not reachable from settings api tab")
    if not report.get("update") or not report.get("updateReachable"):
        errors.append("update panel is not reachable from settings")
    if not report.get("firstJobId") or int(report.get("cardCount") or 0) < 1:
        errors.append("no recent job card found")
    if not report.get("readerExists"):
        errors.append("first recent job card has no reader action")
    exceptions = [event for event in events if event and event[0] == "exception"]
    if exceptions:
        errors.append(f"runtime exceptions: {exceptions[:3]}")
    if errors:
        raise AssertionError("; ".join(errors))


def main():
    args = parse_args()
    binary = chromium_binary(args.chromium)
    profile = tempfile.mkdtemp(prefix="retainpdf-homepage-actions-")
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
        send("Page.navigate", {"url": args.url})
        time.sleep(args.wait_seconds)
        report = run_actions(send)
        assert_actions(report, events)
        if args.json:
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2))
        else:
            print(f"homepage actions smoke ok: {report.get('cardCount')} cards, first={report.get('firstJobId')}")
        return 0
    except Exception as exc:
        if "report" in locals():
            print(json.dumps({"report": report, "events": events}, ensure_ascii=False, indent=2), file=sys.stderr)
        print(f"homepage actions smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
