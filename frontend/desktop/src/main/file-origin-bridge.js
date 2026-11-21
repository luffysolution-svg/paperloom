// 窗口退回 file:// 加载时（本地网关没起来）给发往本机 API 的请求补上回环来源。
//
// Electron 44 实测（file:// 页面 → http://127.0.0.1）：
//   - fetch 不带 Origin、也不发预检，单机后端按「没有 Origin」放行，不用管；
//   - WebSocket 握手带 Origin: file://。单机后端在终端握手时只认回环来源，不放行 file://
//     ——放行它等于让任何在浏览器里打开的本地 HTML 文件都能带着公开的默认 key 连本机终端。
// 所以只对这个窗口、只对 apiBase 所在主机的请求，把 file:// 或 "null" 的 Origin 改成
// http://127.0.0.1。网关正常时页面和 /api 同源，用不到这里。

const LOOPBACK_ORIGIN = "http://127.0.0.1";
const FILE_ORIGINS = new Set(["file://", "null"]);

function headerKey(headers, name) {
  const lowered = name.toLowerCase();
  return Object.keys(headers || {}).find((key) => key.toLowerCase() === lowered);
}

/** 只改来自 file:// 页面的 Origin；其余原样返回。 */
function rewriteRequestOrigin(requestHeaders) {
  const key = headerKey(requestHeaders, "Origin");
  if (!key || !FILE_ORIGINS.has(requestHeaders[key])) return requestHeaders;
  return { ...requestHeaders, [key]: LOOPBACK_ORIGIN };
}

/** apiBase 所在主机的 webRequest URL 过滤（http 请求和 WebSocket 握手）。
 * 匹配模式里不写端口就匹配所有端口：后端重启换了端口，桥照样生效。 */
function apiUrlPatterns(apiBase) {
  const url = new URL(apiBase);
  const ws = url.protocol === "https:" ? "wss:" : "ws:";
  return [`${url.protocol}//${url.hostname}/*`, `${ws}//${url.hostname}/*`];
}

/**
 * 给一个窗口装上来源桥。session 级的 webRequest 每种事件只能挂一个监听，
 * 所以按 webContentsId 只处理这个窗口的请求，其余原样放行。返回卸载函数。
 */
function installFileOriginBridge(webContents, apiBase) {
  if (!webContents || !apiBase) return () => {};
  const { webRequest } = webContents.session;
  const filter = { urls: apiUrlPatterns(apiBase) };
  webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    callback({
      requestHeaders: details.webContentsId === webContents.id
        ? rewriteRequestOrigin(details.requestHeaders)
        : details.requestHeaders,
    });
  });
  return () => webRequest.onBeforeSendHeaders(filter, null);
}

module.exports = {
  LOOPBACK_ORIGIN,
  apiUrlPatterns,
  installFileOriginBridge,
  rewriteRequestOrigin,
};
