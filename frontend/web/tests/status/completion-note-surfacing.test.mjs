// 「成功但部分内容未翻译」必须能到达用户。
//
// 后端 completion_pipeline.rs 在成功收尾时会把
//   「任务完成，但有 N 个内容块保留原文未翻译（多为余额不足、上游限流或超时），
//     充值或稍后重试可补翻」
// 写进 job.stage_detail，任务仍是 succeeded。但这条信息此前一路被吃掉：
//
//   1. build_public_stage_snapshot 对终态一律返回 None（这是有意的——终态该看
//      status，不该把 "done" 当阶段），于是 stage_snapshot.stage_detail 没了；
//   2. JobDetailView / JobListItemView 没有任何顶层通道；
//   3. 即便拿到了，public-stage-engine 的 done 分支也无条件返回写死的
//      「翻译 PDF 已生成」，把它整句盖掉。
//
// 结果：部分未翻译的任务在界面上与完全成功的任务一模一样，静默丢信息。
// 现在后端经 completion_note 送出（已在 terminal_completion_note 里滤掉通用的
// 「任务完成」），前端 done 分支优先用它。

import test from "node:test";
import assert from "node:assert/strict";
// 走根入口：architecture/test-layout 门禁禁止深入 packages/domain 内部文件。
import { resolvePublicStagePresentation } from "@retainpdf/domain/job-status";


const PARTIAL_NOTE =
  "任务完成，但有 18 个内容块保留原文未翻译（多为余额不足、上游限流或超时），充值或稍后重试可补翻";

function presentationFor(job) {
  return resolvePublicStagePresentation({ workflow: "book", ...job });
}

test("带完成说明的成功任务，显示后端文案而不是写死的「翻译 PDF 已生成」", () => {
  const presentation = presentationFor({
    status: "succeeded",
    completion_note: PARTIAL_NOTE,
  });
  assert.equal(presentation.detail, PARTIAL_NOTE);
  assert.notEqual(
    presentation.detail,
    "翻译 PDF 已生成",
    "本地兜底文案不得覆盖后端写的警告",
  );
});

test("没有完成说明的成功任务，仍用原来的兜底文案", () => {
  assert.equal(
    presentationFor({ status: "succeeded" }).detail,
    "翻译 PDF 已生成",
    "正常完成的任务文案不该因本次改动而变化",
  );
  assert.equal(
    presentationFor({ status: "succeeded", completion_note: "" }).detail,
    "翻译 PDF 已生成",
    "空字符串等同于没有额外信息",
  );
});

test("OCR 工作流的兜底文案不受影响", () => {
  assert.equal(
    resolvePublicStagePresentation({ workflow: "ocr", status: "succeeded" }).detail,
    "OCR/文档解析已完成",
  );
  assert.equal(
    resolvePublicStagePresentation({
      workflow: "ocr",
      status: "succeeded",
      completion_note: PARTIAL_NOTE,
    }).detail,
    PARTIAL_NOTE,
    "OCR 任务同样应优先显示后端说明",
  );
});

test("完成说明只作用于终态，不影响进行中任务的阶段文案", () => {
  const running = presentationFor({
    status: "running",
    display_stage: "translation",
    completion_note: PARTIAL_NOTE,
  });
  assert.notEqual(
    running.detail,
    PARTIAL_NOTE,
    "completion_note 是终态字段，不该泄漏到进行中任务的阶段说明里",
  );
});
