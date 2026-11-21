// 最近任务运行时合并：以规范阶段快照为准，不让原始内部阶段 / 陈旧快照覆盖。
// 从原 recent-jobs.test.mjs 拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { recentJobStageLabel } from "../../src/features/library/domain/recent-jobs/card-presenter.js";
import {
  buildRecentJobRuntimeSnapshot,
  mergeLibraryJobItem,
} from "../../src/features/library/domain/recent-jobs/runtime-item.js";
import { adaptJobStageSnapshot } from "@retainpdf/domain/job-status";

const recentJobsStageAdapterPort = { adaptJobStageSnapshot };

test("recent jobs runtime merge accepts OCR readiness and artifact updates", () => {
  const previous = {
    job_id: "job-ocr-ready",
    document_id: "doc-ocr-ready",
    workflow: "ocr",
    status: "running",
    artifacts: {
      normalized_document: { ready: false, url: "" },
    },
  };
  const merged = mergeLibraryJobItem(previous, {
    job_id: "job-ocr-ready",
    workflow: "ocr",
    status: "succeeded",
    output_pdf_ready: false,
    markdown_ready: true,
    bundle_ready: true,
    artifacts: {
      normalized_document: {
        ready: true,
        url: "/api/v1/jobs/job-ocr-ready/normalized-document",
      },
    },
    artifacts_display: [{ key: "normalized_document", ready: true }],
  });

  assert.equal(merged.workflow, "ocr");
  assert.equal(merged.output_pdf_ready, false);
  assert.equal(merged.markdown_ready, true);
  assert.equal(merged.bundle_ready, true);
  assert.equal(merged.artifacts.normalized_document.ready, true);
  assert.equal(merged.artifacts_display[0].ready, true);
});

test("recent jobs runtime merge consumes canonical stage snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-stage",
    stage: "ocr",
    stage_detail: "旧状态",
    progress: { current: 2, total: 10, percent: 20, unit: "page" },
  }, {
    job_id: "job-recent-stage",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: { current: 28, total: 5216, unit: "batch" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.deepEqual(merged.runtime_status, {
    stageKey: "translate",
    publicStage: "translation",
    source: "display-stage",
    lane: "main",
    substage: "translation_batches",
    detail: "正在翻译正文内容",
    progress: {
      current: 28,
      total: 5216,
      percent: 28 / 5216 * 100,
      unit: "batch",
    },
  });
  assert.deepEqual(merged.progress, {
    current: 28,
    total: 5216,
    percent: 28 / 5216 * 100,
    unit: "batch",
  });

  const completed = mergeLibraryJobItem(merged, {
    job_id: "job-recent-stage",
    status: "succeeded",
    display_stage: "done",
    progress: { current: 89, total: 89, unit: "page" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });
  assert.equal(completed.stage, "done");
  assert.equal(completed.progress.percent, 100);
  assert.equal(completed.progress.current, 89);
});

test("recent jobs runtime merge does not complete succeeded active stages", () => {
  const cases = [
    ["ocr", { display_stage: "ocr", stage: "ocr_processing", expectedStage: "ocr", unit: "page" }],
    ["translation", { display_stage: "translation", stage: "translating", expectedStage: "translate", unit: "batch" }],
    ["render", { display_stage: "render", stage: "rendering", expectedStage: "render", unit: "page" }],
  ];

  for (const [name, payload] of cases) {
    const merged = mergeLibraryJobItem({
      job_id: `job-${name}-subtask-card`,
      status: "queued",
      stage: payload.expectedStage,
      display_stage: payload.expectedStage === "translate" ? "translation" : payload.expectedStage,
      progress: { current: 0, total: 8, percent: 0, unit: payload.unit },
    }, {
      job_id: `job-${name}-subtask-card`,
      status: "succeeded",
      ...payload,
      substage: payload.stage,
      progress: { current: 2, total: 8, percent: 25, unit: payload.unit },
    }, { stageAdapterPort: recentJobsStageAdapterPort });

    assert.equal(merged.status, "succeeded", name);
    assert.equal(merged.stage, payload.expectedStage, name);
    assert.notEqual(merged.display_stage, "done", name);
    assert.equal(merged.progress.current, 2, name);
    assert.equal(merged.progress.total, 8, name);
    assert.equal(merged.progress.percent, 25, name);
    assert.equal(merged.runtime_status.stageKey, payload.expectedStage, name);
  }
});

test("recent jobs runtime merge does not promote canonical lane-only internal stage", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-lane-only",
    stage: "translate",
    stage_detail: "正在翻译正文内容",
    progress: { current: 20, total: 100, percent: 20, unit: "batch" },
  }, {
    job_id: "job-recent-lane-only",
    status: "running",
    lane: "background",
    stage: "render_preprocess",
    substage: "render_prewarm",
    stage_detail: "render payload prewarm: ready",
    progress: { current: 1, total: 3, unit: "step" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.lane, undefined);
  assert.equal(merged.substage, undefined);
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.equal(merged.progress.current, 20);
  assert.equal(merged.progress.total, 100);
  assert.equal(merged.progress.unit, "batch");
  assert.deepEqual(merged.runtime_status, {});
  assert.equal(merged.background_stages, undefined);
});

