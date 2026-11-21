// 任务阶段契约 · 进度适配：canonical 事件只读结构化 progress，遗留进度字段被隔离。
// 从原 job-stage-contract.test.mjs（2400+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { collectStageProgressByKey } from "@retainpdf/domain/job-status";
import { summarizeStageKey } from "@retainpdf/domain/job-status";
import {
  eventStageForMatch,
  normalizedStageEventRecord,
  stagePayloadFromEventRecord,
} from "@retainpdf/domain/job-status";
import { progressFromEvent } from "@retainpdf/domain/job-status";
import {
  jobProgressRecord,
} from "@retainpdf/domain/job-status";
import {
  publicProgressOf,
  structuredProgressOf,
  legacyProgressOf,
} from "@retainpdf/domain/job-status";
import { normalizeProgressRecordFromEventRecord } from "@retainpdf/domain/job-status";
import {
  hasCanonicalEventContract,
  progressUnitOf,
  structuredPublicStageOf,
} from "@retainpdf/domain/job-status";
import { publicStageOf } from "@retainpdf/domain/job-status";

test("canonical lane without display_stage does not use user or internal stage for main status", () => {
  const event = {
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress: { unit: "step", current: 1, total: 3 },
  };

  assert.equal(eventStageForMatch(event), "");
  const record = normalizedStageEventRecord(event);
  assert.equal(record.canonicalDisplayStage, "");
  assert.equal(record.publicStage, "");
  assert.equal(record.displayStage, "");
});

test("canonical lane-only payload does not summarize from legacy stage fields", () => {
  const event = {
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    status: "running",
    progress: { unit: "step", current: 1, total: 3 },
  };

  assert.equal(publicStageOf(event), "");
  assert.equal(summarizeStageKey(event), "running");
});

test("stage payloads synthesized from canonical records keep canonical markers", () => {
  const record = normalizedStageEventRecord({
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    stage_detail: "render payload prewarm: ready",
    progress: { unit: "step", current: 1, total: 3 },
  });
  const payload = stagePayloadFromEventRecord({ status: "running" }, record);

  assert.equal(payload.lane, "main");
  assert.equal(payload.display_stage, "");
  assert.equal(payload.internal_stage, "");
  assert.equal(payload.stage_detail, "");
  assert.equal(payload.substage, "render_prewarm");
  assert.equal(summarizeStageKey(payload), "running");
});

test("canonical events do not read legacy progress fields", () => {
  const progress = progressFromEvent({
    lane: "main",
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    progress_current: 28,
    progress_total: 5216,
    progress_unit: "batch",
  });

  assert.deepEqual(progress, {
    current: null,
    total: null,
  });
});

test("progress adapter prefers structured progress over legacy progress fields", () => {
  const payload = {
    progress: {
      unit: "batch",
      current: 12,
      total: 40,
      percent: 30,
    },
    progress_current: 1,
    progress_total: 2,
    progress_unit: "step",
    progress_percent: 50,
  };

  assert.deepEqual(structuredProgressOf(payload), {
    current: 12,
    total: 40,
    percent: 30,
    unit: "batch",
  });
  assert.deepEqual(legacyProgressOf(payload), {
    current: 1,
    total: 2,
    percent: 50,
    unit: "step",
  });
  assert.deepEqual(publicProgressOf(payload), {
    current: 12,
    total: 40,
    percent: 30,
    unit: "batch",
  });
});

test("progress adapter blocks legacy progress fields for canonical lane-only payloads", () => {
  assert.deepEqual(publicProgressOf({
    lane: "main",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress_current: 1,
    progress_total: 3,
    progress_unit: "step",
    progress_percent: 33,
  }), {
    current: null,
    total: null,
    percent: null,
    unit: "",
  });
});

test("progress adapter preserves legacy progress fields for non-canonical payloads", () => {
  assert.deepEqual(publicProgressOf({
    stage: "translating",
    progress_current: 28,
    progress_total: 5216,
    progress_unit: "batch",
  }), {
    current: 28,
    total: 5216,
    percent: null,
    unit: "batch",
  });
});

test("job snapshot progress record uses structured progress for canonical payloads", () => {
  const canonicalRecord = jobProgressRecord({
    display_stage: "translation",
    lane: "main",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 12,
      total: 40,
      percent: 30,
    },
    progress_current: 1,
    progress_total: 3,
    progress_unit: "step",
    progress_percent: 33,
  }, "translate");

  assert.equal(canonicalRecord.current, 12);
  assert.equal(canonicalRecord.total, 40);
  assert.equal(canonicalRecord.progressUnit, "batch");
  assert.equal(canonicalRecord.progressPercent, 30);

  const laneOnlyRecord = jobProgressRecord({
    lane: "main",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress_current: 1,
    progress_total: 3,
    progress_unit: "step",
  }, "render");

  assert.equal(laneOnlyRecord, null);
});

