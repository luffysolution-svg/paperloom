// 状态卡 · 翻译与 OCR 进度：忽略无 lane 的遗留渲染预热、翻译环用子阶段局部百分比、
// OCR 文案不回退。
// 从原 status-card.test.mjs（2000+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveDisplayedStagePresentation } from "@retainpdf/domain/job-status";
import { shouldReplaceCurrentStageProgress } from "@retainpdf/domain/job-status";
import {
  compositeRenderProgressFromEvents,
} from "@retainpdf/domain/job-status";
import { summarizeStageProgressText } from "@retainpdf/domain/job-status";
import { resolveSelectedStageContext } from "@retainpdf/domain/job-status";
import { buildProgressOptions, capRunningStagePercent } from "@retainpdf/domain/job-status";

test("status card ignores legacy render prewarm without lane while translation is running", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-legacy-prewarm-no-lane",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 120,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 10,
          display_stage: "translation",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 11,
          stage: "render_preprocess",
          substage: "render_prewarm",
          stage_detail: "render payload prewarm: ready indents=333 geometry=836",
          event_type: "progress",
          progress: {
            unit: "step",
            current: 3,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 120/900 批");
  assert.equal(presentation.progressCurrent, 120);
  assert.equal(presentation.progressTotal, 900);
  assert.equal(presentation.progressUnit, "batch");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
});

test("render progress aggregation ignores legacy prewarm while stage snapshot is translation", () => {
  const progress = compositeRenderProgressFromEvents(
    {
      job_id: "job-render-progress-legacy-prewarm",
      status: "running",
      stage_snapshot: {
        publicStage: "translation",
      },
    },
    {
      items: [
        {
          seq: 12,
          stage: "render_preprocess",
          substage: "render_prewarm",
          progress: {
            unit: "step",
            current: 3,
            total: 3,
          },
        },
      ],
    },
    {
      shouldReplaceCurrentStageProgress,
    },
  );

  assert.equal(progress, null);
});

test("status card selected translation body progress prefers substage batch data", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressCurrent: 75,
      progressTotal: 100,
      progressText: "进度 75%",
      progressUnit: "percent",
      substageKey: "translation_batches",
      stageProgressByKey: {
        translate: {
          current: 75,
          total: 100,
          progressText: "进度 75%",
          progressUnit: "percent",
          substageKey: "translation_batches",
          bySubstage: {
            translation_batches: {
              current: 28,
              total: 5216,
              progressText: "第 28/5216 批",
              progressUnit: "batch",
              substageKey: "translation_batches",
            },
          },
        },
      },
    },
    selectedStageKey: "",
  });

  assert.equal(context.selected, "translate");
  assert.equal(context.selectedProgress.substageKey, "translation_batches");
  assert.equal(context.selectedProgress.current, 28);
  assert.equal(context.selectedProgress.total, 5216);
  assert.equal(context.selectedProgress.progressText, "第 28/5216 批");
  assert.equal(context.selectedProgress.progressUnit, "batch");
});

test("status card selected translation helper progress does not fall back to batch text", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressCurrent: 2,
      progressTotal: 10,
      progressText: "第 2/10 页",
      progressUnit: "page",
      substageKey: "garbled_repair",
      stageProgressByKey: {
        translate: {
          current: 2,
          total: 10,
          progressText: "第 2/10 页",
          progressUnit: "page",
          substageKey: "garbled_repair",
          bySubstage: {
            translation_batches: {
              current: 900,
              total: 900,
              progressText: "翻译批次完成",
              progressUnit: "batch",
              substageKey: "translation_batches",
            },
            garbled_repair: {
              current: 2,
              total: 10,
              progressText: "第 2/10 页",
              progressUnit: "page",
              substageKey: "garbled_repair",
            },
          },
        },
      },
    },
    selectedStageKey: "",
  });

  const options = buildProgressOptions({
    selected: context.selected,
    selectedIsCurrent: context.selectedIsCurrent,
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressPercent: 88,
      progressFallbackText: "-",
    },
    selectedProgress: context.selectedProgress,
  });

  assert.equal(context.selected, "translate");
  assert.equal(context.selectedProgress.substageKey, "garbled_repair");
  assert.equal(context.selectedProgress.current, 2);
  assert.equal(context.selectedProgress.total, 10);
  assert.equal(context.selectedProgress.progressText, "第 2/10 页");
  assert.equal(context.selectedProgress.progressUnit, "page");
  assert.equal(options.progressText, "第 2/10 页");
});

