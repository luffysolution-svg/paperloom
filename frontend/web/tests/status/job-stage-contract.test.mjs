// 任务阶段契约 · 适配器：job stage contract / event adapter 跟随公开 display_stage，
// 回退展示优先用规范快照。
// 本文件原有 2400+ 行，已按主题拆成同目录的 job-stage-*.test.mjs，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveDisplayedStagePresentation } from "@retainpdf/domain/job-status";
import {
  adaptJobEventStageSnapshot,
  adaptJobStageSnapshot,
} from "@retainpdf/domain/job-status";

test("job stage contract adapter follows public display stage over internal stage", () => {
  const snapshot = adaptJobStageSnapshot({
    job_id: "job-contract-1",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "render_prewarm",
    lane: "background",
    stage_detail: "render payload prewarm: ready",
    progress: {
      unit: "step",
      current: 1,
      total: 3,
    },
  });

  assert.equal(snapshot.jobId, "job-contract-1");
  assert.equal(snapshot.stageKey, "translate");
  assert.equal(snapshot.publicStage, "translation");
  assert.equal(snapshot.substage, "render_prewarm");
  assert.equal(snapshot.detail, "translate");
  assert.equal(snapshot.lane, "background");
  assert.deepEqual(snapshot.progress, {
    current: 1,
    total: 3,
    percent: 33.33333333333333,
    unit: "step",
  });
});

test("job stage contract adapter does not infer stage from canonical lane-only payload", () => {
  const snapshot = adaptJobStageSnapshot({
    job_id: "job-contract-lane-only",
    status: "running",
    lane: "background",
    stage: "render_preprocess",
    substage: "render_prewarm",
    stage_detail: "render payload prewarm: ready",
    progress: {
      unit: "step",
      current: 1,
      total: 3,
    },
  });

  assert.equal(snapshot.jobId, "job-contract-lane-only");
  assert.equal(snapshot.stageKey, "");
  assert.equal(snapshot.publicStage, "");
  assert.equal(snapshot.lane, "background");
  assert.equal(snapshot.substage, "render_prewarm");
  assert.equal(snapshot.detail, "");
  assert.equal(snapshot.source, "canonical-empty-stage");
});

test("job stage event adapter reads canonical fields from nested payload", () => {
  const snapshot = adaptJobEventStageSnapshot({
    seq: 9,
    event_type: "progress",
    payload: {
      display_stage: "translation",
      lane: "main",
      stage: "render_preprocess",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 12,
        total: 40,
      },
    },
  });

  assert.equal(snapshot.stageKey, "translate");
  assert.equal(snapshot.publicStage, "translation");
  assert.equal(snapshot.substage, "translation_batches");
  assert.equal(snapshot.detail, "正在翻译正文内容");
  assert.equal(snapshot.lane, "main");
  assert.equal(snapshot.progress.unit, "batch");
  assert.equal(snapshot.progress.current, 12);
  assert.equal(snapshot.progress.total, 40);
});

test("main translation display stage blocks render preprocess internal stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-main-translation-render-internal",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 10,
        total: 100,
      },
    },
    {
      items: [
        {
          seq: 1,
          event_type: "progress",
          lane: "main",
          display_stage: "translation",
          stage: "render_preprocess",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 11,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(presentation.progressCurrent, 11);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "batch");
});

test("fallback presentation uses normalized stage snapshot before raw internal fields", () => {
  const presentation = resolveDisplayedStagePresentation({
    job_id: "job-fallback-normalized-snapshot",
    status: "running",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    progress: {
      current: 1,
      total: 3,
      percent: 33,
      unit: "step",
    },
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
  }, { items: [] });

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressCurrent, 30);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "batch");
  assert.equal(/render|prewarm|渲染/.test(`${presentation.label} ${presentation.detail} ${presentation.progressText}`), false);
});
