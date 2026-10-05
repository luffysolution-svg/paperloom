import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  normalizeMathTex,
  extractMarkdownMath,
  materializeMarkdownMathHtml,
} = await import(
  "../../../../frontend/packages/reader/src/shared/content/markdown-math.ts"
);

// 归一化只应修「畸形」输入，正常公式必须原样透传给引擎（否则会改变
// 引擎收到的 tex，破坏既有渲染/mock 契约）。
test("normalizeMathTex 不改正常公式，只修畸形脚本/Unicode", () => {
  assert.equal(normalizeMathTex("x_i"), "x_i");
  assert.equal(normalizeMathTex("a_{i,j}"), "a_{i,j}");
  assert.equal(normalizeMathTex("k_{RISC} \\approx 10^4"), "k_{RISC} \\approx 10^4");
  assert.equal(normalizeMathTex("\\Delta E_{ST}"), "\\Delta E_{ST}");

  assert.match(normalizeMathTex("\\mathcal{T}_0_*"), /_\{0_\*\}/);
  assert.match(normalizeMathTex("Fc_1^0'"), /\^\{0\^\{/);
  assert.match(normalizeMathTex("\\left|e'\\right⟩"), /\\rangle/);
});

test("畸形公式经归一化后 MathJax 不再报错", async () => {
  const cases = [
    "\\left|e'\\right⟩",
    "\\left|\\left⟨ S_1\\right.\\right|",
    "\\mathcal{T}_0_* \\cdot K",
    "Fc_1^0'(k,w_k) < \\varepsilon_1",
    "E_{\\text{rep}}[\\rho_0^\\text{H}] = -141.8",
    "\\mathrm{p}K_\\mathrm{a} \\sim 23",
    "^{6}",
    "|w_k\\rangle \\mathbf{Q}",
  ];
  for (const tex of cases) {
    const out = await materializeMarkdownMathHtml("tok", [
      { token: "tok", tex, display: false },
    ]);
    assert.doesNotMatch(out, /data-mjx-error|merror/, tex);
    assert.doesNotMatch(out, /reader-md-math-failed/, tex);
    assert.match(out, /<svg/, tex);
  }
});

test("方案C：MathJax 报错的公式降级为原始文本，不显示错误框", async () => {
  const out = await materializeMarkdownMathHtml("tok", [
    { token: "tok", tex: "\\frac{1}{", display: false },
  ]);
  assert.doesNotMatch(out, /data-mjx-error|merror/);
  assert.match(out, /reader-md-math-failed/);
  assert.match(out, /\\frac\{1\}\{/);
});

test("Markdown 面板路径开启 bareLatex：裸 \\mathrm 也能渲染", async () => {
  const src = readFileSync(
    new URL(
      "../../../../frontend/packages/reader/src/components/react-pdf/useReaderMarkdownDocument.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const calls = src.match(/extractMarkdownMath\([^)]*\{ bareLatex: true \}/g) || [];
  assert.ok(calls.length >= 2, "useReaderMarkdownDocument 的两处 extractMarkdownMath 都要 bareLatex:true");

  const text = "条件为：\\mathrm{Pd_2(dba)_3}（0.02 equiv.）与 [\\mathrm{Bu_3PH}]BF_4";
  const { text: protectedText, slots } = extractMarkdownMath(text, { bareLatex: true });
  assert.ok(slots.length >= 2, "裸 \\mathrm 片段应被抽成公式");
  assert.ok(!protectedText.includes("\\mathrm"), "抽取后不应残留 \\mathrm");
  for (const slot of slots) {
    const out = await materializeMarkdownMathHtml("tok", [
      { token: "tok", tex: slot.tex, display: false },
    ]);
    assert.match(out, /<svg/, slot.tex);
    assert.doesNotMatch(out, /data-mjx-error|merror/, slot.tex);
  }
});