test("event progress uses structured progress and keeps legacy fallback isolated", () => {
  assert.deepEqual(progressFromEvent({
    lane: "main",
    display_stage: "translation",
    progress: {
      unit: "batch",
      current: 28,
      total: 5216,
    },
    progress_current: 1,
    progress_total: 3,
  }), {
    current: 28,
    total: 5216,
  });

  assert.deepEqual(progressFromEvent({
    lane: "main",
    stage: "render_preprocess",
    progress_current: 1,
    progress_total: 3,
  }), {
    current: null,
    total: null,
  });

  assert.deepEqual(progressFromEvent({
    stage: "translating",
    payload: {
      current_page: 7,
      total_pages: 20,
    },
  }), {
    current: 7,
    total: 20,
  });
});

test("progress unit helper blocks legacy unit for canonical events", () => {
  assert.equal(progressUnitOf({
    lane: "main",
    stage: "render_preprocess",
    progress_unit: "step",
    payload: {
      progress_unit: "batch",
    },
  }), "");

  assert.equal(progressUnitOf({
    lane: "main",
    display_stage: "translation",
    progress: {
      unit: "batch",
    },
    progress_unit: "step",
  }), "batch");

  assert.equal(progressUnitOf({
    stage: "translating",
    progress_unit: "batch",
  }), "batch");
});

test("stage progress aggregation keeps canonical translation separate from internal render stage", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-canonical-translation-progress",
      status: "running",
      display_stage: "translation",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "render_preprocess",
          substage: "translation_batches",
          progress: { unit: "batch", current: 4, total: 10 },
        },
      ],
    },
  );

  assert.equal(progressByKey.translate?.current, 4);
  assert.equal(progressByKey.translate?.total, 10);
  assert.equal(progressByKey.render, undefined);
});

test("progress record normalizer consumes normalized event records", () => {
  const record = normalizedStageEventRecord({
    seq: 1,
    lane: "main",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: { unit: "batch", current: 7, total: 10 },
  });

  const progressRecord = normalizeProgressRecordFromEventRecord(
    { job_id: "job-progress-record-normalizer", status: "running" },
    record,
    "translate",
  );

  assert.equal(progressRecord.stageKey, "translate");
  assert.equal(progressRecord.substageKey, "translation_batches");
  assert.equal(progressRecord.current, 7);
  assert.equal(progressRecord.total, 10);
  assert.equal(progressRecord.progressUnit, "batch");

  const pollutedRecord = normalizeProgressRecordFromEventRecord(
    { job_id: "job-progress-record-normalizer", status: "running" },
    {
      ...record,
      progressUnit: "batch",
      progress: { current: 7, total: 10 },
      item: {
        ...record.item,
        progress: { unit: "batch", current: 7, total: 10 },
        progress_unit: "step",
      },
    },
    "translate",
  );

  assert.equal(pollutedRecord.progressUnit, "batch");
});

test("normalized stage event record builds progress text from structured progress", () => {
  const record = normalizedStageEventRecord({
    seq: 1,
    lane: "main",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 28,
      total: 5216,
    },
    progress_unit: "step",
    progress_current: 1,
    progress_total: 3,
  });

  assert.equal(record.progressUnit, "batch");
  assert.equal(record.progressText, "第 28/5216 批");
});

test("canonical stage event record ignores stage detail for status text", () => {
  const record = normalizedStageEventRecord({
    seq: 1,
    lane: "main",
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    stage_detail: "翻译 PDF 已生成",
    message: "render payload prewarm: ready indents=333 geometry=836",
    progress: {
      unit: "batch",
      current: 28,
      total: 5216,
    },
  });

  assert.equal(record.progressText, "第 28/5216 批");
  assert.equal(record.stageText, "第 28/5216 批");
});

test("normalized stage event record does not use substage copy without public stage", () => {
  const record = normalizedStageEventRecord({
    seq: 1,
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress: {
      unit: "step",
      current: 1,
      total: 3,
    },
  });

  assert.equal(record.canonicalDisplayStage, "");
  assert.equal(record.progressText, "进度 1/3");
});

test("structured public stage ignores internal stage values", () => {
  const event = {
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "render_prewarm",
    lane: "background",
  };

  assert.equal(hasCanonicalEventContract(event), true);
  assert.equal(structuredPublicStageOf(event), "translate");
  assert.equal(publicStageOf(event), "translate");
});

test("legacy public stage fallback is removed from structured stage parsing", () => {
  assert.equal(structuredPublicStageOf({
    user_stage: "translation",
    stage: "translating",
  }), "");
  assert.equal(publicStageOf({
    user_stage: "translation",
    stage: "translating",
  }), "");
});
