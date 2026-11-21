// 状态详情 · 视图模型：任务状态 / 事件视图模型只认主 lane 的 display_stage 与结构化进度，
// 耗时辅助函数只吃显式输入。
// 从原 status-detail.test.mjs（1500+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import { normalizedStageEventRecord } from "@retainpdf/domain/job-status";
import { buildEventsPresentation } from "../../src/features/job-detail/domain/snapshot/events.js";
import { resolveStageHistoryDuration } from "@retainpdf/domain/job";
import { resolveLiveDurations } from "@retainpdf/domain/job";
import { buildStatusCardSnapshot } from "@retainpdf/domain/job-status";
import { buildJobStatusViewModel } from "@retainpdf/domain/job-status";
import {
  buildJobDetailEventViewModel,
  buildJobDetailStatusViewModel,
} from "../../src/features/job-detail/domain/page/status-view-model.js";

global.window ||= {};
global.window.location ||= {
  protocol: "http:",
  origin: "http://localhost",
  pathname: "/",
};

test("job detail status view model follows main lane display stage", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: { unit: "batch", current: 28, total: 5216 },
    },
    {
      items: [
        {
          seq: 41,
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          lane: "background",
          progress: { unit: "step", current: 1, total: 3 },
          message: "render payload prewarm",
        },
        {
          seq: 42,
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          lane: "main",
          progress: { unit: "batch", current: 29, total: 5216 },
        },
      ],
    },
  );

  assert.equal(snapshot.stageKey, "translate");
  assert.equal(snapshot.progressText, "第 29/5216 批");
  assert.match(snapshot.runtimeCurrentStage, /翻译|第 29\/5216 批/);
});

test("job detail status view model does not expose legacy stage detail fallback", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail-legacy-fallback",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      current_stage: "render_preprocess",
      stage_detail: "render payload prewarm: ready",
      progress: { unit: "batch", current: 30, total: 100 },
    },
    { items: [] },
  );

  assert.equal(snapshot.stageKey, "translate");
  assert.equal(/render|prewarm|渲染/.test(snapshot.runtimeCurrentStage), false);
});

test("job detail status view model does not use legacy user_stage as runtime stage", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail-legacy-user-stage",
      status: "running",
      user_stage: "translation",
      stage: "render_preprocess",
      current_stage: "render_preprocess",
      progress: { unit: "batch", current: 30, total: 100 },
    },
    { items: [] },
  );

  assert.equal(snapshot.stageKey, "running");
  assert.equal(/translation|翻译|render|渲染/.test(snapshot.runtimeCurrentStage), false);
});

test("job detail event view model uses structured progress fields", () => {
  const viewModel = buildJobDetailEventViewModel({
    seq: 99,
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    lane: "main",
    event_type: "progress",
    progress: { unit: "batch", current: 4000, total: 5216 },
    stage_detail: "book: completed batch 1/2",
    message: "book: completed batch 1/2",
  });

  assert.equal(viewModel.displayStage, "translation");
  assert.equal(viewModel.substage, "translation_batches");
  assert.equal(viewModel.lane, "main");
  assert.equal(viewModel.progressText, "第 4000/5216 批");
  assert.equal(viewModel.progressCurrent, 4000);
  assert.equal(viewModel.progressTotal, 5216);
  assert.equal(viewModel.progressUnit, "batch");
});

test("job detail event view model does not promote canonical events without display_stage", () => {
  const viewModel = buildJobDetailEventViewModel({
    seq: 100,
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    event_type: "progress",
    progress: { unit: "step", current: 1, total: 3 },
  });

  assert.equal(viewModel.displayStage, "");
  assert.equal(viewModel.stageText, "进度 1/3");
  assert.equal(viewModel.lane, "main");
  assert.equal(viewModel.progressCurrent, 1);
  assert.equal(viewModel.progressTotal, 3);
});

test("normalized event display record prefers structured progress over provider text", () => {
  const record = normalizedStageEventRecord({
    seq: 100,
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    lane: "main",
    event_type: "progress",
    progress: { unit: "batch", current: 4000, total: 5216 },
    stage_detail: "book: completed batch 1/2",
    message: "book: completed batch 1/2",
  });

  assert.equal(record.displayStage, "translation");
  assert.equal(record.stageText, "第 4000/5216 批");
  assert.equal(record.progressText, "第 4000/5216 批");
  assert.equal(record.progress.current, 4000);
  assert.equal(record.progress.total, 5216);
});

test("status detail event presentation uses normalized progress records", () => {
  const presentation = buildEventsPresentation({
    items: [
      {
        seq: 101,
        display_stage: "translation",
        stage: "translating",
        substage: "translation_batches",
        lane: "main",
        event_type: "progress",
        progress: { unit: "batch", current: 4001, total: 5216 },
        stage_detail: "book: completed batch 1/2",
        message: "book: completed batch 1/2",
      },
    ],
  });

  assert.equal(presentation.count, 1);
  assert.match(presentation.markup, /translation/);
  assert.match(presentation.markup, /translation_batches/);
  assert.match(presentation.markup, /第 4001\/5216 批/);
});

