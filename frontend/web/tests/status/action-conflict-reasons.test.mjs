// 任务动作被 409 拒绝时按 error.details.reason 判断（后端 fix/actions-409-reasons），不再匹配英文原文。
import test from "node:test";
import assert from "node:assert/strict";

const { describeActionError } = await import("../../src/platform/api/domains/jobs-actions.js");
const { isAmbiguousTranslationRerunError } = await import(
  "../../src/features/job-detail/domain/dialog/resume-actions.js"
);
const { createCancelCurrentJob } = await import("../../src/features/jobs/domain/runtime/cancel-job.js");

const conflict = (reason, message = "conflict(409)") => Object.assign(new Error(`提交失败: 409 ${message}`), { status: 409, reason });

test("describeActionError：认得的 reason 给中文，认不出来照旧用后端原话", () => {
  assert.equal(describeActionError(conflict("job_active")), "任务还在跑，先取消再操作。");
  assert.equal(describeActionError(conflict("job_not_active")), "任务已经不在运行，不用取消。");
  assert.match(describeActionError(conflict("ambiguous_ocr_dispatch")), /OCR 识别请求的结果拿不准/);
  assert.equal(describeActionError(conflict("something_new", "raw text")), "提交失败: 409 raw text");
  assert.equal(describeActionError(new Error("boom")), "boom");
  assert.equal(describeActionError(null, "兜底"), "兜底");
});

test("翻译歧义只认 ambiguous_translation_request；OCR 歧义、任务在跑都不算", () => {
  const translationText = "translation request outcome is ambiguous; generic rerun is paused";
  assert.equal(isAmbiguousTranslationRerunError(conflict("ambiguous_translation_request", translationText)), true);
  assert.equal(isAmbiguousTranslationRerunError(conflict("ambiguous_translation_request", "文案改了也认")), true);
  // 有 reason 时以 reason 为准，哪怕原文里碰巧有那句英文。
  assert.equal(isAmbiguousTranslationRerunError(conflict("ambiguous_ocr_dispatch", translationText)), false);
  assert.equal(isAmbiguousTranslationRerunError(conflict("job_active")), false);
  // 后端没给 reason（旧版本）：退回看 409 和原文。
  assert.equal(isAmbiguousTranslationRerunError(new Error(`提交失败: 409 ${translationText}`)), true);
  assert.equal(isAmbiguousTranslationRerunError(new Error("提交失败: 409 job is running")), false);
});

test("取消一个已经不在跑的任务：只说不用取消，不提示重试", async () => {
  const shown = [];
  const cancel = createCancelCurrentJob({
    currentJobPort: { jobId: () => "job-1", snapshot: () => ({ job_id: "job-1", workflow: "book" }) },
    shellViewPort: { setCancelDisabled: () => {}, setCancelError: (message) => shown.push(message) },
    setText: () => {},
    cancelJob: async () => { throw conflict("job_not_active"); },
    apiPrefix: "/api/v1",
  });
  await cancel();
  assert.equal(shown.at(-1), "任务已经不在运行，不用取消。");
});
