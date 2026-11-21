// 任务阶段契约 · 公开阶段：public stage / substage 只来自结构化 display_stage 与规范快照，
// 不从 user_stage、内部阶段或渲染文案里推断。
// 从原 job-stage-contract.test.mjs（2400+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveDisplayedStagePresentation } from "@retainpdf/domain/job-status";
import { publicStageKeyOf, summarizeStageKey } from "@retainpdf/domain/job-status";
import {
  publicSubstageKeyOf,
  stageSubtypeOfPayload,
} from "@retainpdf/domain/job-status";
import { publicProgressOf } from "@retainpdf/domain/job-status";
import { publicStageOf } from "@retainpdf/domain/job-status";

test("job public stage and progress can come from normalized stage snapshot", () => {
  const job = {
    status: "running",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    progress_current: 1,
    progress_total: 3,
    progress_unit: "step",
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
  };

  assert.equal(publicStageOf(job), "translate");
  assert.deepEqual(publicProgressOf(job), {
    current: 30,
    total: 100,
    percent: 30,
    unit: "batch",
  });
});

test("canonical job wrapper can still use normalized stage snapshot", () => {
  const job = {
    status: "running",
    lane: "main",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    progress_current: 1,
    progress_total: 3,
    progress_unit: "step",
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
  };

  assert.equal(publicStageOf(job), "translate");
  assert.deepEqual(publicProgressOf(job), {
    current: 30,
    total: 100,
    percent: 30,
    unit: "batch",
  });
});

test("public stage helpers ignore legacy user and internal stage fields", () => {
  const canonicalTranslation = {
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "render_prewarm",
    lane: "main",
  };
  assert.equal(publicStageKeyOf(canonicalTranslation), "translate");
  assert.equal(summarizeStageKey(canonicalTranslation), "translate");

  const canonicalLaneOnly = {
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    status: "running",
  };
  assert.equal(publicStageKeyOf(canonicalLaneOnly), "");
  assert.equal(summarizeStageKey(canonicalLaneOnly), "running");

  const oldContractPayload = {
    user_stage: "translation",
    stage: "translating",
    status: "running",
  };
  assert.equal(publicStageKeyOf(oldContractPayload), "");
  assert.equal(summarizeStageKey(oldContractPayload), "running");

  const oldContractTranslationWithRenderPrewarm = {
    user_stage: "translation",
    stage: "render_preprocess",
    substage: "render_prewarm",
    status: "running",
  };
  assert.equal(publicStageKeyOf(oldContractTranslationWithRenderPrewarm), "");
  assert.equal(summarizeStageKey(oldContractTranslationWithRenderPrewarm), "running");
});

test("public substage helpers ignore raw internal stage fallback", () => {
  const canonicalStructured = {
    lane: "main",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
  };
  assert.equal(publicSubstageKeyOf(canonicalStructured), "translation_batches");
  assert.equal(stageSubtypeOfPayload(canonicalStructured), "translation_batches");

  const canonicalUnknown = {
    lane: "main",
    display_stage: "translation",
    substage: "provider_waiting",
  };
  assert.equal(publicSubstageKeyOf(canonicalUnknown), "");
  assert.equal(stageSubtypeOfPayload(canonicalUnknown), "");

  const legacyUnknown = {
    status: "running",
    substage: "provider_waiting",
  };
  assert.equal(publicSubstageKeyOf(legacyUnknown), "provider_waiting");
  assert.equal(stageSubtypeOfPayload(legacyUnknown), "provider_waiting");

  const legacyRawStageFallback = {
    status: "running",
    stage: "render_preprocess",
  };
  assert.equal(publicSubstageKeyOf(legacyRawStageFallback), "");
  assert.equal(stageSubtypeOfPayload(legacyRawStageFallback), "");
});

test("translation render prewarm snapshot keeps translation wording", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-render-wording",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      substage: "render_prewarm",
      stage_detail: "render payload prewarm: ready indents=333 geometry=836 elapsed=1.58s",
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
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("new job detail contract uses display stage instead of internal stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-new-detail-contract",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      substage: "translation_batches",
      lane: "main",
      stage_detail: "正在翻译第 120/900 批",
      progress: {
        unit: "batch",
        current: 120,
        total: 900,
        percent: 13.333,
      },
      background_stages: [
        {
          display_stage: "render",
          stage: "rendering",
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
    null,
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.progressText, "第 120/900 批");
  assert.equal(presentation.progressUnit, "batch");
});

test("structured stage detail does not infer render substage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-structured-no-substage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      lane: "main",
      stage_detail: "render payload prewarm: ready indents=333",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    null,
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_batches");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("structured event context uses record substage instead of render detail text", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-event-record-substage",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "render_preprocess",
          substage: "translation_batches",
          stage_detail: "render payload prewarm: ready indents=333",
          payload: {
            stage: "render_preprocess",
            substage: "render_prewarm",
            progress_unit: "step",
            progress_current: 1,
            progress_total: 3,
          },
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
  assert.notEqual(presentation.visualStageKey, "render_prewarm");
  assert.equal(presentation.label, "第 2/4 步 · 翻译");
  assert.ok(!presentation.label.includes("预热"));
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressText, "第 9/20 批");
});

test("canonical payload without display_stage does not infer public stage from internal stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-canonical-no-display-stage",
      workflow: "book",
      status: "running",
      stage: "render_preprocess",
      lane: "main",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    null,
  );

  assert.equal(presentation.stageKey, "running");
  assert.equal(presentation.stageKeyTrusted, false);
  assert.equal(presentation.substageKey, "");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("fallback stage trust only comes from structured display_stage", () => {
  const structured = resolveDisplayedStagePresentation(
    {
      job_id: "job-structured-fallback-trust",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    null,
  );
  const legacy = resolveDisplayedStagePresentation(
    {
      job_id: "job-legacy-fallback-untrusted",
      workflow: "book",
      status: "running",
      user_stage: "translation",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    null,
  );

  assert.equal(structured.stageKey, "translate");
  assert.equal(structured.stageKeyTrusted, true);
  assert.equal(legacy.stageKey, "running");
  assert.equal(legacy.stageKeyTrusted, false);
});

test("event presentation ignores legacy user_stage as a public stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-event-legacy-user-stage",
      workflow: "book",
      status: "running",
      user_stage: "translation",
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
          user_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          progress_current: 9,
          progress_total: 20,
          progress_unit: "batch",
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "running");
  assert.equal(presentation.stageKeyTrusted, false);
  assert.equal(presentation.progressText, "第 8/20 批");
});
