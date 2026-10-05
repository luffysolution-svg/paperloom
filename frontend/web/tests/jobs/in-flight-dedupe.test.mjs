// 在途请求合并的契约。
//
// 背景：`GET /jobs/:id` 有四个互不知情的所有者——主任务轮询（1s）、书架活跃卡
// （2.5s，每拍最多 6 张并发）、任务中心（3s）、阅读器 session 状态（1s）——同一秒
// 里会对同一个 job 各发一次。后端**按设计**不会合并它们：`/jobs/:id` 走
// run_read_query_once，它的 single-flight key 带一个 fastrand 随机数，永不命中。
// 那不是疏忽：QueryExecution 的合并要求返回类型 Clone+Send+Sync，而 JobDetailView
// 没有 Clone；run_read_query_once 把值包进 Arc<Mutex<Option<T>>> 绕开约束，外面
// 再 take() 取走——take 是破坏性的，第二个订阅者只会拿到 None。随机 key 正是
// 用来保证不会有第二个订阅者。
//
// 所以合并放在客户端。三条不变式都写成了用例，因为它们各自都能悄悄坏掉：
//
//   1. **只合并在途，绝不缓存**。请求一落地立刻清空。这条一旦破掉，就会出现
//      「提交/取消之后立刻读到旧状态」——本轮修过的几个 bug 全是这个形状。
//   2. **失败也要清空**。否则一次网络抖动会把后续所有调用方钉死在同一个错误上。
//   3. **复用者拿克隆**。合并之前每个调用方各发一次请求、各自拿到独立对象，而
//      这四个所有者各自把载荷写进自己的 store；共享同一个引用的话，任何一方就地
//      修改都会串到另外三个。

import test from "node:test";
import assert from "node:assert/strict";

const { createInFlightDedupe } = await import(
  "../../src/platform/api/in-flight-dedupe.js"
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("同一 key 在途时，后来者复用而不再发一次", async () => {
  const dedupe = createInFlightDedupe();
  const gate = deferred();
  let calls = 0;

  const a = dedupe.run("job-1", () => { calls += 1; return gate.promise; });
  const b = dedupe.run("job-1", () => { calls += 1; return gate.promise; });
  assert.equal(calls, 1, "第二个调用方不该再发请求");

  gate.resolve({ job_id: "job-1", status: "running" });
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(ra.job_id, "job-1");
  assert.equal(rb.job_id, "job-1");
});

test("请求落地即清空——不做任何缓存", async () => {
  const dedupe = createInFlightDedupe();
  let calls = 0;
  const run = () => dedupe.run("job-1", async () => { calls += 1; return { n: calls }; });

  assert.equal((await run()).n, 1);
  assert.equal((await run()).n, 2, "落地后的下一次调用必须真的重新请求，否则就成了缓存");
  assert.equal(dedupe.size(), 0, "在飞表必须清空");
});

test("失败同样清空，不把后续调用方钉死在同一个错误上", async () => {
  const dedupe = createInFlightDedupe();
  let calls = 0;
  const run = () => dedupe.run("job-1", async () => {
    calls += 1;
    if (calls === 1) throw new Error("第一次网络抖动");
    return { ok: true };
  });

  await assert.rejects(run(), /第一次网络抖动/);
  assert.equal(dedupe.size(), 0, "失败后也要清空");
  assert.deepEqual(await run(), { ok: true }, "下一次调用必须能重试成功");
});

test("复用者拿到的是克隆，就地修改不串台", async () => {
  const dedupe = createInFlightDedupe();
  const gate = deferred();
  const a = dedupe.run("job-1", () => gate.promise);
  const b = dedupe.run("job-1", () => gate.promise);

  gate.resolve({ job_id: "job-1", stages: { translate: { percent: 10 } } });
  const [ra, rb] = await Promise.all([a, b]);

  assert.notEqual(ra, rb, "两个所有者不该拿到同一个对象引用");
  rb.stages.translate.percent = 99;
  assert.equal(
    ra.stages.translate.percent,
    10,
    "一个所有者就地改载荷，不得影响另一个（它们各自写进自己的 store）",
  );
});

test("不同 key 互不影响", async () => {
  const dedupe = createInFlightDedupe();
  let calls = 0;
  const g1 = deferred();
  const g2 = deferred();
  const a = dedupe.run("job-1", () => { calls += 1; return g1.promise; });
  const b = dedupe.run("job-2", () => { calls += 1; return g2.promise; });
  assert.equal(calls, 2, "不同 job 必须各发各的");

  g1.resolve({ id: 1 });
  g2.resolve({ id: 2 });
  assert.equal((await a).id, 1);
  assert.equal((await b).id, 2);
});

test("空 key 直接放行，不进合并表", async () => {
  const dedupe = createInFlightDedupe();
  let calls = 0;
  await Promise.all([
    dedupe.run("", async () => { calls += 1; return {}; }),
    dedupe.run("", async () => { calls += 1; return {}; }),
  ]);
  assert.equal(calls, 2);
  assert.equal(dedupe.size(), 0);
});
