/**
 * 漏还原的后端保护 token 必须看得见。
 *
 * `<f1-e32/>` 在 Markdown 里会被当成未知 HTML 元素——不是显示成乱码，而是**整段
 * 消失**。实测 `结果为 <f1-e32/> 所示` 渲染出来的 textContent 是 `结果为  所示`，
 * 公式连痕迹都不剩。这比显示成垃圾更糟：没人会发现译文少了东西。
 *
 * 后端对这类 token 只在缓存读写处设了闸（坏译文不入缓存、命中即作废），不拦投递，
 * 所以前端照样会拿到。前端此前一处都不认识它们。
 *
 * 替换成不含尖括号的写法是必须的：两条下游路径对 HTML 的处理方式不同（阅读器
 * Markdown 走 marked，实时翻译叠层走 escapeHtml），任何带尖括号的形式——转义也好、
 * 反引号包起来也好——都会在其中一条里被解析掉或显示成二次转义的乱码。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, beforeEach } from "node:test";

import {
  extractMarkdownMath,
  materializeMarkdownMathHtml,
  mathFailureStats,
  resetMarkdownMathEngineLoader,
  revealProtectedTokens,
} from "../../src/features/reader/domain.js";

async function renderText(source) {
  resetMarkdownMathEngineLoader();
  const { text, slots } = extractMarkdownMath(source);
  const html = await materializeMarkdownMathHtml(`<p>${text}</p>`, slots);
  const dom = new JSDOM("<!doctype html><body><div id=host></div>");
  dom.window.document.getElementById("host").innerHTML = html;
  return dom.window.document.getElementById("host").textContent;
}

describe("未还原的保护 token", () => {
  beforeEach(() => {
    mathFailureStats.protectedTokens = 0;
  });

  it("公式 token 不再凭空消失", async () => {
    const text = await renderText("结果为 <f1-e32/> 所示");
    assert.match(text, /f1-e32/, `token 消失了：${JSON.stringify(text)}`);
    assert.equal(mathFailureStats.protectedTokens, 1);
  });

  it("术语 token 同样处理", async () => {
    const text = await renderText("术语 <t2-abc/> 保留");
    assert.match(text, /t2-abc/);
  });

  it("形近但不是 token 的写法不受影响", () => {
    const source = "区间 <f1> 与 a<b 比较，以及 <f12-xy/> 这种不合规的";
    assert.equal(revealProtectedTokens(source).count, 0);
    assert.equal(revealProtectedTokens(source).text, source);
  });

  it("正常译文不被改动", () => {
    const source = "耦合项 $\\alpha_{I}$ 支配跃迁。";
    assert.equal(revealProtectedTokens(source).text, source);
    assert.equal(revealProtectedTokens(source).count, 0);
  });

  it("多个 token 逐个计数", () => {
    const { count } = revealProtectedTokens("<f1-abc/> 和 <t2-def/> 和 <n3-123/>");
    assert.equal(count, 3);
  });
});
