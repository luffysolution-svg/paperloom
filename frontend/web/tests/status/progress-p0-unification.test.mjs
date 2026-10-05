import test from "node:test";
import assert from "node:assert/strict";

import { buildProgressRenderModel } from "../../src/features/jobs/domain/progress-model.js";
import { mergeSnapshotWithFallback } from "../../src/features/jobs/domain/merge-snapshot-with-fallback.js";
import { mergeRuntimePatch } from "../../src/features/library/domain/recent-jobs/runtime-patch-merge.js";

const { taskProgressPercent } = await import("../../src/features/task-center/domain/model.js");

function weakSnapshot(jobId) {
  return {
    jobId,
    status: "queued",
    label: "等待中",
    value: "准备中",
    detail: "正在读取",
    stageKey: "",
    visualStageKey: "",
    displayPercent: null,
    progressPercent: NaN,
    progressCurrent: NaN,
    progressTotal: NaN,
    progressFallbackText: "",
    progressText: "",
    progressUnit: "",
    progressIndeterminate: false,
    stageProgressByKey: {},
    stageRetryActions: {},
    pdfReady: false,
    pdfUrl: "",
    cancelEnabled: false,
    job: { job_id: jobId, status: "queued" },
    summary: null,
    stagePresentation: null,
  };
}

// 1. 进度不再凭空消失：queued/validating/done/failed 显示进度区
test("P0:非三段不再整条消失，queued/validating/done/failed 均可见", () => {
  for (const stageKey of ["queued", "validating", "done", "failed"]) {
    const model = buildProgressRenderModel({ stageKey, status: stageKey === "done" ? "succeeded" : stageKey });
    assert.equal(model.visible, true, stageKey);
  }
  // 排队文案区分，不再是空串
  assert.equal(buildProgressRenderModel({ stageKey: "queued", status: "queued" }).text, "排队中");
  assert.equal(buildProgressRenderModel({ stageKey: "validating", status: "validating" }).text, "校验中");
  assert.equal(buildProgressRenderModel({ stageKey: "done", status: "succeeded" }).percent, 100);
  assert.equal(buildProgressRenderModel({ stageKey: "done", status: "succeeded" }).text, "完成");
  const failed = buildProgressRenderModel({ stageKey: "failed", status: "failed" });
  assert.equal(failed.visible, true);
  assert.equal(failed.text, "失败");
  assert.equal(Number.isNaN(failed.percent), true);
});

// 4. 三口径统一：不伪造 0、不封顶 99、用有限数
test("P0:progress-model 不伪造 0、不封顶 99", () => {
  // running 100 显示 100（原 99 封顶已删）
  assert.equal(buildProgressRenderModel({
    stageKey: "render", status: "running", current: 100, total: 100, progressUnit: "percent",
  }).percent, 100);
  assert.equal(buildProgressRenderModel({
    stageKey: "translate", status: "running", displayPercent: 100,
  }).percent, 100);
  // 非法数字不伪造 0：displayPercent "abc" 回退到无数字分支（NaN），不显示 0%
  const invalid = buildProgressRenderModel({ stageKey: "ocr", status: "running", displayPercent: "abc" });
  assert.equal(Number.isNaN(invalid.percent), true);
  assert.equal(invalid.text, "-");
  // null/""/缺失 current 不当成 0："" + 10 不应算出 0%
  const emptyCurrent = buildProgressRenderModel({
    stageKey: "ocr", status: "running", current: "", total: 10, progressUnit: "page",
  });
  assert.equal(Number.isNaN(emptyCurrent.percent), true);
});

// 3. 任务中心 0%：null/"" 不变 0
test("P0:task-center null/空缺不显示 0%", () => {
  const base = {
    job_id: "j1", display_name: "a.pdf", workflow: "translate", status: "queued",
    stage_snapshot: null, background_snapshots: [], stages: {},
    output_pdf_ready: false, markdown_ready: false, bundle_ready: false,
    created_at: "", updated_at: "", detail_path: "", detail_url: "",
  };
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { percent: null } } }), null);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { percent: "" } } }), null);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { percent: "abc" } } }), null);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { current: null, total: 10 } } }), null);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { current: "", total: 10 } } }), null);
  // 真实值保留：显式 60 优先，current/total 推导 40%，超界夹紧
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { percent: 60 } } }), 60);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { current: 2, total: 5 } } }), 40);
  assert.equal(taskProgressPercent({ ...base, stage_snapshot: { progress: { percent: 250 } } }), 100);
});

// 2. 删伪造终态：失败保留真实截断，完成才 100
test("P0:失败 60% 不归零，完成才 100", () => {
  const failed = mergeSnapshotWithFallback(weakSnapshot("job-fail"), {
    job_id: "job-fail",
    status: "failed",
    stage_snapshot: {
      display_stage: "translate",
      stage_detail: "翻译批次失败",
      progress: { current: 12, total: 20, percent: 60, unit: "batch" },
    },
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:02Z",
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.displayPercent, 60);
  assert.equal(failed.progressPercent, 60);
  assert.equal(failed.progressCurrent, 12);
  assert.equal(failed.progressTotal, 20);
  assert.notEqual(failed.progressCurrent, 0);
  assert.match(`${failed.progressText}${failed.progressFallbackText}`, /失败/);

  // percent 缺失时用 current/total 推导，不归零
  const failedDerived = mergeSnapshotWithFallback(weakSnapshot("job-fail-2"), {
    job_id: "job-fail-2",
    status: "failed",
    stage_snapshot: {
      display_stage: "ocr",
      stage_detail: "OCR 失败",
      progress: { current: 3, total: 10 },
    },
  });
  assert.equal(failedDerived.displayPercent, 30);
  assert.equal(failedDerived.progressCurrent, 3);

  const done = mergeSnapshotWithFallback(weakSnapshot("job-done"), {
    job_id: "job-done",
    status: "succeeded",
    stage_snapshot: { display_stage: "done", stage_detail: "任务完成", progress: { current: 10, total: 10 } },
    output_pdf_ready: true,
  });
  assert.equal(done.status, "succeeded");
  assert.equal(done.displayPercent, 100);
  assert.equal(done.progressPercent, 100);
  assert.equal(done.progressCurrent, 10);
  assert.equal(done.progressTotal, 10);
});

// runtime-patch 保旧收紧：null/"" 缺数不可比，不当 0 比较
test("P0:runtime-patch 缺数不按 0 比较单调性", () => {
  // next 缺 total（null）：不可比，直接落地，不保留旧帧
  const missingTotal = mergeRuntimePatch(
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 5 } },
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: null, current: 3 } },
  );
  assert.equal(missingTotal.progress.current, 3);
  // 同口径真倒退仍保留旧帧
  const regress = mergeRuntimePatch(
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 5 } },
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 3 } },
  );
  assert.equal(regress.progress.current, 5);
  // 新终态永远落地（失败 60% 不被旧运行态盖掉）
  const terminal = mergeRuntimePatch(
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 8 } },
    { job_id: "j1", status: "failed", display_stage: "translate", progress: { unit: "page", total: 10, current: 6 } },
  );
  assert.equal(terminal.status, "failed");
  assert.equal(terminal.progress.current, 6);
});
