import test from "node:test";
import assert from "node:assert/strict";

import {
  stageDetailWithoutPageCount,
  unitLabelFromProgress,
} from "../../src/features/book-detail/domain/progress-value.ts";

test("去掉和状态行重复的页码", () => {
  assert.equal(stageDetailWithoutPageCount("正在识别，第 51/88 页", true), "正在识别");
  assert.equal(stageDetailWithoutPageCount("12/48 页 已完成", true), "已完成");
  assert.equal(stageDetailWithoutPageCount("正在识别，第 51/88 页", false), "正在识别，第 51/88 页", "状态行没写页码时原样保留");
});

test("重试次数不是页码，不能删（以前剩下「（次）」）", () => {
  assert.equal(
    stageDetailWithoutPageCount("OCR provider 已返回 done，bundle 尚未就绪，12s 后重试（第 2/8 次）", true),
    "OCR provider 已返回 done，bundle 尚未就绪，12s 后重试（第 2/8 次）",
  );
  assert.equal(stageDetailWithoutPageCount("第 18/55 批", true), "第 18/55 批");
});

test("进度单位：认得的给中文，认不出不猜", () => {
  assert.equal(unitLabelFromProgress({ unit: "page" }), "页");
  assert.equal(unitLabelFromProgress({ unit: "Batch" }), "批");
  assert.equal(unitLabelFromProgress({ unit: "step" }), "");
  assert.equal(unitLabelFromProgress(null), "");
});
