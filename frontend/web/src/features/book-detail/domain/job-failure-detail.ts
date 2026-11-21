/** 按需取一次完整错误（含 traceback）。
 *
 * 列表每 2 秒轮询一次，所以 traceback 不进列表（后端那边只给精简版）。用户点
 * 「展开完整错误」时才走这里打一次 job 详情端点 —— 那个端点本来就带完整的
 * `failure`、`error` 和 `log_tail`。
 *
 * `fetchJobPayload` 自带 in-flight 去重，重复点击不会打出多个请求。
 */
import { fetchJobPayload } from "@/platform/api/index.js";

type JobDetailPayload = {
  error?: unknown;
  log_tail?: unknown;
  failure?: { raw_excerpt?: unknown; last_log_line?: unknown; raw_diagnostic?: { traceback?: unknown } };
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** 把详情里几处错误信息拼成一段可读文本。
 *
 * 顺序是「最具体的在最上面」：traceback > error > raw_excerpt > log_tail。
 * 只取第一个非空的那类，不全堆上去 —— 它们之间大量重复（实测 raw_excerpt、
 * last_log_line、raw_error_excerpt 常常是同一句话）。
 */
export function pickFailureDetailText(payload: unknown): string {
  const detail = (payload as { data?: JobDetailPayload })?.data
    ?? (payload as JobDetailPayload);
  if (!detail) return "";
  const traceback = text(detail.failure?.raw_diagnostic?.traceback);
  if (traceback) return traceback;
  const error = text(detail.error);
  if (error) return error;
  const excerpt = text(detail.failure?.raw_excerpt) || text(detail.failure?.last_log_line);
  if (excerpt) return excerpt;
  const logTail = detail.log_tail;
  if (Array.isArray(logTail)) return logTail.map(text).filter(Boolean).join("\n");
  return text(logTail);
}

export async function loadJobFailureDetail(jobId: string): Promise<string> {
  return pickFailureDetailText(await fetchJobPayload(jobId));
}
