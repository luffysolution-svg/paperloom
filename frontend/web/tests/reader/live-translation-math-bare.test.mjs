import test from "node:test";
import assert from "node:assert/strict";

import { extractMarkdownMath } from "../../../../frontend/packages/reader/src/shared/content/markdown-math.ts";
import { prepareLiveTranslationMathHtml } from "../../../../frontend/packages/reader/src/pdf/LiveTranslationOverlay.tsx";

// The strings below are verbatim `translated_text` values pulled from live
// translation job artifacts (data/jobs/**/translated/page-*-deepseek.json),
// which are gitignored. Keeping them inline makes the test deterministic while
// still exercising the exact un-delimited LaTeX the overlay receives.

// job 20260709175222-ffc511 / page-003 (delimiter-wrapped \rangle + \mathbf)
const WRAPPED_RANGLE = "让我们在计算振动能态时采用谐振近似，并标记 $\\mathbf{Q}'$ 和 $\\mathbf{Q}$ 分别为两个电子态 $|e'\\rangle$ 和 $|e\\rangle$ 的 $N$ 个简正坐标。在此近似下，每个电子态的振动哈密顿量是 $N$ 个一维哈密顿量的和，振动能态是每个模式 $k$ 的一维态 $|w_k\\rangle$ 的直积，即 $|w\\rangle \\equiv |\\mathbf{w}\\rangle = |w_1\\rangle \\otimes |w_2\\rangle \\cdots \\otimes |w_N\\rangle$，其中 $w_k$ 是 $|w_k\\rangle$ 的量子数， $\\mathbf{w} = (w_1, w_2, \\ldots, w_k, \\ldots, w_N)$。一组线性变换联系着简正坐标集 $\\mathbf{Q}'$ 和 $\\mathbf{Q}$： $^{20}$";

// job 20260714033641-50a5f0 / page-050 (bare \mathrm with subscripts)
const BARE_MATH_RM = "CzBN 衍生物的 Buchwald–Hartwig 胺化标准反应条件为：\\mathrm{Pd_2(dba)_3}（0.02–0.08 equiv.）、[\\mathrm{Bu_3PH}]BF_4（0.08–0.32 equiv.）和 \\mathrm{NaO^+Bu}（2–4 equiv.）";

// job 20260904024110-ed6df5 / page-009 (bare subscript)
const BARE_MATH_CHCL = "图 2. 使用 B3LYP/6-311++G(df,pd) 水平在 CHCl_{3} 中计算得到的化合物的 HOMO 和 LUMO 以及 MEP 图（等值面：0.02）。";

// job 20260714033641-50a5f0 / page-029 (bare subscript)
const BARE_MATH_DELTA = "略之一。所得B,N掺杂纳米石墨烯（B2–B4和B2-F）呈现纯深蓝色荧光，且ΔE_{ST}值较小（0.14–0.18 eV）（Table 26）。";

// job 20260714033641-50a5f0 / page-004 (wrapped \dagger)
const WRAPPED_DAGGER = "三苯基硼烷（$Ph_3B$）在自由基阳离子态和中性态下的BDE（$\\Delta H^\\dagger$）分别为51.1和116.9 kcal mol$^{-1}$。";

const failedCount = (html) => (html.match(/reader-md-math-failed/g) || []).length;
const svgCount = (html) => (html.match(/<svg[\s>]/gi) || []).length;

test("extractMarkdownMath stays delimiter-only unless bareLatex is requested", () => {
  const bare = "速率 $^{6}$ 与 ^{6} 不同";
  const strict = extractMarkdownMath(bare);
  assert.deepEqual(strict.slots.map((slot) => slot.tex), ["^{6}"]);
  assert.ok(strict.text.includes("^{6}"), "un-delimited fragment must remain literal by default");

  const loose = extractMarkdownMath(bare, { bareLatex: true });
  assert.deepEqual(loose.slots.map((slot) => slot.tex), ["^{6}", "^{6}"]);
});

