// 状态卡 · 渲染模型入口：status card context / snapshot / patch payload / selector，
// 以及阶段呈现对可信公开阶段的处理。
// 本文件原有 2000+ 行，已按主题拆成同目录的 status-card-*.test.mjs，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveRenderStagePresentation } from "@retainpdf/domain/job-status";
import { translationSubstageKeyForSnapshot } from "@retainpdf/domain/job-status";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import {
  buildStatusCardPatchPayload,
  buildStatusCardRenderModel,
  createStatusCardViewModelSelector,
  resolveStatusCardStagePresentation,
} from "@retainpdf/domain/job-status";
import {
  buildRuntimeStatusCardPatchPayload,
  buildRuntimeStatusCardSnapshot,
  buildRuntimeStatusCardViewModel,
  finishedAtFallbackForStatusCardRuntime,
  secondaryPayloadForStatusCardJob,
} from "@retainpdf/domain/job-status";

test("status substage badges do not infer translation substages from display text", () => {
  assert.equal(
    translationSubstageKeyForSnapshot({
      stageKey: "translate",
      label: "第 2/4 步 · 跨栏/跨页判断",
      value: "正在判断跨栏/跨页连续段",
      progressText: "第 9/34 页",
    }),
    "translation_batches",
  );
  assert.equal(
    translationSubstageKeyForSnapshot({
      stageKey: "translate",
      substageKey: "continuation_review",
      label: "第 2/4 步 · 跨栏/跨页判断",
    }),
    "continuation_review",
  );
});

test("status card context is the single render model entry point", () => {
  const state = createLegacyStateFixture();
  const job = {
    job_id: "job-status-context",
    status: "running",
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 28,
      total: 5216,
    },
  };
  const events = {
    items: [
      {
        seq: 10,
        display_stage: "translation",
        lane: "main",
        substage: "translation_batches",
        progress: {
          unit: "batch",
          current: 29,
          total: 5216,
        },
      },
    ],
  };

  const model = buildStatusCardRenderModel({
    state,
    job,
    jobId: job.job_id,
    events,
    manifest: null,
    stageActions: null,
    publicErrorText: "",
  });

  assert.equal(model.jobId, "job-status-context");
  assert.equal(model.stageKey, "translate");
  assert.equal(model.substageKey, "translation_batches");
  assert.equal(model.progressCurrent, 29);
  assert.equal(model.progressTotal, 5216);
});

test("render stage presentation respects trusted public stage while using runtime pin state", () => {
  const state = createLegacyStateFixture();
  const jobId = "job-stage-pin";
  const renderPresentation = resolveRenderStagePresentation({
    state,
    jobId,
    job: {
      job_id: jobId,
      status: "running",
      display_stage: "render",
      progress: { unit: "page", current: 2, total: 10 },
    },
    events: null,
  });

  assert.equal(renderPresentation.stageKey, "render");

  const stalePresentation = resolveRenderStagePresentation({
    state,
    jobId,
    job: {
      job_id: jobId,
      status: "running",
      display_stage: "translation",
      progress: { unit: "batch", current: 3, total: 10 },
    },
    events: null,
  });

  assert.equal(stalePresentation.stageKey, "translate");
  assert.equal(stalePresentation.visualStageKey, "translate");
});

test("render stage presentation follows the current public stage through ui boundary", () => {
  const state = createLegacyStateFixture();
  const jobId = "job-stage-pin-boundary";
  const renderPresentation = resolveRenderStagePresentation({
    state,
    jobId,
    job: {
      job_id: jobId,
      status: "running",
      display_stage: "render",
    },
    events: null,
  });
  const regressedPresentation = resolveRenderStagePresentation({
    state,
    jobId,
    job: {
      job_id: jobId,
      status: "running",
      display_stage: "translation",
    },
    events: null,
  });

  assert.equal(renderPresentation.stageKey, "render");
  assert.equal(regressedPresentation.stageKey, "translate");
  assert.equal(regressedPresentation.visualStageKey, "translate");
  assert.equal(regressedPresentation.detail, "正在翻译正文内容");
});

