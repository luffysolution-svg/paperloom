import test from "node:test";
import assert from "node:assert/strict";

const { translationProcessModel } = await import(
  "../../src/features/book-detail/domain/translation-process-model.js"
);
const { percentFromProgress, countFromProgress, finiteNumberOrNull } = await import(
  "../../src/features/book-detail/domain/progress-value.js"
);

test("翻译过程：失败任务保留已完成阶段并标记失败阶段", () => {
  const model = translationProcessModel({
    job_id: "job-failed",
    status: "failed",
    display_stage: "translation",
    stage_snapshot: {
      publicStage: "translation",
      stage_detail: "翻译批次失败",
      progress: { current: 3, total: 10 },
    },
  });

  assert.equal(model.currentStage, "translate");
  assert.equal(model.progress, 30);
  assert.deepEqual(
    model.steps.map(({ key, state }) => [key, state]),
    [
      ["ocr", "done"],
      ["translate", "failed"],
      ["render", "pending"],
      ["done", "pending"],
    ],
  );
});

test("翻译过程：成功任务四个阶段全部完成", () => {
  const model = translationProcessModel({
    job_id: "job-done",
    status: "succeeded",
  });

  assert.equal(model.currentStage, "done");
  assert.deepEqual(model.steps.map(({ state }) => state), ["done", "done", "done", "done"]);
});

test("翻译过程：不从非结构化错误文案猜测阶段", () => {
  const model = translationProcessModel({
    job_id: "job-unknown",
    status: "failed",
    stage_detail: "翻译步骤似乎失败",
  });

  assert.equal(model.currentStage, "");
  assert.deepEqual(model.steps.map(({ state }) => state), ["pending", "pending", "pending", "pending"]);
});

test("翻译过程：translate workflow 将 OCR 显示为已复用并直接进入翻译", () => {
  const model = translationProcessModel({
    job_id: "translate-from-ocr",
    workflow: "translate",
    status: "queued",
  });

  assert.equal(model.ocrReused, true);
  assert.equal(model.currentStage, "translate");
  assert.deepEqual(
    model.steps.map(({ key, state }) => [key, state]),
    [
      ["ocr", "done"],
      ["translate", "active"],
      ["render", "pending"],
      ["done", "pending"],
    ],
  );
});

test("翻译过程：后端 stages 是 OCR 复用任务的权威状态", () => {
  const model = translationProcessModel({
    job_id: "translate-authoritative-stages",
    workflow: "translate",
    status: "queued",
    stages: {
      ocr: { state: "reused" },
      translation: { state: "queued" },
      render: { state: "pending" },
    },
  });

  assert.equal(model.ocrReused, true);
  assert.equal(model.currentStage, "translate");
  assert.deepEqual(model.steps.map(({ state }) => state), ["done", "active", "pending", "pending"]);
});

test("进度数值：null / 空串不再当成 0%", () => {
  assert.equal(finiteNumberOrNull(null), null);
  assert.equal(finiteNumberOrNull(undefined), null);
  assert.equal(finiteNumberOrNull(""), null);
  assert.equal(finiteNumberOrNull("0"), 0);
  assert.equal(finiteNumberOrNull(0), 0);
  assert.equal(finiteNumberOrNull("abc"), null);

  // percent: null 且有 current/total -> 用 current/total 推导，而不是 0%
  assert.equal(percentFromProgress({ percent: null, current: 3, total: 10 }), 30);
  // percent 缺失且无 current/total -> null（不伪造进度）
  assert.equal(percentFromProgress({ percent: null }), null);
  assert.equal(percentFromProgress({ percent: "", current: null, total: null }), null);
  assert.equal(percentFromProgress(null), null);
  // 显式 percent 优先，并夹紧到 0..100
  assert.equal(percentFromProgress({ percent: 250, current: 1, total: 10 }), 100);
  assert.equal(percentFromProgress({ percent: -5 }), 0);
  // current/total 缺一不可
  assert.equal(percentFromProgress({ current: 3, total: 0 }), null);
  assert.equal(percentFromProgress({ current: 3 }), null);

  assert.deepEqual(countFromProgress({ current: 0, total: 0 }), null);
  assert.deepEqual(countFromProgress({ current: 2, total: 5 }), { current: 2, total: 5 });
});
