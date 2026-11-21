// 翻译阶段进度 · 展示：零总量修复事件、批次完成、正文文案、无计数事件、unit-only 快照
// 在状态卡上怎么显示，以及后台渲染预热不得替换翻译主 lane。
// 从原 job-progress-translation.test.mjs（970+ 行）拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import {
  collectStageProgressByKey,
  resolveDisplayedStagePresentation,
} from "@retainpdf/domain/job-status";

test("translation zero-total repair events remain visible instead of falling back to batches", () => {
  const job = {
    job_id: "job-translate-zero-total-repair",
    workflow: "book",
    status: "running",
    display_stage: "translation",
      stage: "translating",
    stage: "translating",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 56,
      total: 56,
    },
  };
  const eventsPayload = {
    items: [
      {
        seq: 67,
        lane: "main",
        display_stage: "translation",
      stage: "translating",
        stage: "translating",
        substage: "translation_batches",
        event_type: "progress",
        progress: {
          unit: "batch",
          current: 56,
          total: 56,
          percent: 100,
        },
        stage_detail: "翻译批次完成",
      },
      {
        seq: 68,
        lane: "main",
        display_stage: "translation",
      stage: "translating",
        stage: "garbled_repair",
        substage: "garbled_repair",
        event_type: "progress",
        progress: {
          unit: "page",
          current: 0,
          total: 0,
        },
        stage_detail: "乱码候选段修复已跳过",
      },
      {
        seq: 69,
        lane: "main",
        display_stage: "translation",
      stage: "translating",
        stage: "agent_repair",
        substage: "agent_repair",
        event_type: "progress",
        progress: {
          unit: "none",
          current: 0,
          total: 1,
          percent: 0,
        },
        stage_detail: "开始执行翻译结果修复",
      },
      {
        seq: 70,
        lane: "main",
        display_stage: "translation",
      stage: "translating",
        stage: "agent_repair",
        substage: "agent_repair",
        event_type: "progress",
        progress: {
          unit: "step",
          current: 0,
          total: 0,
        },
        stage_detail: "翻译结果修复完成",
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  const progressByKey = collectStageProgressByKey(job, eventsPayload);

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "agent_repair");
  assert.equal(presentation.progressText, "正在修复翻译结果");
  assert.equal(presentation.progressCurrent, 100);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
  assert.equal(progressByKey.translate.substageKey, "agent_repair");
  assert.equal(progressByKey.translate.progressText, "正在修复翻译结果");
  assert.equal(progressByKey.translate.current, 100);
  assert.equal(progressByKey.translate.bySubstage.garbled_repair.progressText, "正在修复乱码候选段");
  assert.equal(progressByKey.translate.bySubstage.agent_repair.progressText, "正在修复翻译结果");
});

test("translation batch completion keeps batch progress for the ring", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-batch-room",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 56,
        total: 56,
      },
    },
    null,
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "翻译批次完成");
  assert.equal(presentation.progressCurrent, 56);
  assert.equal(presentation.progressTotal, 56);
  assert.equal(presentation.progressUnit, "batch");
});

test("translation body copy keeps batch progress instead of stale job percent", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-body-progress",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "percent",
        current: 75,
        total: 100,
        percent: 75,
      },
      progress_percent: 75,
    },
    {
      items: [
        {
          seq: 52,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
          },
          stage_detail: "开始批量翻译",
        },
        {
          seq: 53,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 28,
            total: 5216,
            percent: 0.54,
          },
          stage_detail: "已完成第 28/5216 批翻译",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 28/5216 批");
  assert.equal(presentation.progressCurrent, 28);
  assert.equal(presentation.progressTotal, 5216);
  assert.equal(presentation.progressUnit, "batch");
  assert.equal(Math.round(presentation.displayPercent * 100) / 100, 0.54);
});

test("translation substage progress keeps the latest event by seq", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-translation-latest-substage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
    },
    {
      items: [
        {
          seq: 10,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 30,
            total: 100,
          },
        },
        {
          seq: 11,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 45,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.translate.bySubstage.translation_batches.current, 45);
  assert.equal(progressByKey.translate.bySubstage.translation_batches.total, 100);
  assert.equal(progressByKey.translate.bySubstage.translation_batches.progressText, "第 45/100 批");
  assert.equal(progressByKey.translate.bySubstage.translation_batches.displayPercent, 45);
});