test("runtime status card snapshot source belongs to job-status boundary", () => {
  const matchingEvents = {
    items: [
      {
        seq: 2,
        display_stage: "translation",
        lane: "main",
        substage: "translation_batches",
        progress: {
          unit: "batch",
          current: 4,
          total: 10,
        },
      },
    ],
  };
  const secondaryResources = {
    events: {
      jobId: "job-runtime-source-model",
      payload: matchingEvents,
    },
    manifest: {
      jobId: "other-job",
      payload: { artifacts: [] },
    },
  };

  assert.equal(
    secondaryPayloadForStatusCardJob(secondaryResources, "manifest", "job-runtime-source-model"),
    null,
  );
  assert.equal(
    secondaryPayloadForStatusCardJob(secondaryResources, "events", "job-runtime-source-model"),
    matchingEvents,
  );

  let fallbackCalls = 0;
  const snapshot = buildRuntimeStatusCardSnapshot({
    currentJob: {
      jobId: "job-runtime-source-model",
      snapshot: {
        job_id: "job-runtime-source-model",
        status: "running",
        display_stage: "translation",
        substage: "translation_batches",
        progress: {
          unit: "batch",
          current: 1,
          total: 10,
        },
      },
    },
    presentationOverride: {
      publicErrorText: "",
    },
    secondaryResources,
    state: createLegacyStateFixture(),
    finishedAtFallback: () => {
      fallbackCalls += 1;
      return "2026-06-17T00:00:00Z";
    },
  });

  assert.equal(snapshot.jobId, "job-runtime-source-model");
  assert.equal(snapshot.progressCurrent, 4);
  assert.equal(snapshot.progressTotal, 10);
  assert.equal(fallbackCalls, 1);
  assert.equal(buildRuntimeStatusCardSnapshot({
    currentJob: {
      jobId: "",
      snapshot: {
        status: "running",
      },
    },
  }), null);
});

test("runtime status card source owns runtime view model and patch payload inputs", () => {
  let fallbackCalls = 0;
  const runtime = {
    state: createLegacyStateFixture(),
    finishedAtFallback: () => {
      fallbackCalls += 1;
      return "2026-06-17T00:00:00Z";
    },
  };
  const job = {
    job_id: "job-runtime-helper",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 2,
      total: 8,
    },
  };
  const events = {
    items: [
      {
        seq: 1,
        display_stage: "translation",
        lane: "main",
        substage: "translation_batches",
        progress: {
          unit: "batch",
          current: 4,
          total: 8,
        },
      },
    ],
  };

  const viewModel = buildRuntimeStatusCardViewModel({
    runtime,
    job,
    jobId: job.job_id,
    events,
    publicErrorText: "",
  });
  const payload = buildRuntimeStatusCardPatchPayload({
    runtime,
    job,
    jobId: job.job_id,
    events,
  });

  assert.equal(viewModel.jobId, "job-runtime-helper");
  assert.equal(viewModel.progressCurrent, 4);
  assert.equal(payload.statusViewModel.progressCurrent, 4);
  assert.equal(payload.stagePresentation, payload.statusViewModel.stagePresentation);
  assert.equal(fallbackCalls, 2);
  assert.equal(finishedAtFallbackForStatusCardRuntime(null), "");
});

test("status card patch payload resolves public error and exposes selected stage presentation", () => {
  const state = createLegacyStateFixture();
  const job = {
    job_id: "job-status-patch",
    status: "failed",
    failure: {
      summary: "模型返回为空",
    },
  };
  const payload = buildStatusCardPatchPayload({
    state,
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
  });

  assert.equal(payload.job, job);
  assert.equal(payload.statusViewModel.jobId, "job-status-patch");
  assert.equal(payload.stagePresentation, payload.statusViewModel.stagePresentation);
  assert.match(payload.publicErrorText, /模型返回为空|任务失败/);
});

test("status card selector memoizes stable status card inputs", () => {
  const state = createLegacyStateFixture();
  const stagePresentation = {
    label: "第 2/4 步 · 翻译",
    detail: "正在翻译正文内容",
    stageKey: "translate",
    visualStageKey: "translate",
    progressCurrent: 1,
    progressTotal: 10,
    progressPercent: 10,
    progressText: "第 1/10 批",
    progressUnit: "batch",
    progressIndeterminate: false,
    substageKey: "translation_batches",
  };
  const context = {
    state,
    job: {
      job_id: "job-status-selector",
      status: "running",
      display_stage: "translation",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 1,
        total: 10,
      },
    },
    jobId: "job-status-selector",
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
    stagePresentation,
    finishedAtFallback: "",
  };
  const selector = createStatusCardViewModelSelector();
  const first = selector(context);
  const second = selector({ ...context });
  const third = selector({
    ...context,
    stagePresentation: {
      ...stagePresentation,
      progressText: "完成",
    },
  });

  assert.equal(first, second);
  assert.notEqual(second, third);
  assert.equal(third.progressText, "完成");
});

test("status card stage presentation resolver rejects stale explicit stage", () => {
  const explicit = {
    label: "外部阶段",
    detail: "外部详情",
    stageKey: "render",
  };

  const presentation = resolveStatusCardStagePresentation({
    state: createLegacyStateFixture(),
    job: {
      display_stage: "translation",
    },
    jobId: "job-explicit-stage",
    events: { items: [] },
    stagePresentation: explicit,
  });

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.detail, "正在翻译正文内容");
});
