// 书架单卡轮询排除「当前 job」的前提，必须真的成立才排除。
//
// 曾经的 bug：打开一本正在跑的书的详情弹窗，它在书架网格上的卡片进度条就冻住了，
// 关掉弹窗也不恢复。
//
// 机制：
//   1. 详情的进度 Tab 调 attachJobProgress → startPolling，抢走全局那一个轮询插槽，
//      于是该 job 成为 currentJobId。
//   2. 书架的单卡轮询（2.5s，active-refresh）默认排除 currentJobId，理由写在它
//      自己的注释里：「详情页自有 job-runtime 轮询，避免双路 patch 打扰详情」。
//   3. 但主轮询在 silent 模式下只在 status/stage **变化**时才推书架
//      （shouldPublishLibrary），所以同一阶段内网格卡拿不到进度更新。
//   4. 关掉弹窗时没有人归还插槽——attachJobProgress 那个 effect 没有 cleanup，
//      BookDetailDialog 也没有 stopPolling——currentJobId 一直占着，排除一直生效。
//
// 也就是说第 2 步那条规则的前提（「详情页自有轮询」）只在弹窗开着时成立，
// 而代码把它当成了恒真。现在把前提写成显式信号：弹窗关掉即把卡片还给书架。
//
// 注意这里**没有**改全局轮询的所有权语义（关窗仍不停轮询）。真正释放插槽需要
// 连 currentJobStore 一起清，仓库里没有这样的轻量原语（returnJobRuntimeToHome
// 是重置一切），那是另一件事。

import test from "node:test";
import assert from "node:assert/strict";

const { recentJobsEligibleForActiveRefresh } = await import(
  "../../src/features/library/domain/recent-jobs/active-refresh.js"
);

const RUNNING_CARD = { job_id: "job-open", document_id: "doc-1", status: "running" };
const OTHER_CARD = { job_id: "job-other", document_id: "doc-2", status: "running" };

test("详情弹窗开着时，当前 job 仍被排除（不打扰详情，旧行为不变）", () => {
  const eligible = recentJobsEligibleForActiveRefresh([RUNNING_CARD, OTHER_CARD], "job-open", []);
  assert.deepEqual(
    eligible.map((item) => item.job_id),
    ["job-other"],
    "弹窗开着时当前 job 该由详情的 job-runtime 轮询负责，书架不应再单卡 patch 它",
  );
});

test("传空的当前 job（弹窗已关）时，这张卡回到书架覆盖范围", () => {
  // 接线方在弹窗关闭后传空串，等价于「此刻没有详情在持有展示权」。
  const eligible = recentJobsEligibleForActiveRefresh([RUNNING_CARD, OTHER_CARD], "", []);
  assert.deepEqual(
    eligible.map((item) => item.job_id),
    ["job-open", "job-other"],
    "关窗后仍把卡片排除在外，它的进度条就会一直冻在当前阶段",
  );
});

test("已终态的卡片始终不进入单卡轮询", () => {
  const done = { job_id: "job-done", document_id: "doc-3", status: "succeeded" };
  assert.deepEqual(
    recentJobsEligibleForActiveRefresh([done], "", []).map((item) => item.job_id),
    [],
    "终态卡片不该被反复拉取",
  );
});
