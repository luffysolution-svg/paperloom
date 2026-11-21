// 状态卡 · 进度环：运行中封顶、只有快照时推算子阶段局部百分比、进度呈现与 DOM 取值。
// 从原 status-card.test.mjs（2000+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { resolveSelectedStageContext } from "@retainpdf/domain/job-status";
import { buildProgressOptions, buildStatusCardProgressPresentation } from "@retainpdf/domain/job-status";
// buildProgressRenderModel 随 cutover 从 components/status/job-status-card-rendering.js
// (死,已删除)迁移指向 src/features/jobs/domain/progress-model.js(蓝图判决:
// 45-164 行纯函数拷贝,归属改在新世界,断言口径不变)。
import {
  buildProgressRenderModel,
} from "../../src/features/jobs/domain/progress-model.js";

test("done stage progress options keep the ring visible at 100 percent", () => {
  const selectedProgress = {
    current: 100,
    total: 100,
    progressText: "渲染完成",
    progressUnit: "percent",
  };
  const options = buildProgressOptions({
    selected: "done",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress,
  });

  assert.equal(options.current, 100);
  assert.equal(options.total, 100);
  assert.equal(options.displayPercent, 100);
  assert.equal(options.progressText, "渲染完成");
  assert.equal(options.progressUnit, "percent");
  assert.equal(options.forceVisible, true);
});

test("running stage progress options cap terminal-looking percent before rendering", () => {
  const options = buildProgressOptions({
    selected: "translate",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 100,
      total: 100,
      displayPercent: 100,
      progressText: "正在翻译正文内容",
      progressUnit: "percent",
    },
  });

  assert.equal(options.displayPercent, 99);
  assert.equal(options.percent, 99);
  assert.equal(options.stageKey, "translate");
});

test("status card progress keeps measured batch text and explicit display percent", () => {
  const options = buildProgressOptions({
    selected: "translate",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressFallbackText: "-",
      progressPercent: 75,
    },
    selectedProgress: {
      current: 28,
      total: 5216,
      displayPercent: 75,
      progressText: "第 28/5216 批",
      progressUnit: "batch",
    },
  });
  const renderModel = buildProgressRenderModel(options);

  assert.equal(options.current, 28);
  assert.equal(options.total, 5216);
  assert.equal(options.displayPercent, 75);
  assert.equal(Number.isNaN(options.percent), true);
  assert.equal(options.progressText, "第 28/5216 批");
  assert.equal(options.progressUnit, "batch");
  assert.equal(renderModel.text, "第 28/5216 批");
  assert.equal(Math.round(renderModel.percent * 100) / 100, 75);
});

test("snapshot-only translation progress derives local substage percent for ring", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressCurrent: 28,
      progressTotal: 5216,
      progressText: "第 28/5216 批",
      progressUnit: "batch",
      substageKey: "translation_batches",
      progressFallbackText: "-",
      stageProgressByKey: {},
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
  const renderModel = buildProgressRenderModel(options);

  assert.equal(context.selectedProgress.progressUnit, "batch");
  assert.equal(Math.round(context.selectedProgress.displayPercent * 100) / 100, 0.54);
  assert.equal(Math.round(options.displayPercent * 100) / 100, 0.54);
  assert.equal(Math.round(renderModel.percent * 100) / 100, 0.54);
});

