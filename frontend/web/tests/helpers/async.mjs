/** 测试里等异步结果的三件套：wait / waitFor / deferred。
 *
 * 原来三十多个测试文件各自手写一份，只在轮询间隔（10/15/20ms）、要不要把谓词的值
 * 返回出去、超时文案用全角还是半角冒号上有出入 —— 没有一处是有意为之的差别。
 * 收拢到这里之后，各文件只在确实需要不同行为时（比如超时时附带额外诊断）再包一层。
 */
import assert from "node:assert/strict";

/** 让出 ms 毫秒（默认 0，即下一轮宏任务）。 */
export function wait(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 轮询直到 predicate() 为真值，并把那个值返回；超时则以 `等待超时：<描述>` 失败。
 *
 * description 可以是函数 —— 只在超时时才求值，用来把当时的真实状态写进失败信息
 * （否则「等待超时」看不出卡在了哪一步）。
 */
export async function waitFor(predicate, description, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await wait(10);
  }
  assert.fail(`等待超时：${typeof description === "function" ? description() : description}`);
}

/** 一个可以从外部 resolve / reject 的 Promise，用来精确控制「请求何时返回」。 */
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
