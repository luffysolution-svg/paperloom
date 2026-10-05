/**
 * 选中回答里的一段话，引用进输入框再接着问。
 *
 * 此前想追问「你说的第二点」只能手动划选、复制、粘贴，再自己补引号。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { buildQuoteBlock, mergeQuoteIntoDraft, MAX_QUOTE_CHARS } = await import(
  "../../../packages/reader/src/shared/ai/answer-quote.ts"
);

describe("引用块", () => {
  it("包成 Markdown 引用，后面留空行给用户接着写", () => {
    assert.equal(buildQuoteBlock("这是一句话"), "> 这是一句话\n\n");
  });

  it("多行逐行加前缀", () => {
    assert.equal(buildQuoteBlock("第一行\n第二行"), "> 第一行\n> 第二行\n\n");
  });

  it("中间的空行也顶上 >，否则引用会被断成两块", () => {
    assert.equal(buildQuoteBlock("上半段\n\n下半段"), "> 上半段\n>\n> 下半段\n\n");
  });

  it("Windows 换行不会留下 \\r", () => {
    assert.ok(!buildQuoteBlock("甲\r\n乙").includes("\r"));
  });

  it("空选区不产生引用块", () => {
    assert.equal(buildQuoteBlock("   \n  "), "");
    assert.equal(buildQuoteBlock(""), "");
  });

  it("超长选区截断并标出来——不然等于把整篇回答塞回请求里", () => {
    const block = buildQuoteBlock("啊".repeat(MAX_QUOTE_CHARS + 200));
    assert.ok(block.includes("（已截断）"), "超长选区没有截断");
    assert.ok(block.length < MAX_QUOTE_CHARS + 60, `截断后仍然有 ${block.length} 字`);
  });

  it("刚好到上限的不截断", () => {
    assert.ok(!buildQuoteBlock("啊".repeat(MAX_QUOTE_CHARS)).includes("（已截断）"));
  });
});

describe("并进草稿", () => {
  it("草稿是空的就只有引用", () => {
    assert.equal(mergeQuoteIntoDraft("", "> 引用\n\n"), "> 引用\n\n");
  });

  it("不覆盖已经写了一半的草稿", () => {
    const merged = mergeQuoteIntoDraft("我想问的是", "> 引用\n\n");
    assert.equal(merged, "> 引用\n\n我想问的是", "把用户写了一半的内容弄丢了");
  });

  it("引用永远在前，问题在后——和从上往下读的顺序一致", () => {
    const merged = mergeQuoteIntoDraft("问题", "> 甲\n\n");
    assert.ok(merged.indexOf("> 甲") < merged.indexOf("问题"));
  });

  it("连续引用两次都要进去", () => {
    const once = mergeQuoteIntoDraft("", buildQuoteBlock("第一段"));
    const twice = mergeQuoteIntoDraft(once, buildQuoteBlock("第二段"));
    assert.ok(twice.includes("> 第一段") && twice.includes("> 第二段"));
  });

  it("空引用不动草稿", () => {
    assert.equal(mergeQuoteIntoDraft("原样", ""), "原样");
  });
});