test("job status view model preserves status card snapshot fields", () => {
  const job = {
    job_id: "job-status-model",
    status: "succeeded",
    display_stage: "done",
    output_pdf_ready: true,
    progress_percent: 100,
    actions: {
      download_pdf: {
        enabled: true,
        url: "/api/v1/jobs/job-status-model/pdf",
      },
    },
  };
  const events = { items: [] };
  const stagePresentation = {
    label: "完成",
    detail: "翻译 PDF 已生成",
    stageKey: "done",
    visualStageKey: "done",
    progressCurrent: 100,
    progressTotal: 100,
    progressPercent: 100,
    progressText: "已完成",
    progressUnit: "percent",
    progressIndeterminate: false,
    substageKey: "done",
    stageProgressByKey: {
      done: {
        current: 100,
        total: 100,
        percent: 100,
        unit: "percent",
      },
    },
  };
  const input = {
    state: createLegacyStateFixture(),
    job,
    jobId: job.job_id,
    stagePresentation,
    events,
    manifest: null,
    stageActions: null,
    publicErrorText: "-",
  };

  const viewModel = buildJobStatusViewModel(input);
  const snapshot = buildStatusCardSnapshot(input);

  assert.deepEqual(snapshot, viewModel);
  assert.equal(viewModel.jobId, "job-status-model");
  assert.equal(viewModel.stageKey, "done");
  assert.equal(viewModel.progressText, "已完成");
  assert.equal(viewModel.errorText, "");
  assert.equal(viewModel.pdfReady, true);
});

test("job status view model carries manifest actions and retry actions", () => {
  const job = {
    job_id: "job-status-actions",
    status: "succeeded",
    display_stage: "done",
    output_pdf_ready: true,
    artifacts: {},
  };
  const manifest = {
    items: [
      {
        artifact_key: "source_pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/artifacts/source_pdf",
      },
      {
        artifact_key: "markdown_bundle_zip",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/artifacts/markdown_bundle_zip",
      },
      {
        artifact_key: "pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/pdf",
      },
    ],
  };
  const viewModel = buildJobStatusViewModel({
    state: createLegacyStateFixture(),
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest,
    stageActions: {
      stages: [
        {
          stage: "translation",
          label: "重新翻译",
          can_retry: true,
        },
        {
          stage: "render",
          can_retry: false,
          disabled_reason: "等待翻译完成",
        },
      ],
    },
    publicErrorText: "",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.readerReady, true);
  assert.equal(viewModel.sourcePdfReady, true);
  assert.match(viewModel.sourcePdfUrl, /source_pdf/);
  assert.equal(viewModel.markdownBundleReady, true);
  assert.match(viewModel.markdownBundleUrl, /include_job_dir=true/);
  assert.equal(viewModel.stageRetryActions.translate.canRetry, true);
  assert.equal(viewModel.stageRetryActions.translate.stage, "translation");
  assert.equal(viewModel.stageRetryActions.render.canRetry, false);
  assert.equal(viewModel.stageRetryActions.render.disabledReason, "等待翻译完成");
});

test("live duration helpers use explicit timing inputs instead of runtime globals", () => {
  const job = {
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:03:00Z",
    stage_history: [
      {
        stage: "rendering",
        enter_at: "2026-01-01T00:02:00Z",
      },
    ],
  };

  const durations = resolveLiveDurations(job, {
    finishedAtFallback: "2026-01-01T00:05:00Z",
  });

  assert.equal(durations.totalElapsedText, "5分 0秒");
  assert.equal(
    resolveStageHistoryDuration(job.stage_history[0], job, {
      finishedAtFallback: "2026-01-01T00:05:00Z",
    }),
    180000,
  );
});

test("live duration helpers keep ambiguous succeeded payloads running", () => {
  const job = {
    status: "succeeded",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:03:00Z",
    stage_started_at: "2026-01-01T00:02:00Z",
    stage_history: [
      {
        stage: "translating",
        enter_at: "2026-01-01T00:02:00Z",
      },
    ],
  };

  const durations = resolveLiveDurations(job, {
    finishedAtFallback: "2026-01-01T00:05:00Z",
    now: "2026-01-01T00:06:00Z",
  });

  assert.equal(durations.stageElapsedText, "4分 0秒");
  assert.equal(durations.totalElapsedText, "6分 0秒");
  assert.equal(
    resolveStageHistoryDuration(job.stage_history[0], job, {
      finishedAtFallback: "2026-01-01T00:05:00Z",
      now: "2026-01-01T00:06:00Z",
    }),
    240000,
  );
});

test("job status view model accepts explicit finished-at fallback", () => {
  const job = {
    job_id: "job-status-duration",
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:02:00Z",
  };
  const viewModel = buildJobStatusViewModel({
    state: createLegacyStateFixture(),
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
    finishedAtFallback: "2026-01-01T00:04:00Z",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.elapsed, "4分 0秒");
});

test("job status view model does not read runtime finished-at fallback implicitly", () => {
  const localState = createLegacyStateFixture();
  localState.currentJobFinishedAt = "2026-01-01T00:10:00Z";
  const job = {
    job_id: "job-status-explicit-duration",
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:02:00Z",
  };

  const viewModel = buildJobStatusViewModel({
    state: localState,
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.elapsed, "2分 0秒");
});
