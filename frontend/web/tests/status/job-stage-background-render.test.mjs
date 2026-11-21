// 任务阶段契约 · 后台渲染：render 预热 / 主渲染事件不得盖过翻译主阶段的进度与文案。
// 从原 job-stage-contract.test.mjs（2400+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import {
  collectStageProgressByKey,
  resolveDisplayedStagePresentation,
} from "@retainpdf/domain/job-status";
import { resolveJobDisplayState } from "@retainpdf/domain/job-status";
import { eventStageForMatch } from "@retainpdf/domain/job-status";

test("background render events do not advance the main status card", () => {
  const job = {
    job_id: "job-parallel",
    workflow: "book",
    status: "running",
    display_stage: "translation",
    stage: "translating",
    progress: {
      unit: "batch",
      current: 120,
      total: 900,
    },
  };
  const eventsPayload = {
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
          current: 120,
          total: 900,
        },
      },
      {
        seq: 2,
        lane: "background",
        display_stage: "render",
        stage: "render_preprocess",
        substage: "render_prewarm",
        event_type: "progress",
        progress: {
          unit: "step",
          current: 2,
          total: 3,
        },
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  const progressByKey = collectStageProgressByKey(job, eventsPayload);

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 120/900 批");
  assert.equal(progressByKey.render, undefined);
});

test("job display state separates main translation from background render prewarm", () => {
  const displayState = resolveJobDisplayState(
    {
      job_id: "job-display-state-parallel",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 120,
        total: 900,
      },
      background_stages: [
        {
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          lane: "background",
          progress: {
            unit: "step",
            current: 1,
            total: 3,
          },
        },
      ],
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
            current: 121,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "background",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          payload: {
            display_stage: "translation",
            substage: "translation_batches",
          },
          progress: {
            unit: "step",
            current: 2,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(displayState.mainStageKey, "translate");
  assert.equal(displayState.mainSubstageKey, "translation_batches");
  assert.equal(displayState.stagePresentation.progressText, "第 121/900 批");
  assert.equal(displayState.stageProgressByKey.translate.progressText, "第 121/900 批");
  assert.equal(displayState.stageProgressByKey.render, undefined);
  assert.equal(displayState.backgroundStages.length, 1);
  assert.equal(displayState.backgroundStages[0].stageKey, "render");
  assert.equal(displayState.backgroundStages[0].substageKey, "render_prewarm");
  assert.equal(displayState.backgroundStages[0].detail, "正在预热渲染资源");
  assert.equal(displayState.backgroundStages[0].progressText, "预热 2/3");
  assert.equal(displayState.backgroundStages[0].progress.current, 2);
  assert.equal(displayState.backgroundStages[0].progress.total, 3);
  assert.equal(displayState.backgroundStages[0].progress.unit, "step");
  assert.equal(displayState.backgroundStages[0].progress.percent, 2 / 3 * 100);
});

test("latest background render prewarm does not replace translation batch progress", () => {
  const job = {
    job_id: "job-parallel-batch",
    workflow: "book",
    status: "running",
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 29,
      total: 5216,
    },
  };
  const eventsPayload = {
    items: [
      {
        seq: 41,
        lane: "main",
        display_stage: "translation",
        stage: "translating",
        substage: "translation_batches",
        event_type: "progress",
        progress: {
          unit: "batch",
          current: 29,
          total: 5216,
        },
      },
      {
        seq: 42,
        lane: "background",
        display_stage: "render",
        stage: "render_preprocess",
        substage: "render_prewarm",
        event_type: "progress",
        progress: {
          unit: "step",
          current: 2,
          total: 3,
        },
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  const progressByKey = collectStageProgressByKey(job, eventsPayload);

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 29/5216 批");
  assert.equal(presentation.progressUnit, "batch");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(progressByKey.render, undefined);
});

test("same-seq background render prewarm does not replace translation batch progress", () => {
  const job = {
    job_id: "job-parallel-same-seq",
    workflow: "book",
    status: "running",
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 29,
      total: 5216,
    },
  };
  const eventsPayload = {
    items: [
      {
        seq: 42,
        lane: "main",
        display_stage: "translation",
        stage: "translating",
        substage: "translation_batches",
        event_type: "progress",
        progress: {
          unit: "batch",
          current: 30,
          total: 5216,
        },
      },
      {
        seq: 42,
        lane: "background",
        display_stage: "render",
        stage: "render_preprocess",
        substage: "render_prewarm",
        event_type: "progress",
        progress: {
          unit: "step",
          current: 2,
          total: 3,
        },
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  const progressByKey = collectStageProgressByKey(job, eventsPayload);

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 30/5216 批");
  assert.equal(presentation.progressUnit, "batch");
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(progressByKey.render, undefined);
});

test("main render prepare events do not override an explicit translation snapshot", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-parallel-main-render",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 120,
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
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "render",
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
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("main render page progress does not override an explicit translation stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-parallel-main-render-pages",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
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
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "render",
          stage: "rendering",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 20,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("render prewarm without lane does not override an explicit translation snapshot", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-parallel-missing-lane",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
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
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          display_stage: "render",
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
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("explicit translation job stage wins over render preprocess internals", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-render-preprocess-in-translation",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      substage: "render_prewarm",
      stage_detail: "render payload prewarm: ready indents=333 geometry=836",
      progress: {
        unit: "batch",
        current: 240,
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
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 240,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "background",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          message: "render payload prewarm: ready indents=333 geometry=836",
          progress: {
            unit: "step",
            current: 2,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.stageKeyTrusted, true);
  assert.equal(presentation.progressText, "第 240/900 批");
});

test("render words in message or stage detail do not override display_stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-render-message",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
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
          stage_detail: "render payload prewarm: ready indents=333 geometry=836",
          message: "render payload prewarm: ready indents=333 geometry=836",
          progress: {
            unit: "batch",
            current: 8,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("canonical event contract uses display_stage instead of internal render text", () => {
  const translationPrewarmEvent = {
    lane: "main",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "render_prewarm",
    message: "render payload prewarm: ready",
    progress: {
      unit: "batch",
      current: 8,
      total: 20,
    },
  };
  const renderPrewarmEvent = {
    lane: "background",
    display_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress: {
      unit: "step",
      current: 1,
      total: 3,
    },
  };

  assert.equal(eventStageForMatch(translationPrewarmEvent), "translate");
  assert.equal(eventStageForMatch(renderPrewarmEvent), "render");
});

test("event stage matching only uses public display stage", () => {
  assert.equal(
    eventStageForMatch({
      display_stage: "translation",
      lane: "main",
      stage: "render_preprocess",
      substage: "translation_batches",
      progress: { unit: "batch", current: 4, total: 10 },
    }),
    "translate",
  );

  assert.equal(
    eventStageForMatch({
      stage: "render_preprocess",
      progress_current: 1,
      progress_total: 3,
      progress_unit: "step",
    }),
    "",
  );
});