test("bareLaTeX extraction catches the reported ^{6} and |w_k\\rangle \\mathbf{Q} fragments", () => {
  const { slots } = extractMarkdownMath("^{6}", { bareLatex: true });
  assert.deepEqual(slots.map((slot) => slot.tex), ["^{6}"]);

  const ket = extractMarkdownMath("|w_k\\rangle \\mathbf{Q}", { bareLatex: true });
  assert.deepEqual(ket.slots.map((slot) => slot.tex), ["|w_k\\rangle", "\\mathbf{Q}"]);
  assert.equal(ket.slots.every((slot) => slot.display === false), true);
});

test("bare ^{6} renders as a formula instead of raw text", async () => {
  const prepared = prepareLiveTranslationMathHtml("速率放大 2^{6} 倍");
  assert.equal(prepared.hasMath, true);
  const rich = await prepared.richHtml;
  assert.ok(svgCount(rich) >= 1, "expected an SVG formula");
  assert.equal(failedCount(rich), 0);
  assert.doesNotMatch(rich, /\^\{6\}/);
});

test("bare |w_k\\rangle \\mathbf{Q} renders as formulas instead of raw text", async () => {
  const prepared = prepareLiveTranslationMathHtml("态 |w_k\\rangle \\mathbf{Q} 的直积");
  assert.equal(prepared.hasMath, true);
  const rich = await prepared.richHtml;
  assert.ok(svgCount(rich) >= 2, "expected both fragments rendered");
  assert.equal(failedCount(rich), 0);
  assert.doesNotMatch(rich, /\\rangle/);
  assert.doesNotMatch(rich, /\\mathbf/);
});

test("real wrapped \\rangle/\\mathbf translation renders every formula", async () => {
  const prepared = prepareLiveTranslationMathHtml(WRAPPED_RANGLE);
  assert.equal(prepared.hasMath, true);
  const rich = await prepared.richHtml;
  assert.equal(failedCount(rich), 0);
  assert.ok(svgCount(rich) >= 10, `expected many SVG formulas, got ${svgCount(rich)}`);
  assert.doesNotMatch(rich, /\\rangle/);
  assert.doesNotMatch(rich, /\\mathbf\{Q\}/);
});

test("real bare \\mathrm / braced sub-superscript fragments render as formulas", async () => {
  const prepared = prepareLiveTranslationMathHtml(BARE_MATH_RM);
  assert.equal(prepared.hasMath, true);
  const rich = await prepared.richHtml;
  assert.equal(failedCount(rich), 0);
  assert.ok(svgCount(rich) >= 3, `expected >=3 formulas, got ${svgCount(rich)}`);
  assert.doesNotMatch(rich, /\\mathrm/);

  for (const real of [BARE_MATH_CHCL, BARE_MATH_DELTA]) {
    const next = await prepareLiveTranslationMathHtml(real).richHtml;
    assert.equal(failedCount(next), 0);
    assert.ok(svgCount(next) >= 1);
    assert.doesNotMatch(next, /\\[a-zA-Z]+_\{/);
  }
});

test("real \\dagger translation renders as a formula", async () => {
  const prepared = prepareLiveTranslationMathHtml(WRAPPED_DAGGER);
  assert.equal(prepared.hasMath, true);
  const rich = await prepared.richHtml;
  assert.equal(failedCount(rich), 0);
  assert.ok(svgCount(rich) >= 3);
  assert.doesNotMatch(rich, /\\dagger/);
});

test("bareLaTeX never promotes code identifiers, snake_case or URLs to math", () => {
  const code = "配置 pdf_font 与 page_layout，运行 get_imports(url) / get_dependencies，见 __get__ 和 O_book";
  assert.deepEqual(extractMarkdownMath(code, { bareLatex: true }).slots, []);
  const url = "下载 http://jcp.aip.org/about/about_the_journal 与 http://jcp.aip.org/features/most_downloaded";
  assert.deepEqual(extractMarkdownMath(url, { bareLatex: true }).slots, []);
});
