import { c as n, i as o } from "./live-translation-CbniFg2b.js";
import { c } from "./ai-chat-ZSCffLDD.js";
function r(e) {
  return Number(e == null ? void 0 : e.status) || 0;
}
function a(e) {
  return e instanceof Error && e.message.trim() ? e.message.trim() : "操作请求失败，请重试。";
}
export {
  c as createReaderMessageId,
  n as createReaderTransportError,
  o as isReaderTransportError,
  a as readerOperationErrorMessage,
  r as readerOperationErrorStatus
};
//# sourceMappingURL=contracts.js.map
