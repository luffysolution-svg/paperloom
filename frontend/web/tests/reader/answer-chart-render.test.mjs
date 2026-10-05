/**
 * 图表块接进 Markdown 渲染管线之后，普通代码块不能被搞坏。
 *
 * 接法是给 markstream 注册一个自定义的 `code_block` 组件——也就是说**所有**代码块都
 * 从我们的组件过一遍。只认 ```retainpdf-chart 这一种，其余一律原样委托回默认实现；
 * 这条要是破了，回答里每一段代码都会跟着遭殃。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, before } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/", pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Node", "Event", "CustomEvent", "DocumentFragment", "MutationObserver", "NodeFilter"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window, writable: true, configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const clipboardWrites = [];
let clipboardFails = false;
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: {
    writeText: (text) => {
      if (clipboardFails) return Promise.reject(new Error("拒绝访问剪贴板"));
      clipboardWrites.push(text);
      return Promise.resolve();
    },
  },
  configurable: true,
});

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { RetainMarkstream } = await import(
  "../../../packages/reader/src/components/ai/RetainMarkstream.tsx"
);

/** 渲染一段 Markdown，返回宿主元素。 */
async function render(content) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(RetainMarkstream, { content, final: true, indexKey: "k" }));
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
  return { host, unmount: () => act(() => root.unmount()) };
}

const chartBlock = (json) => "```retainpdf-chart\n" + json + "\n```\n";

const VALID = JSON.stringify({
  type: "bar",
  title: "两种方法的耗时",
  series: [{ name: "耗时", points: [{ label: "信赖域", value: 12 }, { label: "线搜索", value: 7 }] }],
});

describe("图表块的渲染", () => {
  it("合法规格渲染成 SVG 图表，而不是代码", async () => {
    const view = await render(chartBlock(VALID));
    assert.ok(view.host.querySelector(".reader-answer-chart svg"), "没有渲染出图表");
    assert.ok(!view.host.querySelector("pre"), "图表块还被当成代码块显示了");
    view.unmount();
  });

  it("图表带无障碍名字", async () => {
    const view = await render(chartBlock(VALID));
    const svg = view.host.querySelector(".reader-answer-chart svg");
    assert.equal(svg.getAttribute("role"), "img");
    assert.ok(view.host.querySelector(".reader-answer-chart svg title")?.textContent);
    view.unmount();
  });

  it("每个数据点有 title，鼠标停上去看得到具体数值", async () => {
    const view = await render(chartBlock(VALID));
    const titles = [...view.host.querySelectorAll(".reader-answer-chart svg rect title")]
      .map((t) => t.textContent);
    assert.ok(titles.some((t) => t.includes("信赖域") && t.includes("12")), titles.join(" / "));
    view.unmount();
  });

  it("规格写坏了退回代码块——让用户看见模型原本写了什么", async () => {
    const view = await render(chartBlock('{"type":"甘特图","series":[]}'));
    assert.ok(!view.host.querySelector(".reader-answer-chart"), "坏规格也画了图");
    assert.ok(view.host.textContent.includes("甘特图"), "坏规格的原文没显示出来");
    view.unmount();
  });

  it("没写完的 JSON 也退回代码块，不闪空白", async () => {
    const view = await render(chartBlock('{"type":"bar","series":[{"name":'));
    assert.ok(!view.host.querySelector(".reader-answer-chart"));
    view.unmount();
  });

  it("普通代码块照旧——这条破了回答里每段代码都遭殃", async () => {
    const view = await render("```python\ndef f(x):\n    return x + 1\n```\n");
    assert.ok(!view.host.querySelector(".reader-answer-chart"), "普通代码被当成图表了");
    assert.ok(view.host.textContent.includes("def f(x):"), "普通代码块的内容不见了");
    view.unmount();
  });

  it("内容恰好是合法图表 JSON 的普通 json 代码块，仍然是代码块", async () => {
    // 语言标签这道关防的就是这个：模型在回答里展示一段 JSON 示例，而它恰好符合图表
    // 规格。只靠"能不能解析成规格"来判断的话，这段示例会被画成图。
    const view = await render("```json\n" + VALID + "\n```\n");
    assert.ok(!view.host.querySelector(".reader-answer-chart"), "普通 json 示例被画成了图");
    assert.ok(view.host.textContent.includes("信赖域"), "json 示例的内容不见了");
    view.unmount();
  });

  it("不带语言的代码块也照旧", async () => {
    const view = await render("```\n纯文本块\n```\n");
    assert.ok(!view.host.querySelector(".reader-answer-chart"));
    assert.ok(view.host.textContent.includes("纯文本块"));
    view.unmount();
  });

  it("行内代码不受影响", async () => {
    const view = await render("这是 `inline_code` 一段。\n");
    assert.ok(view.host.textContent.includes("inline_code"));
    assert.ok(!view.host.querySelector(".reader-answer-chart"));
    view.unmount();
  });

  it("饼图走另一条渲染路径，同样出得来", async () => {
    const view = await render(chartBlock(JSON.stringify({
      type: "pie",
      series: [{ name: "占比", points: [{ label: "甲", value: 3 }, { label: "乙", value: 1 }] }],
    })));
    assert.ok(view.host.querySelector(".reader-answer-chart svg path"), "饼图没有扇区");
    view.unmount();
  });

  it("多系列出图例，单系列不出", async () => {
    const two = await render(chartBlock(JSON.stringify({
      type: "line",
      series: [
        { name: "甲", points: [{ label: "1", value: 1 }] },
        { name: "乙", points: [{ label: "1", value: 2 }] },
      ],
    })));
    assert.ok(two.host.querySelector(".reader-answer-chart-legend"), "多系列没有图例");
    two.unmount();

    const one = await render(chartBlock(VALID));
    assert.ok(!one.host.querySelector(".reader-answer-chart-legend"), "单系列不该有图例");
    one.unmount();
  });
});


