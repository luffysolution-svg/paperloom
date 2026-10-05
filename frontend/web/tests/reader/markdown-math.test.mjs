import assert from "node:assert/strict";
import test from "node:test";

import {
  extractMarkdownMath,
  materializeMarkdownMathFallbackHtml,
  materializeMarkdownMathHtml,
  parseMarkdownWithMath,
  wrapMathSvgHtml,
} from "../../src/features/reader/domain.js";

test("extractMarkdownMath protects display and inline delimiters", () => {
  // `\\(...\\)` 和 `\\[...\\]` 曾经也算公式。按 CommonMark 它们是转义括号，
  // 而且两端都没有来源：后端渲染只输出 `$...$`，cmarker 也只认 `$`。
  // 详见 markdown-math-delimiters.test.mjs。
  const src = [
    "Intro $E=mc^2$ and more.",
    "",
    "$$ \\frac{a}{b} $$",
    "",
    "Also \\(x_i\\) and \\[y=1\\].",
  ].join("\n");

  const { text, slots } = extractMarkdownMath(src);
  assert.equal(slots.length, 2);

  const byTex = Object.fromEntries(slots.map((s) => [s.tex, s]));
  assert.equal(byTex["E=mc^2"]?.display, false);
  assert.equal(byTex["x_i"], undefined, "转义圆括号被当成了公式");
  assert.equal(byTex["y=1"], undefined, "转义方括号被当成了公式");
  assert.ok(text.includes("\\(x_i\\)"), "转义圆括号应当原样留在正文里");
  const frac = slots.find((s) => s.tex.includes("\\frac"));
  assert.ok(frac);
  assert.equal(frac.display, true);

  for (const slot of slots) {
    assert.ok(text.includes(slot.token), `token missing: ${slot.token}`);
  }
  // 原文 $ 定界符已抽出，避免 marked 吃下标
  assert.ok(!/\$E=mc\^2\$/.test(text));
  assert.ok(!/\$\$/.test(text));
});

test("extractMarkdownMath keeps currency-like lone dollars unpaired", () => {
  const { text, slots } = extractMarkdownMath("price is $12 only");
  assert.equal(slots.length, 0);
  assert.equal(text, "price is $12 only");
});

test("extractMarkdownMath does not treat empty $$ as formula", () => {
  const { slots } = extractMarkdownMath("a $ $ b");
  assert.equal(slots.length, 0);
});

test("materializeMarkdownMathHtml renders SVG via MathJax", async () => {
  const { text, slots } = extractMarkdownMath("n = $K_{obs}$");
  assert.equal(slots.length, 1);
  const html = await materializeMarkdownMathHtml(`<p>${text}</p>`, slots);
  assert.match(html, /reader-md-math-inline/);
  assert.match(html, /<svg[\s>]/i);
  assert.ok(!html.includes(slots[0].token));
});

test("parseMarkdownWithMath end-to-end with fake marked", async () => {
  const html = await parseMarkdownWithMath(
    "See $$ a+b $$ please",
    (src) => `<p>${src}</p>`,
  );
  assert.match(html, /reader-md-math-display/);
  assert.match(html, /<svg[\s>]/i);
});

test("wrapMathSvgHtml uses block vs inline tags", () => {
  assert.equal(
    wrapMathSvgHtml("<svg></svg>", false),
    '<span class="reader-md-math reader-md-math-inline"><svg></svg></span>',
  );
  assert.equal(
    wrapMathSvgHtml("<svg></svg>", true),
    '<div class="reader-md-math reader-md-math-display"><svg></svg></div>',
  );
});

test("fallback materialization makes formulas visible before MathJax is ready", () => {
  const { text, slots } = extractMarkdownMath("Fast $x_i$ paint");
  const html = materializeMarkdownMathFallbackHtml(`<p>${text}</p>`, slots);

  assert.match(html, /reader-md-math-failed/);
  assert.match(html, /x_i/);
  assert.ok(!html.includes(slots[0].token));
});