test("status card translation ring uses local substage percent", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressCurrent: 28,
      progressTotal: 5216,
      progressText: "第 28/5216 批",
      progressUnit: "batch",
      displayPercent: 0.5368098159509203,
      substageKey: "translation_batches",
      stageProgressByKey: {
        translate: {
          current: 28,
          total: 5216,
          progressText: "第 28/5216 批",
          progressUnit: "batch",
          displayPercent: 0.5368098159509203,
          substageKey: "translation_batches",
          bySubstage: {
            translation_batches: {
              current: 28,
              total: 5216,
              progressText: "第 28/5216 批",
              progressUnit: "batch",
              displayPercent: 0.5368098159509203,
              substageKey: "translation_batches",
            },
          },
        },
      },
    },
    selectedStageKey: "",
  });
  const options = buildProgressOptions({
    selected: context.selected,
    selectedIsCurrent: context.selectedIsCurrent,
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressPercent: 75,
      progressFallbackText: "-",
    },
    selectedProgress: context.selectedProgress,
  });

  assert.equal(context.selectedProgress.progressText, "第 28/5216 批");
  assert.equal(context.selectedProgress.progressUnit, "batch");
  assert.equal(Math.round(context.selectedProgress.displayPercent * 100) / 100, 0.54);
  assert.equal(Math.round(options.displayPercent * 100) / 100, 0.54);
});

test("running stage percent is capped before terminal completion", () => {
  assert.equal(capRunningStagePercent(100, "translate", "running"), 99);
  assert.equal(capRunningStagePercent(100, "render", "running"), 99);
  assert.equal(capRunningStagePercent(100, "done", "succeeded"), 100);
});

test("structured progress does not parse numbers from stage detail", () => {
  assert.equal(
    summarizeStageProgressText({
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      stage_detail: "book: completed batch 789/5216",
      progress: {
        unit: "batch",
        current: null,
        total: null,
      },
    }),
    "",
  );
});

test("ocr processing display stage does not regress to upload wording", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-ocr-processing",
      workflow: "book",
      status: "running",
      display_stage: "ocr",
      stage: "ocr_upload",
      substage: "provider_processing",
      stage_detail: "上传完成，等待 OCR 解析",
      progress: {
        unit: "page",
        current: 12,
        total: 34,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 12,
            total: 34,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "ocr");
  assert.equal(presentation.detail, "正在执行云端 OCR");
  assert.equal(presentation.substageKey, "ocr_processing");
  assert.equal(presentation.progressText, "第 12/34 页");
  assert.equal(presentation.progressCurrent, 12);
  assert.equal(presentation.progressTotal, 34);
  assert.equal(presentation.progressUnit, "page");
  assert.equal(Math.round(presentation.displayPercent * 100) / 100, 39.71);
  assert.equal(presentation.visualStageKey, "ocr_processing");
});

test("ocr normalizing event advances beyond provider page progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-ocr-normalizing-after-pages",
      workflow: "book",
      status: "running",
      display_stage: "ocr",
      stage: "ocr_processing",
      substage: "provider_processing",
      progress: {
        unit: "page",
        current: 34,
        total: 34,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 34,
            total: 34,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "ocr",
          stage: "normalizing",
          substage: "normalizing",
          event_type: "progress",
          progress: {
            unit: "step",
            current: 1,
            total: 2,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "ocr");
  assert.equal(presentation.detail, "正在整理 OCR 结果");
  assert.equal(presentation.substageKey, "normalizing");
  assert.equal(presentation.progressText, "进度 1/2");
  assert.equal(presentation.progressCurrent, 1);
  assert.equal(presentation.progressTotal, 2);
  assert.equal(presentation.progressUnit, "step");
  assert.equal(presentation.displayPercent, 94.5);
  assert.equal(presentation.visualStageKey, "ocr_normalizing");
});
