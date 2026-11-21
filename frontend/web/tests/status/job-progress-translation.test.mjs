// 翻译阶段进度 · 聚合与推进：批次 / 子阶段进度怎么从事件与快照里汇总，事件流何时能越过
// 陈旧快照往前推。展示文案与进度环那一半在 job-progress-translation-display.test.mjs。

import test from "node:test";
import assert from "node:assert/strict";
import {
  collectStageProgressByKey,
  resolveDisplayedStagePresentation,
} from "@retainpdf/domain/job-status";
import { compositeTranslationProgressFromRecord } from "@retainpdf/domain/job-status";
import { summarizeStageProgressText } from "@retainpdf/domain/job-status";

test("english batch detail is not parsed as translation batch progress", () => {
  assert.equal(
    summarizeStageProgressText({
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      stage_detail: "book: completed batch 789/5216",
      progress_unit: "batch",
    }),
    "",
  );
});

test("translation composite progress prefers record unit before payload mirror", () => {
  const progress = compositeTranslationProgressFromRecord({
    stageKey: "translate",
    substageKey: "translation_batches",
    current: 5,
    total: 10,
    progressUnit: "batch",
    progressText: "第 5/10 批",
    payload: {
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 5,
        total: 10,
      },
      progress_unit: "step",
    },
  });

  assert.equal(progress.progressUnit, "batch");
  assert.equal(progress.sourceProgressUnit, "batch");
  assert.equal(progress.progressText, "第 5/10 批");
  assert.equal(progress.payload.progress_unit, "batch");
});

test("collectStageProgressByKey keeps translation substage progress", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-translate",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
    },
    {
      items: [
        {
          seq: 1,
          display_stage: "translation",
          stage: "continuation_review",
          substage: "continuation_review",
          progress: {
            unit: "page",
            current: 2,
            total: 10,
          },
        },
        {
          seq: 2,
          display_stage: "translation",
          stage: "page_policies",
          substage: "page_policies",
          progress: {
            unit: "page",
            current: 3,
            total: 10,
          },
        },
        {
          seq: 3,
          display_stage: "translation",
          stage: "translation_batches",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 4,
            total: 8,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.translate.current, 4);
  assert.equal(progressByKey.translate.total, 8);
  assert.equal(progressByKey.translate.progressUnit, "batch");
  assert.equal(progressByKey.translate.progressText, "第 4/8 批");
  assert.equal(progressByKey.translate.bySubstage.continuation_review.current, 2);
  assert.equal(progressByKey.translate.bySubstage.continuation_review.total, 10);
  assert.equal(progressByKey.translate.bySubstage.continuation_review.progressUnit, "page");
  assert.equal(progressByKey.translate.bySubstage.page_policies.current, 3);
  assert.equal(progressByKey.translate.bySubstage.page_policies.total, 10);
  assert.equal(progressByKey.translate.bySubstage.page_policies.progressUnit, "page");
});

test("translation main progress follows the latest main substage", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-translate-prefer-batches",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "garbled_repair",
          substage: "garbled_repair",
          progress: {
            unit: "page",
            current: 5,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.translate.current, 5);
  assert.equal(progressByKey.translate.total, 10);
  assert.equal(progressByKey.translate.progressUnit, "page");
  assert.equal(progressByKey.translate.progressText, "第 5/10 页");
  assert.equal(progressByKey.translate.substageKey, "garbled_repair");
  assert.equal(progressByKey.translate.bySubstage.translation_batches.progressText, "第 120/900 批");
  assert.equal(progressByKey.translate.bySubstage.garbled_repair.progressText, "第 5/10 页");
});

test("job snapshot progress does not replace translation event with different substage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-substage-guard",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 800,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "garbled_repair",
          substage: "garbled_repair",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 4,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "garbled_repair");
  assert.equal(presentation.progressCurrent, 4);
  assert.equal(presentation.progressTotal, 10);
  assert.equal(presentation.progressUnit, "page");
  assert.equal(presentation.progressText, "第 4/10 页");
});

test("translation detail snapshot composes progress without events", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-detail-only",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 8,
      },
    },
    null,
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "翻译批次完成");
  assert.equal(presentation.progressCurrent, 8);
  assert.equal(presentation.progressTotal, 8);
  assert.equal(presentation.progressUnit, "batch");
});

test("translation batch progress composes even when substage is missing", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-missing-substage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 8,
        total: 8,
      },
    },
    null,
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "翻译批次完成");
  assert.equal(presentation.progressCurrent, 8);
  assert.equal(presentation.progressTotal, 8);
  assert.equal(presentation.progressUnit, "batch");
});

test("current translation helper substage uses its own progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-page-policies",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "page_policies",
      substage: "page_policies",
      progress: {
        unit: "page",
        current: 3,
        total: 10,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "page_policies",
          substage: "page_policies",
          progress: {
            unit: "page",
            current: 3,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "page_policies");
  assert.equal(presentation.progressText, "第 3/10 页");
  assert.equal(presentation.progressCurrent, 3);
  assert.equal(presentation.progressTotal, 10);
  assert.equal(presentation.progressUnit, "page");
});

test("translation event stream can advance beyond stale job snapshot substage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-stale-snapshot",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 900,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 900,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "garbled_repair",
          substage: "garbled_repair",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 2,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "garbled_repair");
  assert.equal(presentation.progressText, "第 2/10 页");
  assert.equal(presentation.progressUnit, "page");
  assert.equal(presentation.progressCurrent, 2);
  assert.equal(presentation.progressTotal, 10);
});

test("translation presentation advances from batches to later repair substage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-repair-after-batches",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "garbled_repair",
      substage: "garbled_repair",
      progress: {
        unit: "page",
        current: 5,
        total: 10,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 900,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "garbled_repair",
          substage: "garbled_repair",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 5,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "garbled_repair");
  assert.equal(presentation.progressText, "第 5/10 页");
  assert.equal(presentation.progressCurrent, 5);
  assert.equal(presentation.progressTotal, 10);
});