describe("代码块的外壳", () => {
  const codeShell = (host) => host.querySelector(".reader-answer-code");

  async function clickCopy(host) {
    const btn = host.querySelector(".reader-answer-code-copy");
    await act(async () => {
      btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    return btn;
  }

  it("普通代码块带语言标签和复制按钮", async () => {
    const view = await render("```python\ndef f(x):\n    return x\n```\n");
    assert.ok(codeShell(view.host), "代码块没有外壳");
    assert.equal(view.host.querySelector(".reader-answer-code-lang").textContent, "Python");
    assert.ok(view.host.querySelector(".reader-answer-code-copy"), "没有复制按钮");
    view.unmount();
  });

  it("代码正文是朴素的 pre，没有第二层工具条", async () => {
    // markstream 的富代码块自带一排按钮和 HTML 预览 iframe，这个渲染器有意用
    // renderCodeBlocksAsPre 关掉了它（AI 输出不可信）。但自定义组件绕过那个开关，
    // 委托时必须显式选 PreCodeNode——错委托给 CodeBlockNode 的话，既多出一层重复的
    // 工具条，也把那条防线换掉了。
    const view = await render("```python\ndef f(x):\n    return x\n```\n");
    assert.ok(view.host.querySelector("pre"), "代码正文不是 pre");
    const buttons = [...view.host.querySelectorAll("button")]
      .map((b) => (b.textContent || "").trim());
    assert.deepEqual(buttons, ["复制"], `代码块里有多余的按钮: ${buttons.join(" / ")}`);
    view.unmount();
  });

  it("复制的是代码原文，不带语言标签和围栏", async () => {
    clipboardWrites.length = 0;
    clipboardFails = false;
    const view = await render("```python\ndef f(x):\n    return x\n```\n");
    await clickCopy(view.host);
    assert.equal(clipboardWrites.length, 1);
    assert.ok(clipboardWrites[0].includes("def f(x):"));
    assert.ok(!clipboardWrites[0].includes("```"), "把围栏也复制进去了");
    assert.ok(!clipboardWrites[0].toLowerCase().includes("python"), "把语言标签也复制进去了");
    view.unmount();
  });

  it("复制成功后给反馈", async () => {
    clipboardWrites.length = 0;
    clipboardFails = false;
    const view = await render("```js\nconst a = 1;\n```\n");
    const btn = await clickCopy(view.host);
    assert.equal(btn.textContent, "已复制");
    view.unmount();
  });

  it("剪贴板被拒时不假装成功", async () => {
    clipboardFails = true;
    const view = await render("```js\nconst a = 1;\n```\n");
    const btn = await clickCopy(view.host);
    assert.notEqual(btn.textContent, "已复制", "复制失败却显示成功");
    clipboardFails = false;
    view.unmount();
  });

  it("没有语言的围栏块不显示语言标签", async () => {
    const view = await render("```\n纯文本\n```\n");
    assert.equal(view.host.querySelector(".reader-answer-code-lang").textContent, "");
    view.unmount();
  });

  it("图表块不套代码外壳——它已经不是代码了", async () => {
    const view = await render(chartBlock(VALID));
    assert.ok(!codeShell(view.host), "图表块也套上了代码外壳");
    view.unmount();
  });
});
