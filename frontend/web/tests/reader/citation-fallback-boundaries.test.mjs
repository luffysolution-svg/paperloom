/**
 * 模型编的引用编号不该让我们替它补一批无关引用。
 *
 * `pickCitationsForAnswer` 在正文里找不到有效的 `[n]` 时会兜底:按页去重取少量锚点。
 * 这是给「模型给了回答却忘了标注」准备的。
 *
 * 但同一个条件也会命中「模型写了 `[42]`、而 citations 里只有 1–4」:编号无效被跳过，
 * orderedRefs 为空，于是走兜底。结果是正文写着 `[42]`、脚注却列着三条它根本没引用的
 * 块——凭空造出来的依据比没有依据更糟。
 *
 * 后端 `referenced_citations` 有同一份逻辑，两边一起改过；这里钉前端这一半。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickCitationsForAnswer } from "../../../packages/reader/src/shared/ai/answer-enhance.ts";

const CITATIONS = [1, 2, 3, 4].map((ref) => ({
  ref,
  document_id: "doc-a",
  job_id: "job-1",
  page_idx: ref,
  block_id: `p00${ref}-b0001`,
}));

describe("引用兜底的边界", () => {
  it("编造的编号不触发兜底", () => {
    const picked = pickCitationsForAnswer("模型自信地说了一个结论 [9]。", CITATIONS);
    assert.deepEqual(picked, [], `凭空补了 ${picked.length} 条无关引用`);
  });

  it("一个标记都没写时兜底照常", () => {
    const picked = pickCitationsForAnswer("一段没有任何标注的回答。", CITATIONS);
    assert.ok(picked.length > 0, "兜底被一起改没了");
  });

  it("有效编号按正文顺序取", () => {
    const picked = pickCitationsForAnswer("先看 [3]，再看 [1]。", CITATIONS);
    assert.deepEqual(picked.map((c) => c.ref), [3, 1]);
  });

  it("有效与编造混在一起时只取有效的", () => {
    const picked = pickCitationsForAnswer("见 [2] 与 [9]。", CITATIONS);
    assert.deepEqual(picked.map((c) => c.ref), [2]);
  });

  it("没有引用可选时返回空", () => {
    assert.deepEqual(pickCitationsForAnswer("随便什么回答 [1]。", []), []);
  });
});