test("recent jobs runtime snapshot mirrors the canonical adapter", () => {
  const job = {
    job_id: "job-recent-adapter",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: { current: 28, total: 5216, unit: "batch" },
  };
  const stageSnapshot = adaptJobStageSnapshot(job);
  const recentSnapshot = buildRecentJobRuntimeSnapshot(job, {
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  assert.equal(recentSnapshot.stageKey, stageSnapshot.stageKey);
  assert.equal(recentSnapshot.detail, stageSnapshot.detail);
  assert.deepEqual(recentSnapshot.progress, stageSnapshot.progress);
});

test("recent jobs runtime snapshot prefers normalized stage snapshot", () => {
  const recentSnapshot = buildRecentJobRuntimeSnapshot({
    job_id: "job-recent-normalized-snapshot",
    status: "running",
    stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "public-stage",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: {
        current: 30,
        total: 100,
        percent: 30,
        unit: "batch",
      },
    },
  });

  assert.equal(recentSnapshot.stageKey, "translate");
  assert.equal(recentSnapshot.detail, "正在翻译正文内容");
  assert.equal(recentSnapshot.progress.current, 30);
});

test("recent jobs runtime merge does not write raw internal stage over normalized snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-normalized-merge",
    stage: "ocr",
    display_stage: "ocr",
    lane: "main",
    substage: "provider_processing",
    stage_detail: "OCR 处理中",
    progress: { current: 5, total: 100, percent: 5, unit: "page" },
  }, {
    job_id: "job-recent-normalized-merge",
    status: "running",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    progress: { current: 30, total: 100, percent: 30, unit: "batch" },
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "public-stage",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: {
        current: 30,
        total: 100,
        percent: 30,
        unit: "batch",
      },
    },
  });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.display_stage, "translation");
  assert.equal(merged.lane, "main");
  assert.equal(merged.substage, "translation_batches");
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.equal(merged.runtime_status.stageKey, "translate");
  assert.equal(merged.runtime_status.substage, "translation_batches");
});

test("recent jobs runtime merge lets display stage override stale snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-display-stage-wins",
    status: "running",
    display_stage: "ocr",
    stage: "ocr",
    progress: { current: 5, total: 100, percent: 5, unit: "page" },
  }, {
    job_id: "job-recent-display-stage-wins",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    stage_detail: "正在翻译正文内容",
    progress: { current: 30, total: 100, percent: 30, unit: "batch" },
    runtime_status: {
      stageKey: "done",
      publicStage: "done",
    },
    stage_snapshot: {
      stageKey: "render",
      publicStage: "render",
      source: "legacy-stage",
      lane: "main",
      substage: "render_prewarm",
      detail: "render payload prewarm: ready",
      progress: {
        current: 1,
        total: 3,
        percent: 33,
        unit: "step",
      },
    },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.display_stage, "translation");
  assert.equal(merged.substage, "translation_batches");
  assert.equal(merged.runtime_status.stageKey, "translate");
  assert.equal(merged.runtime_status.publicStage, "translation");
  assert.equal(recentJobStageLabel(merged), "翻译中");
});
