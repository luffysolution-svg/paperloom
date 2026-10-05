// 任务中心必须能发现「别处新建的任务」。
//
// 曾经的 bug：任务中心开着的时候，在图书馆或上传弹窗里新建一个任务，它永远不会
// 出现在任务中心里，直到用户手动点一次刷新。
//
// 机制：3s 的周期只调 refreshLive，而 refreshLive 只对**已经在 itemsRef 里**的
// job 逐个拉详情（`GET /jobs/:id`）；真正拉列表的 load 只在挂载 / 手动刷新 /
// 加载更多时跑。新建的任务进不了 itemsRef，于是也永远轮不到它。
//
// 现在每一拍额外做一次「发现」：拉第 0 页，把手上没有的挑出来。
//
// 两条不变式（写成用例，因为它们都不是"多取几条"那么简单）：
//   1. **前插**。列表是新任务在前，第 0 页里我们没有的那些必然比手上全部都新；
//      用 mergeTaskCenterJobs 追加到末尾会让顺序错位。
//   2. **分页游标要后移**。服务端列表整体右移了 addedCount 条，游标不动的话
//      「加载更多」会把已经在手上的那几条重复取回来。
//
// 不写这两条就会重犯：发现逻辑很容易被写成「合并一下就完了」，而顺序和游标
// 都不会让任何测试变红——症状是新任务排在列表底部，以及翻页时出现重复卡片。

import test from "node:test";
import assert from "node:assert/strict";

const { discoverNewTaskCenterJobs } = await import(
  "../../src/features/task-center/domain/task-center-api.js"
);

const item = (jobId, overrides = {}) => ({ job_id: jobId, status: "running", ...overrides });

test("第 0 页里手上没有的任务会被挑出来", () => {
  const previous = [item("job-old-1"), item("job-old-2")];
  const page = [item("job-new"), item("job-old-1"), item("job-old-2")];

  const { fresh, addedCount } = discoverNewTaskCenterJobs(previous, page);
  assert.deepEqual(fresh.map((job) => job.job_id), ["job-new"]);
  assert.equal(addedCount, 1, "调用方要据此把分页游标后移，否则「加载更多」会取重");
});

test("手上已有的任务不会被当成新任务重复挑出", () => {
  const previous = [item("job-1"), item("job-2")];
  const page = [item("job-1"), item("job-2")];

  const { fresh, addedCount } = discoverNewTaskCenterJobs(previous, page);
  assert.deepEqual(fresh, [], "重复挑出会让同一个任务在列表里出现两次");
  assert.equal(addedCount, 0);
});

test("没有 job_id 的行被忽略，不会污染列表", () => {
  const previous = [item("job-1")];
  const page = [{ status: "running" }, { job_id: "   " }, item("job-2")];

  const { fresh } = discoverNewTaskCenterJobs(previous, page);
  assert.deepEqual(fresh.map((job) => job.job_id), ["job-2"]);
});

test("空输入不炸", () => {
  assert.deepEqual(discoverNewTaskCenterJobs([], []), { fresh: [], addedCount: 0 });
  assert.deepEqual(discoverNewTaskCenterJobs(undefined, undefined), { fresh: [], addedCount: 0 });
});