test("snapshot-only translation progress derives each substage local percent", () => {
  const cases = [
    ["translation_prepare", "step", 1, 4, 25],
    ["domain_inference", "step", 2, 4, 50],
    ["continuation_review", "page", 3, 4, 75],
    ["page_policies", "page", 1, 5, 20],
    ["translation_batches", "batch", 4, 8, 50],
    ["translation_tail_retry", "batch", 3, 6, 50],
    ["garbled_repair", "step", 1, 2, 50],
    ["agent_repair", "step", 1, 2, 50],
    ["final_untranslated_recovery", "step", 1, 2, 50],
  ];
  for (const [substageKey, progressUnit, current, total, expectedPercent] of cases) {
    const context = resolveSelectedStageContext({
      snapshot: {
        stageKey: "translate",
        status: "running",
        progressCurrent: current,
        progressTotal: total,
        progressText: `${current}/${total}`,
        progressUnit,
        substageKey,
        progressFallbackText: "-",
        stageProgressByKey: {},
      },
      selectedStageKey: "",
    });
    const options = buildProgressOptions({
      selected: context.selected,
      selectedIsCurrent: context.selectedIsCurrent,
      snapshot: {
        stageKey: "translate",
        status: "running",
        progressFallbackText: "-",
      },
      selectedProgress: context.selectedProgress,
    });

    assert.equal(context.selectedProgress.substageKey, substageKey);
    assert.equal(context.selectedProgress.displayPercent, expectedPercent);
    assert.equal(buildProgressRenderModel(options).percent, expectedPercent);
  }
});

test("snapshot-only translation progress recognizes substage from visual and payload fields", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressCurrent: 1,
      progressTotal: 2,
      progressText: "乱码修复 1/2",
      progressUnit: "step",
      substageKey: "",
      visualStageKey: "garbled_repair",
      progressFallbackText: "-",
      stageProgressByKey: {},
    },
    selectedStageKey: "",
  });

  assert.equal(context.selectedProgress.substageKey, "garbled_repair");
  assert.equal(context.selectedProgress.displayPercent, 50);
});

test("snapshot-only render progress derives composite percent for ring", () => {
  const pageContext = resolveSelectedStageContext({
    snapshot: {
      stageKey: "render",
      status: "running",
      progressCurrent: 7,
      progressTotal: 14,
      progressText: "第 7/14 页",
      progressUnit: "page",
      substageKey: "render_pages",
      progressFallbackText: "-",
      stageProgressByKey: {},
    },
    selectedStageKey: "",
  });
  const pageOptions = buildProgressOptions({
    selected: pageContext.selected,
    selectedIsCurrent: pageContext.selectedIsCurrent,
    snapshot: {
      stageKey: "render",
      status: "running",
      progressFallbackText: "-",
    },
    selectedProgress: pageContext.selectedProgress,
  });

  assert.equal(pageContext.selectedProgress.progressUnit, "percent");
  assert.equal(pageContext.selectedProgress.displayPercent, 45);
  assert.equal(buildProgressRenderModel(pageOptions).percent, 45);

  const compileContext = resolveSelectedStageContext({
    snapshot: {
      stageKey: "render",
      status: "running",
      progressCurrent: 1,
      progressTotal: 4,
      progressText: "编译 1/4",
      progressUnit: "step",
      substageKey: "render_compile",
      progressFallbackText: "-",
      stageProgressByKey: {},
    },
    selectedStageKey: "",
  });
  const compileOptions = buildProgressOptions({
    selected: compileContext.selected,
    selectedIsCurrent: compileContext.selectedIsCurrent,
    snapshot: {
      stageKey: "render",
      status: "running",
      progressFallbackText: "-",
    },
    selectedProgress: compileContext.selectedProgress,
  });

  assert.equal(compileContext.selectedProgress.displayPercent, 85);
  assert.equal(buildProgressRenderModel(compileOptions).percent, 85);
});

test("status card progress options cap running stages but not done or succeeded stages", () => {
  assert.equal(buildProgressOptions({
    selected: "translate",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "translate",
      status: "running",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 100,
      total: 100,
      displayPercent: 100,
      progressText: "翻译完成",
      progressUnit: "percent",
    },
  }).displayPercent, 99);

  assert.equal(buildProgressOptions({
    selected: "translate",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "translate",
      status: "succeeded",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 100,
      total: 100,
      displayPercent: 100,
      progressText: "翻译完成",
      progressUnit: "percent",
    },
  }).displayPercent, 100);

  assert.equal(buildProgressOptions({
    selected: "done",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 100,
      total: 100,
      displayPercent: 100,
      progressText: "渲染完成",
      progressUnit: "percent",
    },
  }).displayPercent, 100);
});

