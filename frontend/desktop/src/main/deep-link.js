// paperloom:// 回跳：Obsidian 笔记里的「在 PaperLoom 中打开」→ 主窗口打开对应文档的阅读器。
// 链接格式 paperloom://open?job=<job_id>&document=<document_id>&page=<从 1 起的页码>。
const path = require("path");
const { URL, URLSearchParams } = require("url");

const PROTOCOL = "paperloom";
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/** 启动参数 / second-instance 的 argv 里找回跳链接（Windows、Linux 经命令行传入）。 */
function findDeepLink(argv = []) {
  return argv.find((arg) => typeof arg === "string" && arg.toLowerCase().startsWith(`${PROTOCOL}://`)) || "";
}

function validId(value) {
  const text = `${value || ""}`.trim();
  return ID_PATTERN.test(text) ? text : "";
}

/** 回跳链接 → reader.html 的查询串；不认识的链接返回空串。 */
function readerQueryFromDeepLink(raw) {
  let url;
  try {
    url = new URL(`${raw || ""}`.trim());
  } catch {
    return "";
  }
  const action = (url.hostname || url.pathname.replace(/^\/+/, "")).replace(/\/+$/, "").toLowerCase();
  if (url.protocol !== `${PROTOCOL}:` || action !== "open") {
    return "";
  }
  const params = new URLSearchParams();
  const job = validId(url.searchParams.get("job"));
  const documentId = validId(url.searchParams.get("document"));
  if (job) {
    params.set("job_id", job);
  } else if (documentId) {
    params.set("document_id", documentId);
  } else {
    return "";
  }
  const page = Number.parseInt(url.searchParams.get("page") || "", 10);
  if (Number.isFinite(page) && page >= 1) {
    params.set("page_idx", String(page - 1));
  }
  return params.toString();
}

/** 每次启动登记到当前用户（Windows / Linux 的安装版、便携版、开发运行都靠这里；electron-builder 的 protocols 只写进 macOS 的 Info.plist）。 */
function registerProtocolClient(app) {
  if (process.defaultApp && process.argv.length >= 2) {
    return app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
  return app.setAsDefaultProtocolClient(PROTOCOL);
}

module.exports = {
  PROTOCOL,
  findDeepLink,
  readerQueryFromDeepLink,
  registerProtocolClient,
};
