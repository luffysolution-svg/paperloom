// 任务阶段契约 · 向前推进：哪些事件能把主阶段往前推，哪些（lane-only、纯文本、诊断、终态）不能。
// 从原 job-stage-contract.test.mjs（2400+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveDisplayedStagePresentation } from "@retainpdf/domain/job-status";

test("canonical lane-only internal stage does not borrow fallback progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-lane-only-no-fallback-progress",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.stageKeyTrusted, true);
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("canonical lane-only internal stage does not drive forward stage selection", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-lane-only-forward-selection",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          progress: {
            unit: "step",
            current: 1,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("canonical lane-only nested payload does not drive forward stage selection", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-lane-only-nested-payload-forward-selection",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          payload: {
            stage: "render_preprocess",
            current_stage: "render_preprocess",
            user_stage: "render",
            substage: "render_prewarm",
            progress_current: 1,
            progress_total: 3,
            progress_unit: "step",
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("live stage forward selection prefers display stage over internal stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-live-stage-public-stage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      live_stage: {
        status: "running",
        display_stage: "translation",
        stage: "render_preprocess",
        substage: "translation_batches",
        progress: {
          unit: "batch",
          current: 9,
          total: 20,
        },
      },
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "render_preprocess",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 9,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 9/20 批");
});

test("structured text-only events do not replace structured progress event", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-text-only-event",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 8,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          event_type: "progress",
          stage_detail: "book: completed batch 999/999",
          message: "book: completed batch 999/999",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("translation internal substage progress advances beyond batch range", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-helper-stage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 20,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 20,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
          stage: "garbled_repair",
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

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "garbled_repair");
  assert.equal(presentation.progressUnit, "step");
  assert.equal(presentation.displayPercent, 50);
});

test("canonical text-only forward event does not advance the main stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-forward-text-only-event",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 12,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 12,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "diagnostic",
          stage_detail: "render payload prewarm: ready",
          message: "render payload prewarm: ready",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 12/20 批");
});

test("canonical forward diagnostic without progress does not advance the main stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-forward-diagnostic-event",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 12,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 12,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "render",
          stage: "rendering",
          substage: "render_pages",
          event_type: "diagnostic",
          stage_detail: "render page specs ready",
          message: "render page specs ready",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 12/20 批");
});

test("public stage engine does not advance OCR from later main stage events", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-ocr-no-forward-events",
      workflow: "book",
      status: "running",
      display_stage: "ocr",
      substage: "provider_processing",
      progress: {
        unit: "page",
        current: 5,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 5,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 2,
            total: 10,
          },
        },
        {
          seq: 3,
          lane: "main",
          display_stage: "render",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 2,
            total: 20,
          },
        },
        {
          seq: 4,
          lane: "main",
          display_stage: "done",
          event_type: "terminal",
          progress: {
            unit: "percent",
            current: 100,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "ocr");
  assert.equal(presentation.substageKey, "ocr_processing");
  assert.equal(presentation.progressText, "第 5/20 页");
});

test("public stage engine does not advance render to done from terminal event alone", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-render-no-forward-done",
      workflow: "book",
      status: "running",
      display_stage: "render",
      substage: "render_pages",
      progress: {
        unit: "page",
        current: 30,
        total: 100,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "render",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 30,
            total: 100,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "done",
          event_type: "terminal",
          progress: {
            unit: "percent",
            current: 100,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "render");
  assert.equal(presentation.substageKey, "render_pages");
  assert.equal(presentation.progressText, "第 30/100 页");
});

test("public stage engine keeps running payloads without public stage from event promotion", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-running-no-public-stage",
      workflow: "book",
      status: "running",
      stage: "render_preprocess",
      progress: {
        unit: "step",
        current: 1,
        total: 3,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "render",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 1,
            total: 10,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "done",
          event_type: "terminal",
          progress: {
            unit: "percent",
            current: 100,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "running");
  assert.equal(presentation.stageKeyTrusted, false);
});