test("status card render model caps running terminal-looking fallback percent", () => {
  // P0 三口径统一为 book-detail 口径（percentFromProgress）：不封顶 99，running 100 显示 100。
  assert.equal(buildProgressRenderModel({
    stageKey: "render",
    status: "running",
    current: 100,
    total: 100,
    progressUnit: "percent",
    progressText: "正在编译 PDF",
  }).percent, 100);

  assert.equal(buildProgressRenderModel({
    stageKey: "done",
    status: "succeeded",
    current: 100,
    total: 100,
    progressUnit: "percent",
    progressText: "渲染完成",
    forceVisible: true,
  }).percent, 100);
});

test("status card progress presentation owns visibility cap and animation text", () => {
  const donePresentation = buildStatusCardProgressPresentation({
    selected: "done",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 100,
      total: 100,
      displayPercent: 100,
      progressText: "渲染完成",
      progressUnit: "percent",
    },
  });
  assert.equal(donePresentation.visible, true);
  assert.equal(donePresentation.displayPercent, 100);
  assert.equal(donePresentation.stageKey, "done");

  const runningPresentation = buildStatusCardProgressPresentation({
    selected: "render",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "render",
      status: "running",
      progressFallbackText: "-",
      progressPercent: 100,
    },
    selectedProgress: {
      current: 10,
      total: 10,
      displayPercent: 100,
      progressText: "正在生成页面内容",
      progressUnit: "percent",
      indeterminate: true,
    },
  });
  assert.equal(runningPresentation.displayPercent, 99);
  assert.equal(runningPresentation.percent, 99);
  assert.equal(runningPresentation.indeterminate, true);

  const animatedPresentation = buildStatusCardProgressPresentation({
    selected: "render",
    selectedIsCurrent: true,
    snapshot: {
      stageKey: "render",
      status: "running",
      progressFallbackText: "-",
      progressPercent: 50,
    },
    selectedProgress: {
      current: 10,
      total: 20,
      progressText: "第 10/20 页",
      progressUnit: "page",
      indeterminate: true,
    },
    displayedCurrent: 7,
  });
  assert.equal(animatedPresentation.visible, true);
  assert.equal(animatedPresentation.current, 7);
  assert.equal(animatedPresentation.progressText, "第 7/20 页");
  assert.equal(animatedPresentation.progressUnit, "");
  assert.equal(animatedPresentation.indeterminate, false);
});

test("status card progress render model owns progress DOM values", () => {
  assert.deepEqual(buildProgressRenderModel({
    stageKey: "done",
    forceVisible: false,
  }), {
    visible: false,
    percent: 0,
    text: "",
    componentText: "-",
    indeterminate: false,
    legacyIndeterminate: false,
  });

  assert.deepEqual(buildProgressRenderModel({
    stageKey: "render",
    forceVisible: true,
    displayPercent: 90,
    progressText: "正在编译 PDF",
  }), {
    visible: true,
    percent: 90,
    text: "正在编译 PDF",
    componentText: "正在编译 PDF",
    indeterminate: false,
    legacyIndeterminate: false,
  });

  assert.deepEqual(buildProgressRenderModel({
    stageKey: "ocr",
    indeterminate: true,
    progressText: "OCR 准备中",
  }), {
    visible: true,
    percent: 42,
    text: "OCR 准备中",
    componentText: "OCR 准备中",
    indeterminate: true,
    legacyIndeterminate: true,
  });

  assert.deepEqual(buildProgressRenderModel({
    stageKey: "translate",
    current: 28,
    total: 5216,
    progressText: "第 28/5216 批",
    progressUnit: "batch",
  }), {
    visible: true,
    percent: 28 / 5216 * 100,
    text: "第 28/5216 批",
    componentText: "第 28/5216 批",
    indeterminate: false,
    legacyIndeterminate: false,
  });
});
