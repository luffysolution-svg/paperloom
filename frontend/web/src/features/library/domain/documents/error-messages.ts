// 文档域的友好错误文案（纯函数，无副作用）。

export type ErrorLike = {
  message?: string;
  status?: number;
  errorCode?: string;
  reason?: string;
} | string | null | undefined;

// 翻译失败的友好文案:后端最常见的失败是"没配 OCR/翻译凭据"
// (如 paddle_token is required),原文对用户没意义,给一句可操作提示;其余
// 错误至少把后端消息透出来(不再静默)。
export function friendlyTranslateError(error: ErrorLike, { reusingOcr = false } = {}): string {
  const message = typeof error === "string" ? error : `${error?.message || error || ""}`;
  const errorCode = typeof error === "object" && error
    ? `${error.errorCode || error.reason || ""}`.trim()
    : "";
  const structured = `${errorCode} ${message}`;
  if (/OCR_PAGE_COVERAGE_MISMATCH/i.test(structured)) {
    return "现有 OCR 未覆盖所选页码，未自动重新识别。请先为缺失页码执行 OCR。";
  }
  if (/OCR_(?:JOB_NOT_FOUND|JOB_NOT_SUCCEEDED|ARTIFACT_MISSING|ARTIFACT_NOT_REUSABLE)/i.test(structured)) {
    return "现有 OCR 产物暂时无法复用，未自动重新识别。请重新执行 OCR 后再试。";
  }
  const credentialish = /(token|key|凭据|令牌|密钥|credential)/i.test(message);
  const missing = /(required|需要|缺|未配置|not configured|missing)/i.test(message);
  if (credentialish && missing) {
    return reusingOcr
      ? "翻译需要先在「设置」里配置翻译 API 后再试。"
      : "翻译需要先在「设置」里配置 OCR / 翻译凭据后再试。";
  }
  return message || "发起翻译失败，请稍后重试。";
}

// 删除被拒（409）有两种：还有排队或运行中的任务（后端原文是英文的 "pass force=true"，没有 reason），
// 或者删单个任务时别的任务还在用它的产物（reason = job_has_dependents，比如换字体重排出的任务）。
export const DELETE_BLOCKED_BY_ACTIVE_JOB_MESSAGE = "还有排队或运行中的任务，请先取消再删除。";
export const DELETE_BLOCKED_BY_DEPENDENTS_MESSAGE = "还有别的任务在用这个任务的产物（比如换字体重排出的版本），请先删掉那些任务再删。";

export function friendlyDocumentDeleteError(error: ErrorLike): string {
  const message = typeof error === "string" ? error : `${error?.message || error || ""}`;
  const status = typeof error === "object" && error ? error.status : undefined;
  const reason = typeof error === "object" && error ? `${error.reason || ""}`.trim() : "";
  if (reason === "job_has_dependents") {
    return DELETE_BLOCKED_BY_DEPENDENTS_MESSAGE;
  }
  if (status === 409 || message.includes("(409)")) {
    return DELETE_BLOCKED_BY_ACTIVE_JOB_MESSAGE;
  }
  return message || "删除文档失败";
}
