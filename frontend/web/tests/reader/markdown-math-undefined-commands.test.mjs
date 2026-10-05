/**
 * 未定义命令必须算渲染失败。
 *
 * 上一次公式事故是「引擎加载失败被三层 catch 吞掉」，公式静默退回纯文本。修完之后
 * 同一个病灶还有第二个入口：`AllPackages` 自带 `noundefined`，它把未定义命令渲染成
 * MathJax **硬编码的红色字面文本**，而且不产生 merror。当时的失败判据只认
 * `merror|data-mjx-error`，于是最常见的那类坏公式——模型造词、命令拼错、OCR 粘连
 * ——100% 绕过计数，控制台一声不吭。
 *
 * 页面上留下的那段红字还压不掉：红色写在 SVG 的 fill 属性上，实时翻译叠层的 CSS
 * 管不到，直接盖在 PDF 页面上。
 *
 * 判别器连节点类型一起认（`mtext` 是 noundefined 的产物，`mstyle` 是合法的
 * `\textcolor{red}`），否则只看颜色会把真的红色公式一起判成失败。
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  materializeMarkdownMathHtml,
  mathFailureStats,
  resetMarkdownMathEngineLoader,
} from "../../src/features/reader/domain.js";

const TOKEN = "RP_MATH_0";

async function renderOne(tex) {
  return materializeMarkdownMathHtml(`<p>${TOKEN}</p>`, [
    { token: TOKEN, tex, display: false },
  ]);
}

describe("未定义命令算渲染失败", () => {
  // 不替换引擎。判别器就住在 loadDefaultMathJaxEngine 返回的 convert 里,自建一个
  // 引擎等于把被测代码换掉——第一版就是这么写的,四条断言全绿而 bug 原样还在。
  beforeEach(() => {
    resetMarkdownMathEngineLoader();
    mathFailureStats.convert = 0;
    mathFailureStats.engineLoad = 0;
    mathFailureStats.samples.length = 0;
  });

  for (const tex of ["\\circled{R}", "\\bm{x}", "\\langlen", "\\textsuperscript{2}"]) {
    it(`${tex} 被计为失败并回退成原文`, async () => {
      const html = await renderOne(tex);
      assert.equal(mathFailureStats.convert, 1, `${tex} 没有被计为失败`);
      assert.match(html, /reader-md-math-error/, "没有回退成可辨认的失败样式");
      assert.ok(!/fill="red"/.test(html), "红色字面量仍然进了页面");
    });
  }

  for (const tex of ["\\alpha", "\\mathrm{M}", "\\textcolor{red}{x}", "\\textcolor{red}{\\text{abc}}"]) {
    it(`${tex} 不该被误判`, async () => {
      const html = await renderOne(tex);
      assert.equal(mathFailureStats.convert, 0, `${tex} 被误判成失败`);
      assert.match(html, /<svg/, "正常公式没有渲染出 SVG");
    });
  }

  it("失败原文留了样本，排查时看得到是哪一类写法", async () => {
    await renderOne("\\circled{R}");
    assert.deepEqual(mathFailureStats.samples, ["\\circled{R}"]);
  });

  it("统计对象挂到了全局，生产环境控制台里拿得到", () => {
    assert.equal(globalThis.__retainMathFailures, mathFailureStats);
  });
});
