/**
 * 阅读器 AI 面板：选中回答里的一段话 → 引用进输入框。
 *
 * 主页早就有这个，阅读器没有——阅读器那侧的「选中引用」是给 PDF 原文/译文用的
 * （SelectionBanner，带页码、区分公式/表格/图片），选 AI 回答的文字没有任何反应。
 *
 * 这里钉的最要紧的一条是**引用要落进输入框正文**，而不是留在 composer 的 quote 状态。
 * 阅读器的发送链路是 ComposerPrimitive.Send → 外部 store 的 onNew → messageText(message)
 * → onSubmit(question)，只读消息的 text part；assistant-ui 自带的 `.Quote` 按钮做的是
 * setQuote，引用挂在 metadata 上，那条路上没人读它——会一声不响地到不了模型。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, beforeEach } from "node:test";

const readSource = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const TOOLBAR_SOURCE = readSource(
  "../../../packages/reader/src/components/react-pdf/assistant/AnswerSelectionToolbar.tsx",
);
const READING_VIEW_SOURCE = readSource(
  "../../../packages/reader/src/components/react-pdf/assistant/ReaderReadingView.tsx",
);

const { buildQuoteBlock, mergeQuoteIntoDraft } = await import(
  "../../../packages/reader/src/shared/ai/answer-quote.ts"
);

/** 记录 composer 收到的调用，模拟 assistant-ui 的 ComposerMethods。 */
function fakeComposer(initialText = "") {
  let text = initialText;
  const quotes = [];
  return {
    getState: () => ({ text }),
    setText: (next) => { text = next; },
    setQuote: (q) => { quotes.push(q); },
    get text() { return text; },
    get quotes() { return quotes; },
  };
}

/**
 * 组件里那段逻辑的等价实现。
 *
 * 直接渲染组件要把整个 assistant-ui runtime 立起来，那会把这条测试变成在测框架。
 * 这里测的是「选中的文字怎么变成输入框里的内容」这条契约本身；组件确实调了它，由
 * 下面的源码契约测试钉住。
 */
function quoteInto(composer, selected) {
  const text = `${selected || ""}`.trim();
  if (!text) return;
  const block = buildQuoteBlock(text);
  if (!block) return;
  composer.setText(mergeQuoteIntoDraft(composer.getState().text || "", block));
}

describe("引用落进输入框", () => {
  let composer;
  beforeEach(() => { composer = fakeComposer(); });

  it("选中的话变成 Markdown 引用块进正文", () => {
    quoteInto(composer, "第二种是线搜索方法");
    assert.equal(composer.text, "> 第二种是线搜索方法\n\n");
  });

  it("不覆盖已经写了一半的草稿", () => {
    const withDraft = fakeComposer("我想问的是");
    quoteInto(withDraft, "线搜索");
    assert.equal(withDraft.text, "> 线搜索\n\n我想问的是");
  });

  it("空选区什么都不做", () => {
    quoteInto(composer, "   ");
    assert.equal(composer.text, "");
  });

  it("不走 setQuote——那条路上没人读 metadata，引用到不了模型", () => {
    quoteInto(composer, "线搜索");
    assert.deepEqual(composer.quotes, [], "引用被留在了 composer 的 quote 状态里");
  });

  it("连续引用两段都进去", () => {
    quoteInto(composer, "第一段");
    quoteInto(composer, "第二段");
    assert.ok(composer.text.includes("> 第一段"));
    assert.ok(composer.text.includes("> 第二段"));
  });
});

describe("组件的接线契约", () => {
  const source = TOOLBAR_SOURCE;

  it("用框架的 Root 做选区检测和浮层定位，不自己写一遍", () => {
    assert.match(source, /SelectionToolbarPrimitive\.Root/);
  });

  it("按钮是自己的，没用 SelectionToolbarPrimitive.Quote", () => {
    // 那个按钮只 setQuote，引用会停在 metadata 上。
    assert.ok(
      !/SelectionToolbarPrimitive\.Quote/.test(source),
      "用了框架的 Quote 按钮，引用会到不了模型",
    );
  });

  it("写的是 composer 的正文", () => {
    assert.match(source, /composer\.setText\(/);
  });

  it("走 pointerdown——click 触发前浏览器已经把选区清了", () => {
    assert.match(source, /onPointerDown=/);
    assert.ok(!/onClick=/.test(source), "用了 click，到那时选区已经没了");
  });

  it("复用同一份引用块实现，不另写一份", () => {
    assert.match(source, /from "\.\.\/\.\.\/\.\.\/shared\/ai\/answer-quote\.js"/);
  });
});

describe("工具条挂进了阅读视图", () => {
  const view = READING_VIEW_SOURCE;

  it("渲染在消息列表旁边", () => {
    assert.match(view, /<AnswerSelectionToolbar \/>/);
  });
});
