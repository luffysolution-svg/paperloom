/** 面板上那些入口，是**看得见**的。
 *
 * ## 起因：和圆钮同型的第二起
 *
 * 批注从浮窗搬进 dock 之后，class 从 `reader-notes-panel--float` 变成
 * `--workspace`，于是撞上 float-markdown.css 里一条本来命不中的规则：
 *
 *     .reader-notes-panel--workspace .reader-notes-panel-toolbar { display: none }
 *
 * 特异性 (0,2,0) 压过 (0,1,0)，三个面板的工具条整条消失。代码在、DOM 里有、
 * 点不到，而所有测试全绿。
 *
 * ## 现在守的是 Markdown 面板
 *
 * 原来这里的样本是批注面板的「导出 Markdown」。批注整个删了（阅读页收成
 * Markdown + AI 两个面板），样本换成 Markdown 面板的「目录」。
 *
 * **不能就这样留一个空的 CASES** —— 空数组的 for 循环一条测试都不生成，
 * 文件还在、还「全绿」，那正是这份文件当初要抓的那类东西。
 *
 * ## 所以这份文件测的是「渲染得出来」，不是「代码长什么样」
 *
 * 先把面板真渲染一遍，从 DOM 里**拿到那个按钮**（拿不到就直接红 —— 否则下面
 * 「没人藏它」在按钮根本不存在时永远绿），再拿它那条祖先链去和每一份会进
 * 阅读页的 CSS 对账。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

import { ReaderMarkdownPanel } from "../../../packages/reader/src/components/react-pdf/ReaderMarkdownPanel.tsx";
import { hidingRulesFor } from "./helpers/reader-css.mjs";

const noop = () => {};

function render(node) {
  const dom = new JSDOM(`<body>${renderToStaticMarkup(node)}</body>`);
  return dom.window.document.body;
}

/** 按可见文字找按钮 —— 找的是用户点的那个东西，不是某个 class 名。 */
function buttonByText(root, match) {
  return [...root.querySelectorAll("button")].find((b) => match(b.textContent.trim())) ?? null;
}

const CASES = [
  {
    name: "Markdown 面板的「目录」",
    label: "目录",
    // 没有正文时 outline 是空的，按钮 disabled 但**仍然渲染** —— 这条守的是
    // 「看得见」，不是「点得动」。
    find: (body) => buttonByText(body, (t) => t.startsWith("目录")),
    container: ".reader-markdown-nav",
    node: () => createElement(ReaderMarkdownPanel, {
      open: true,
      jobId: "job-1",
      sourceOnly: false,
      side: "right",
      onClose: noop,
    }),
  },
];

assert.ok(CASES.length > 0, "CASES 空了：下面的循环一条测试都不生成，这个文件就是摆设");

for (const { name, label, find, container, node } of CASES) {
  test(`${name} 真的渲染出来了，而且没有 CSS 把它藏掉`, () => {
    const body = render(node());
    // 先证明「这个东西存在」：它不存在时，下面那条在任何情况下都绿。
    const button = find(body);
    assert.ok(button, `${name} 没渲染出来：找不到「${label}」按钮`);
    // 容器那一层也得在（按钮在、容器被藏掉一样看不见）。
    assert.ok(
      button.closest(container),
      `${name} 不在 ${container} 里，这条门禁守错了地方`,
    );
    assert.deepEqual(
      hidingRulesFor(button),
      [],
      `${name} 被 CSS 藏起来了 —— 和圆钮同一种死法`,
    );
  });
}

test("扫描器本身是活的：故意藏掉就会被抓出来", () => {
  // 这条守的是上面三条的有效性。扫描器失效（解析不出规则、路径写错、正则不匹配）
  // 时上面三条会变成「永远绿」，而这正是假门禁最常见的形状。
  const dom = new JSDOM(
    `<body><aside class="reader-notes-panel reader-notes-panel--workspace">`
    + `<div class="reader-notes-panel-toolbar"><button class="reader-notes-export">x</button></div>`
    + `</aside></body>`,
  );
  const button = dom.window.document.querySelector(".reader-notes-export");
  assert.deepEqual(hidingRulesFor(button), [], "真实 CSS 里已经有人藏工具条了");
  // 同一条链上挂一条隐藏规则，扫描器必须报出来。
  const fake = dom.window.document.querySelector(".reader-notes-panel-toolbar");
  fake.classList.add("reader-float-markdown-content", "hidden");
  assert.notDeepEqual(
    hidingRulesFor(button),
    [],
    "扫描器没认出 .reader-float-markdown-content.hidden { display: none }",
  );
});
