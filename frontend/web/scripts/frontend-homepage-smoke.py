#!/usr/bin/env python3

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

try:
    import websocket
except ImportError as exc:
    raise SystemExit("python websocket-client is required for this smoke script") from exc


DEFAULT_URL = "http://127.0.0.1:40001/?v=homepage-smoke"

# 首页冷启动真正拉书架数据的两个 list 端点。
#
# 这里以前断言的是 /api/v1/jobs——那是书架还按 job 建模时代的端点。书架迁到
# document-first（fetchDocumentList + fetchLibraryBookList）之后首页一次冷启动
# 一个 /api/v1/jobs 都不会发，于是这条断言从「后端联通性门禁」退化成了必然失败。
# 带 `?` 是为了只认 list 请求，把 /api/v1/documents/<id>/thumbnail 这类逐卡片的
# 附属请求排除在外（一次冷启动有上百个，命中它们等于白断言）。
LIBRARY_LIST_URL_MARKERS = ("/api/v1/documents?", "/api/v1/library/books?")


def is_library_list_url(url):
    return any(marker in url for marker in LIBRARY_LIST_URL_MARKERS)


def parse_args():
    parser = argparse.ArgumentParser(description="Smoke test the RetainPDF homepage in Chromium.")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--chromium", default="")
    parser.add_argument("--debug-port", type=int, default=9231)
    parser.add_argument("--wait-seconds", type=float, default=8)
    parser.add_argument("--min-books", type=int, default=1)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def chromium_binary(explicit):
    if explicit:
        return explicit
    for candidate in (
        "/snap/bin/chromium",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
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
    responses = []

    def pump(message):
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
        elif event_method == "Network.responseReceived":
            response = message.get("params", {}).get("response", {})
            url = response.get("url", "")
            if is_library_list_url(url) or "app.bundle" in url or "runtime-config" in url:
                responses.append([response.get("status"), url])

    def send(method, params=None):
        counter["id"] += 1
        message_id = counter["id"]
        ws.send(json.dumps({"id": message_id, "method": method, "params": params or {}}))
        while True:
            message = json.loads(ws.recv())
            pump(message)
            if message.get("id") == message_id:
                return message

    def drain(seconds):
        # 等待期里主动泵 socket，而不是干 sleep。CDP 事件在 sleep 期间只会堆在内核
        # 接收缓冲区里，等下一次 send() 顺带回收——首页一次冷启动要打上百个缩略图
        # 请求，靠缓冲区兜底随时可能把真正要断言的 list 响应挤掉。
        deadline = time.monotonic() + seconds
        original_timeout = ws.gettimeout()
        try:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return
                ws.settimeout(min(0.25, remaining))
                try:
                    pump(json.loads(ws.recv()))
                except Exception:
                    pass
        finally:
            ws.settimeout(original_timeout)

    return send, drain, events, responses


def evaluate_homepage(send):
    expression = """
(() => ({
  href: location.href,
  bodyText: document.body.innerText.slice(0, 1200),
  runtimeConfig: window.__FRONT_RUNTIME_CONFIG__ || {},
  appShell: !!document.getElementById('app-shell'),
  addPdf: !!document.getElementById('library-add-pdf-btn'),
  listChildren: document.getElementById('recent-jobs-list')?.children.length ?? -1,
  emptyClass: document.getElementById('recent-jobs-empty')?.className || '',
}))()
"""
    result = send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    return result.get("result", {}).get("result", {}).get("value") or {}


def click_add_pdf(send):
    # 点完不能同步读 DOM。#library-add-pdf-btn 是普通 React <button>，element.click()
    # 完全点得动（onClick → requestOpenUpload 同步派发 CustomEvent）；但它打开的
    # translation-workflow-dialog 是 Radix Dialog 的 Content，**关闭时根本不挂载**，
    # 要等 React 下一拍 commit 才出现在 portal 里。旧版在同一个表达式里点完立刻
    # getElementById，于是永远读到 null → className/open 双空 → 断言必挂。
    # 兄弟脚本 frontend-homepage-actions-smoke.py 早踩过同一个坑（见其 click 注释）。
    #
    # 用轮询而不是固定 delay：挂载快就早返回，慢也有 5 秒上限兜底。
    expression = """
(async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const button = document.getElementById('library-add-pdf-btn');
  button?.click();
  const deadline = Date.now() + 5000;
  let dialog = null;
  while (Date.now() < deadline) {
    dialog = document.getElementById('translation-workflow-dialog');
    if (dialog?.dataset?.open === '1') break;
    await delay(100);
  }
  return {
    clicked: !!button,
    className: dialog?.className || '',
    open: dialog?.dataset?.open || '',
    ariaExpanded: button?.getAttribute('aria-expanded') || '',
    buttonWorkflowOpen: button?.dataset?.workflowOpen || '',
  };
})()
"""
    result = send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    return result.get("result", {}).get("result", {}).get("value") or {}


def evaluate_inline_error(send):
    """行内错误盒的状态。必须在对话框打开**之后**才采。

    #error-box-inline 由 InlineErrorBox 渲染，而它挂在 WorkflowPanel 里、也就是对话框
    内部。此前这段和其余 summary 一起在点击**之前**采集，那时对话框还没挂载，于是
    textContent/className 恒为空字符串，那条「行内错误是否可见」的断言从来没有真正
    跑过——是死代码。这里单独采一次，让它重新生效。

    present 只记录不断言：对话框分步骤渲染，错误盒未必在每种形态下都挂上，拿它当
    硬性条件会引入一条与本断言意图无关的脆弱性。
    """
    expression = """
(() => {
  const box = document.getElementById('error-box-inline');
  return {
    inlineErrorPresent: !!box,
    inlineErrorText: box?.textContent || '',
    inlineErrorClass: box?.className || '',
  };
})()
"""
    result = send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    return result.get("result", {}).get("result", {}).get("value") or {}


def probe_api_base(api_base, timeout=4):
    """apiBase 能不能连上。返回不可达的原因，可达则返回空串。

    这个 smoke 从 127.0.0.1:40001 加载页面，但页面里的 apiBase 由
    runtime-config.local.js 决定，本机联调时它指向一个局域网 IP（后端绑 0.0.0.0）。
    换个网络环境那个 IP 就不通了，而失败会以「没观察到书架 list 响应」的形式冒出来
    ——那句话完全指不到真正的原因。这里先探一下，把话说清楚。

    任何 HTTP 响应都算可达，包括 401/404：要验的是连通性，不是某个端点存在。
    """
    url = f"{str(api_base or '').rstrip('/')}/"
    try:
        urllib.request.urlopen(url, timeout=timeout)
    except urllib.error.HTTPError:
        return ""
    except Exception as exc:  # URLError / timeout / DNS 等
        return f"{type(exc).__name__}: {exc}"
    return ""


def assert_homepage(summary, click, events, responses, min_books):
    errors = []
    runtime = summary.get("runtimeConfig") or {}
    if not summary.get("appShell"):
        errors.append("app shell is missing")
    if not summary.get("addPdf"):
        errors.append("add PDF button is missing")
    if not runtime.get("apiBase"):
        errors.append("runtimeConfig.apiBase is empty")
    if not runtime.get("xApiKey"):
        errors.append("runtimeConfig.xApiKey is empty")
    if int(summary.get("listChildren") or 0) < min_books:
        errors.append(f"recent jobs list has fewer than {min_books} item(s)")
    # 这两个键由 evaluate_inline_error 在对话框打开后写入（见该函数注释）。
    inline_error = str(summary.get("inlineErrorText") or "").strip()
    inline_error_class = str(summary.get("inlineErrorClass") or "")
    if inline_error and inline_error != "-" and "hidden" not in inline_error_class:
        errors.append(f"inline error is visible: {inline_error}")
    if click.get("open") != "1":
        errors.append("add PDF did not open translation workflow dialog")
    exceptions = [event for event in events if event and event[0] == "exception"]
    if exceptions:
        errors.append(f"runtime exceptions: {exceptions[:3]}")
    library_responses = [item for item in responses if is_library_list_url(item[1])]
    if not library_responses:
        errors.append(
            "no library list response observed "
            f"(expected one of {', '.join(LIBRARY_LIST_URL_MARKERS)})"
        )
    elif not any(int(item[0]) == 200 for item in library_responses):
        errors.append(f"library list did not return 200: {library_responses[:3]}")
    if errors:
        raise AssertionError("; ".join(errors))


def main():
    args = parse_args()
    binary = chromium_binary(args.chromium)
    profile = tempfile.mkdtemp(prefix="retainpdf-homepage-smoke-")
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
        # 超时要大于页内轮询上限（click_add_pdf 最多等 5 秒挂载），否则
        # awaitPromise 的 Runtime.evaluate 会先把 socket 等超时。
        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=30)
        send, drain, events, responses = make_cdp(ws)
        send("Runtime.enable")
        send("Page.enable")
        send("Network.enable")
        send("Page.navigate", {"url": args.url})
        drain(args.wait_seconds)
        summary = evaluate_homepage(send)
        # apiBase 不通的话，后面每一条数据类断言都会以看不出原因的方式失败。
        unreachable = probe_api_base((summary.get("runtimeConfig") or {}).get("apiBase"))
        click = click_add_pdf(send)
        summary.update(evaluate_inline_error(send))
        report = {
            "summary": summary,
            "click": click,
            "events": events,
            "responses": responses,
        }
        if unreachable:
            api_base = (summary.get("runtimeConfig") or {}).get("apiBase")
            raise AssertionError(
                f"apiBase 不可达 ({api_base}) —— {unreachable}；"
                "页面从 127.0.0.1 加载，但 API 走的是 runtime-config 里的 apiBase"
            )
        assert_homepage(summary, click, events, responses, args.min_books)
        if args.json:
            print(json.dumps(report, ensure_ascii=False, indent=2))
        else:
            print(f"homepage smoke ok: {summary.get('listChildren')} books, url={summary.get('href')}")
        return 0
    except Exception as exc:
        if "report" in locals():
            print(json.dumps(report, ensure_ascii=False, indent=2), file=sys.stderr)
        print(f"homepage smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
