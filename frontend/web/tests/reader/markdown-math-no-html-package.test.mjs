/**
 * 公式不许往页面里注入链接。
 *
 * MathJax 的 `html` 包（`AllPackages` 里自带）提供 `\href`/`\class`/`\cssId`，链接
 * 原样进 SVG。而公式的来源是模型对 OCR 文本的输出，再往上是用户上传的 PDF——不是
 * 可信输入。实测 `$\href{javascript:alert(1)}{x}$` 会渲染出
 * `<a href="javascript:alert(1)">`。
 *
 * 阅读器的 Markdown 和 AI 回答两条路都过消毒层，而实时翻译叠层是
 * dangerouslySetInnerHTML 直接注入，中间什么都没有。
 *
 * 先试过在字符串层用正则摘掉危险协议，不成立：`jav&#x61;script:` 在字符串里看着
 * 无害，浏览器解析属性时把实体解码回 `javascript:`。所以改成从根上不产生这类属性
 * ——摘掉 `html` 包。这条测试里的实体编码用例就是钉住那次教训。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it } from "node:test";

import {
  materializeMarkdownMathHtml,
  resetMarkdownMathEngineLoader,
} from "../../src/features/reader/domain.js";

const TOKEN = "\uE000RP_MATH_0\uE001";

async function renderToDom(tex) {
  resetMarkdownMathEngineLoader();
  const html = await materializeMarkdownMathHtml(`<p>${TOKEN}</p>`, [
    { token: TOKEN, tex, display: false },
  ]);
  const dom = new JSDOM("<!doctype html><body><div id=host></div>");
  dom.window.document.getElementById("host").innerHTML = html;
  return dom.window.document;
}

describe("公式不产生链接", () => {
  for (const [tex, label] of [
    ["\\href{javascript:alert(1)}{x}", "javascript 协议"],
    ["\\href{jav&#x61;script:alert(1)}{x}", "实体编码绕过字符串清洗"],
    ["\\href{data:text/html,x}{y}", "data 协议"],
    ["\\href{https://example.com}{x}", "普通外链也不再渲染（mitex 同样不支持）"],
  ]) {
    it(`${label}`, async () => {
      const document_ = await renderToDom(tex);
      assert.equal(
        document_.querySelector("a"),
        null,
        `公式渲染出了 <a>：${document_.getElementById("host").innerHTML.slice(0, 200)}`,
      );
    });
  }

  it("普通公式不受影响", async () => {
    const document_ = await renderToDom("\\alpha + \\beta");
    assert.ok(document_.querySelector("svg"), "普通公式没有渲染出 SVG");
  });

  it("没有事件处理器属性落进页面", async () => {
    const document_ = await renderToDom("\\href{javascript:alert(1)}{x}");
    for (const node of document_.querySelectorAll("*")) {
      for (const attribute of node.attributes) {
        assert.ok(!/^on/i.test(attribute.name), `出现事件处理器 ${attribute.name}`);
      }
    }
  });
});
