// 一轮问答「没能正常走到 done」时的归类：用户中止 / 真错误。
//
// 从 use-home-ask-turn.ts 的 catch 里拆出来——那边是编排（改哪条消息、要不要摘节点），
// 这里是纯判别，可以单独钉住。
//
// 拆之前这条判别写的是：
//     error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message))
// 后半截是个真 bug：服务端错误消息里只要出现 "abort" 字样就会被当成「用户点了停止」。
// 上游 provider 返回 "Request aborted by upstream"、网关返回 "connection aborted by peer"
// 这类，本该红着报错、给出重试入口的一轮，会显示成一条安安静静的「已停止生成」——
// 用户既看不到失败原因，也不知道该重试。
//
// 中止只有两个可信来源，都跟消息文本无关：
//   1. 我们自己那个 AbortController 的 signal（stop() / 卸载 / 新一轮开跑都走它）；
//   2. fetch 与流读取被中止时抛出的 `DOMException`，`name === "AbortError"`。
// 服务端在响应体里说了什么，永远不是「用户是否点了停止」的依据。

export type HomeAskTurnFailure =
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

const FALLBACK_MESSAGE = "生成回答失败，请重试。";
const NETWORK_MESSAGE = "网络连接中断，请检查网络后重试。";

/**
 * 中止异常。
 *
 * 按 `name` 判而不是 `instanceof DOMException`：中止可能从 fetch（宿主的 DOMException）
 * 抛出，也可能是我们在 `await` 之间自己补的那个 `new DOMException("Aborted", "AbortError")`，
 * 而 `DOMException` 在部分测试宿主里并不是同一个 realm 的构造器，instanceof 会漏。
 * `name === "AbortError"` 是 DOM 规范对「被中止」的唯一约定，跨 realm 也成立。
 */
function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return `${(error as { name?: unknown }).name || ""}` === "AbortError";
}

/**
 * 连接层异常：请求压根没发出去，或者流没读完就断了。
 *
 * 判别借自 Vercel AI SDK（`err instanceof TypeError && /fetch|network/i.test(err.message)`）——
 * fetch 在断网 / DNS 失败 / CORS 这几种情况下抛的是 `TypeError`，消息还是英文的
 * "Failed to fetch"、"fetch failed"，直接摆进气泡等于给用户看一句他读不懂的话。
 *
 * 只借这条判别，不借它后面那套。SDK 那边区分连接层是为了决定能不能续传；我们这边
 * SSE 是自己手写解析的，没有断点续传，断了就是断了。所以它照样进错误分支（给重试
 * 入口），只是换一句说得清的中文。
 */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch|network/i.test(`${error.message || ""}`);
}

/**
 * @param signal 这一轮自己的 AbortController 信号。它是主依据：中止是异步落定的，
 *   有时抛出来的是流读到一半的其它异常，但只要信号已经 aborted，这一轮就是被停掉的。
 */
export function classifyTurnFailure(
  error: unknown,
  signal?: AbortSignal | null,
): HomeAskTurnFailure {
  if (signal?.aborted || isAbortError(error)) return { kind: "cancelled" };
  if (isNetworkError(error)) return { kind: "error", message: NETWORK_MESSAGE };
  const message = `${(error as { message?: unknown } | null)?.message || ""}`.trim();
  return { kind: "error", message: message || FALLBACK_MESSAGE };
}