test("translation helper start event with unit none does not render as batch count", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-agent-repair-start",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "agent_repair",
      substage: "agent_repair",
      progress: {
        unit: "none",
        current: 0,
        total: 1,
        percent: 0,
      },
      stage_detail: "开始执行翻译结果修复",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "agent_repair",
          substage: "agent_repair",
          event_type: "progress",
          progress: {
            unit: "none",
            current: 0,
            total: 1,
            percent: 0,
          },
          stage_detail: "开始执行翻译结果修复",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "agent_repair");
  assert.equal(presentation.progressText, "正在修复翻译结果");
  assert.equal(presentation.progressCurrent, 0);
  assert.equal(presentation.progressTotal, 1);
  assert.equal(presentation.progressUnit, "none");
});

test("canonical translation event without counts does not borrow stale job batch progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-canonical-start-no-stale-batch",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      progress: {
        unit: "batch",
        current: 28,
        total: 5216,
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
          },
          stage_detail: "开始批量翻译",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "正在翻译正文内容");
  assert.equal(presentation.progressCurrent, 0);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
});

test("translation unit-only substage snapshots still show progress", () => {
  const cases = [
    ["domain_inference", "domain_inference", "step", 0],
    ["continuation_review", "continuation_review", "page", 0],
    ["page_policies", "page_policies", "page", 0],
    ["translating", "translation_batches", "batch", 0],
    ["translating", "translation_tail_retry", "batch", 0],
    ["agent_repair", "agent_repair", "none", 0],
  ];

  for (const [stage, substage, unit, expectedCurrent] of cases) {
    const presentation = resolveDisplayedStagePresentation(
      {
        job_id: `job-${substage}`,
        workflow: "book",
        status: "running",
        display_stage: "translation",
        stage,
        substage,
        progress: { unit },
        stage_detail: `${substage} start`,
      },
      {
        items: [
          {
            seq: 1,
            lane: "main",
            display_stage: "translation",
            stage,
            substage,
            event_type: "progress",
            progress: { unit },
            stage_detail: `${substage} start`,
          },
        ],
      },
    );

    assert.equal(presentation.stageKey, "translate", substage);
    assert.equal(presentation.substageKey, substage, substage);
    assert.equal(presentation.progressCurrent, expectedCurrent, substage);
    assert.ok(Number(presentation.progressTotal) > 0, substage);
    assert.ok(["percent", unit].includes(presentation.progressUnit), substage);
    assert.notEqual(presentation.progressText, `${substage} start`, substage);
  }
});

test("public display_stage field drives translation stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-public-stage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_tail_retry",
      progress: {
        unit: "batch",
        current: 2,
        total: 7,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          substage: "translation_tail_retry",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 2,
            total: 7,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_tail_retry");
  assert.equal(presentation.progressText, "第 2/7 批");
});

test("translation percent substage event updates current substage instead of stale batch progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-percent-substage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "agent_repair",
      substage: "agent_repair",
      progress: {
        unit: "percent",
        current: 65,
        total: 100,
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
            current: 5216,
            total: 5216,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
          stage: "agent_repair",
          substage: "agent_repair",
          event_type: "progress",
          progress: {
            unit: "percent",
            current: 65,
            total: 100,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "agent_repair");
  assert.equal(presentation.progressText, "进度 65%");
  assert.equal(presentation.progressCurrent, 65);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
  assert.equal(Math.round(presentation.displayPercent * 100) / 100, 65);
});

test("background render prewarm does not replace the translation main lane", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translation-with-render-prewarm",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      stage: "translating",
      substage: "translation_batches",
      lane: "main",
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
            current: 2,
            total: 3,
          },
        },
      ],
    },
    {
      items: [
        {
          seq: 10,
          lane: "main",
          display_stage: "translation",
      stage: "translating",
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
          seq: 11,
          lane: "background",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          progress: {
            unit: "step",
            current: 3,
            total: 3,
          },
          message: "render payload prewarm: ready indents=333 geometry=836 elapsed=1.58s",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.visualStageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 121/900 批");
  assert.equal(presentation.progressCurrent, 121);
  assert.equal(presentation.progressTotal, 900);
  assert.equal(presentation.progressUnit, "batch");
});
