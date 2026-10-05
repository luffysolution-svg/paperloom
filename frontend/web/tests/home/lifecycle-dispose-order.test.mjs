// 主页 dispose 的顺序契约。
//
// dispose() 要解绑的东西横跨 4 个域，顺序不是 initialize 的机械倒放：
//
//   workflowDialogEvents → documentEvents → recentJobsEvents
//     → artifactDownloadsEvents → jobRuntimePolling
//
// 第一条是关键。workflowDialog 的 closeTranslationWorkflow 监听会触发
// recent-jobs 的 scheduleRefresh，所以必须先解绑它；否则后面每解绑一个消费者
// 都可能再被它唤起一轮。整体口径是「先解绑消费者、再停生产者」——stopPolling
// 放最后，保证轮询终止事件不会打到已失效的视图上。
//
// 为什么需要这条测试：这个顺序此前只由 create-lifecycle.ts 里一串语句的书写
// 次序维持，旁边一段注释解释。插一行、调个位置，或者像 artifactDownloads 那样
// 把 disposer 猴补到 feature 对象上再 duck-type 取回——**任何一种走样都不会有
// 东西报错**，症状是运行时少解绑一次（泄漏、或者事件打到已卸载的视图上），
// 而且只在特定时序下才显形。
//
// 顺带锁住两件事：
//   1. 缺席的 disposer（可选 feature 没挂）不得中断整条链；
//   2. 某一步抛错也不得让后面的域漏解绑，否则泄漏面积随失败位置而变。

import test from "node:test";
import assert from "node:assert/strict";

const { createLifecycle } = await import("../../src/app/home/composition/create-lifecycle.js");

function makeDocumentRef() {
  return {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
  };
}

// bridge 上被 initializeIdleView 经端口消费的那批回调，全部给空实现即可：
// 本文件只关心 dispose 的顺序，不关心 idle 视图画了什么。
function makeBridge() {
  return new Proxy({}, { get: () => () => {} });
}

function makeHarness({ failAt = "" } = {}) {
  const calls = [];
  const record = (name) => () => {
    calls.push(name);
    if (name === failAt) throw new Error(`${name} 故意失败`);
  };
  const features = {
    recentJobsFeature: { disposeFeatureEvents: record("recentJobsEvents") },
    jobRuntimeFeature: { stopPolling: record("jobRuntimePolling") },
  };
  const lifecycle = createLifecycle({
    features,
    bridge: makeBridge(),
    documentRef: makeDocumentRef(),
    disposeWorkflowDialogEvents: record("workflowDialogEvents"),
    disposeArtifactDownloadsEvents: record("artifactDownloadsEvents"),
  });
  return { lifecycle, calls, features };
}

test("dispose 按声明顺序解绑：工作流弹窗最先，停轮询最后", () => {
  const { lifecycle, calls } = makeHarness();
  lifecycle.dispose();

  assert.deepEqual(
    calls,
    [
      "workflowDialogEvents",
      "recentJobsEvents",
      "artifactDownloadsEvents",
      "jobRuntimePolling",
    ],
    "顺序错了：workflowDialog 必须最先解绑（它的关闭事件会唤起 recent-jobs 刷新），"
    + "stopPolling 必须最后（先解绑消费者、再停生产者）",
  );
});

test("工作流弹窗的解绑排在停轮询之前", () => {
  const { lifecycle, calls } = makeHarness();
  lifecycle.dispose();
  assert.ok(
    calls.indexOf("workflowDialogEvents") < calls.indexOf("jobRuntimePolling"),
    "先停轮询再解绑弹窗，会让轮询终止事件打到还挂着的监听上",
  );
});

test("缺席的 disposer 不中断整条链", () => {
  const calls = [];
  const lifecycle = createLifecycle({
    // recentJobsFeature / jobRuntimeFeature 都没挂（可选 feature 的真实情形）
    features: {},
    bridge: makeBridge(),
    documentRef: makeDocumentRef(),
    disposeWorkflowDialogEvents: () => calls.push("workflowDialogEvents"),
    disposeArtifactDownloadsEvents: () => calls.push("artifactDownloadsEvents"),
  });
  lifecycle.dispose();
  assert.deepEqual(calls, ["workflowDialogEvents", "artifactDownloadsEvents"],
    "可选 feature 缺席时，其余几步仍要照常执行");
});

test("某一步抛错，后面的域仍然被解绑", () => {
  const { lifecycle, calls } = makeHarness({ failAt: "recentJobsEvents" });
  lifecycle.dispose();
  assert.ok(
    calls.includes("artifactDownloadsEvents") && calls.includes("jobRuntimePolling"),
    `一步失败不得让后面漏解绑，否则泄漏面积随失败位置而变。实际走到：${JSON.stringify(calls)}`,
  );
});
