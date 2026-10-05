/**
 * 引用注入只能作用于正文。
 *
 * `decorateCitationMarkdown` 把正文里的 `[1]` 换成 `[1](#retainpdf-citation-1)` 以生成
 * 行内跳转。它原本只避开代码围栏和行内 code，于是会钻进三类不属于正文的片段：
 *
 * - `$...$` / `$$...$$`：数学下标带方括号极常见。实测 `$E_{[1]} = mc^2$` 被改成
 *   `$E_{[1](#retainpdf-citation-1)} = mc^2$`，KaTeX 报 ParseError，整条公式渲染成
 *   红色原文。
 * - 图片 alt 与链接地址：注进去把 URL 改坏。
 *
 * 和后端那条「术语保护不许伸进公式」是同一类问题：注入式改写必须先知道哪些区间
 * 不属于正文，否则它修的和它破坏的是同一批内容。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decorateCitationMarkdown } from "@retainpdf/reader/runtime/ai";

const CITATIONS = new Map([
  ["1", { ref: 1, page_idx: 0 }],
  ["2", { ref: 2, page_idx: 1 }],
]);

const decorate = (markdown) => decorateCitationMarkdown(markdown, CITATIONS);

describe("引用注入的边界", () => {
  for (const [source, label] of [
    ["由公式 $E_{[1]} = mc^2$ 可知。", "行内公式的下标"],
    ["$$\\sum_{i[1]}^{n} a_i [2]$$", "块级公式"],
    ["![x[1]](page-1/a.png)", "图片 alt"],
    ["[见此](http://a.test/x[1])", "链接地址"],
    ["```\ncode [1]\n```", "代码围栏"],
    ["行内 `code [1]` 保护", "行内 code"],
  ]) {
    it(`不注入：${label}`, () => {
      assert.equal(decorate(source), source, `${label} 被注入了引用链接`);
    });
  }

  it("正文里的引用照常注入", () => {
    assert.equal(
      decorate("正常文本 [1] 引用"),
      "正常文本 [1](#retainpdf-citation-1) 引用",
    );
  });

  it("同一段里公式内不注入、公式外注入", () => {
    assert.equal(
      decorate("由公式 $E_{[1]} = mc^2$ 可知，见 [1]。"),
      "由公式 $E_{[1]} = mc^2$ 可知，见 [1](#retainpdf-citation-1)。",
    );
  });

  it("对不上号的编号不动", () => {
    assert.equal(decorate("参考 [7] 与 [1]。"), "参考 [7] 与 [1](#retainpdf-citation-1)。");
  });

  it("没有 citation 时整段不动", () => {
    const source = "见 [1] 与 [2]。";
    assert.equal(decorateCitationMarkdown(source, new Map()), source);
  });
});
