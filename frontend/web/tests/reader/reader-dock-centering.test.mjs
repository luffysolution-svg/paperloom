/** dock 打开时，「居中」得按 PDF 栏算，不是按视口。
 *
 * 起因：`.reader-react-error` 和 `.reader-error-notice` 用 `left: 50%` +
 * `translateX(-50%)`。AI dock 打开后视口右半边是面板，50% 正好落在分栏线上 ——
 * 提示一半画在 PDF 上、一半画在面板上，而这两条偏偏是最需要读清楚的文案。
 * `.reader-react-hud` 是当时唯一做对的（走 --reader-ai-split-width）。
 *
 * 断言方式：把 CSS 里的 `left` 表达式**算出像素值**再比中心点，不是去匹配某个
 * 字符串。换写法（改成 right、改成 margin-left、换个等价 calc）只要中心点对了
 * 就该绿；中心点错了必须红。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const READER_STYLES = fileURLToPath(
  new URL("../../../../frontend/packages/reader/styles/", import.meta.url),
);

const read = (name) =>
  readFileSync(new URL(name, `file://${READER_STYLES}`), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

const VIEWPORT = 1000;
const SPLIT = 400;
const COLUMN = VIEWPORT - SPLIT;

/** 顶层规则（不含 @media 内部）。 */
function topLevelRules(css) {
  const rules = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) {
        const prelude = css.slice(start, i).trim();
        rules.push({ prelude, bodyStart: i + 1, atRule: prelude.startsWith("@") });
      }
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const rule = rules[rules.length - 1];
        rule.body = css.slice(rule.bodyStart, i);
        start = i + 1;
      }
    }
  }
  return rules.filter((rule) => !rule.atRule && rule.body !== undefined);
}

function declaration(files, selector, property) {
  let found = null;
  for (const file of files) {
    for (const rule of topLevelRules(read(file))) {
      const selectors = rule.prelude.split(",").map((part) => part.trim());
      if (!selectors.includes(selector)) continue;
      const hits = [...rule.body.matchAll(new RegExp(`${property}\\s*:\\s*([^;]+);`, "g"))];
      if (hits.length > 0) found = hits[hits.length - 1][1].trim();
    }
  }
  return found;
}

/** 把 CSS 长度表达式算成像素。position: fixed 的百分比按视口算。 */
function px(expression) {
  let expr = expression
    .replace(/calc\(/g, "(")
    .replace(/var\(--reader-ai-split-width\)/g, String(SPLIT))
    .replace(/(\d+(?:\.\d+)?)dvw/g, (_, n) => String((VIEWPORT * Number(n)) / 100))
    .replace(/(\d+(?:\.\d+)?)vw/g, (_, n) => String((VIEWPORT * Number(n)) / 100))
    .replace(/(\d+(?:\.\d+)?)%/g, (_, n) => String((VIEWPORT * Number(n)) / 100))
    .replace(/(\d+(?:\.\d+)?)px/g, "$1")
    .replace(/\bmin\(/g, "Math.min(")
    .replace(/\bmax\(/g, "Math.max(");
  expr = expr.trim();
  // 只放行算术 + min/max：别的写法宁可让测试炸掉，也不要悄悄算出个假数。
  const guard = expr.replace(/Math\.(?:min|max)/g, "");
  assert.match(guard, /^[-+*/(),0-9.\s]+$/, `算不动的表达式: ${expression}`);
  return Function(`"use strict"; return (${expr});`)();
}

const CHROME_FILES = ["react-pdf.css", "hud.css", "chrome.css", "assistant-dock.css"];
const DOCK_ONLY = ["assistant-dock.css"];

/** 这三条都是 fixed + translateX(-50%)，所以 left 就是中心点。 */
const CENTERED = [
  ".reader-react-error",
  ".reader-error-notice",
  ".reader-react-hud",
];

test("三条浮动 chrome 都靠 translateX(-50%) 居中 —— 下面按中心点比才成立", () => {
  for (const selector of CENTERED) {
    const transform = declaration(CHROME_FILES, selector, "transform");
    assert.ok(transform, `${selector} 没有 transform`);
    assert.match(transform, /translateX\(-50%\)/, `${selector}: ${transform}`);
  }
});

test("dock 关着的时候居中在视口", () => {
  for (const selector of CENTERED) {
    const left = declaration(CHROME_FILES.filter((f) => f !== "assistant-dock.css"), selector, "left");
    assert.ok(left, `${selector} 没有 left`);
    assert.equal(px(left), VIEWPORT / 2, `${selector} 的基础规则不在视口中间`);
  }
});

test("dock 打开的时候居中在 PDF 栏，而不是分栏线上", () => {
  for (const selector of CENTERED) {
    const left = declaration(DOCK_ONLY, `.reader-react-root.is-assistant-open ${selector}`, "left");
    assert.ok(left, `${selector} 在 is-assistant-open 下没有重新定位 —— 中心会落在分栏线上`);
    // 500 = 分栏线；300 = PDF 栏中心。
    assert.equal(px(left), COLUMN / 2, `${selector} 的中心是 ${px(left)}，PDF 栏中心是 ${COLUMN / 2}`);
  }
});

test("两条错误提示的宽度也收进 PDF 栏 —— 栏最窄 35vw，居中了照样溢出", () => {
  for (const selector of [".reader-react-error", ".reader-error-notice"]) {
    const maxWidth = declaration(
      DOCK_ONLY,
      `.reader-react-root.is-assistant-open ${selector}`,
      "max-width",
    );
    assert.ok(maxWidth, `${selector} 在 is-assistant-open 下没有收窄`);
    // 栏宽 600，两边各留 16 → 568；算出来不能超过这个数。
    const fitted = px(maxWidth);
    assert.ok(
      fitted <= COLUMN - 32,
      `${selector}: 算出来 ${fitted}，超出 PDF 栏可用宽度 ${COLUMN - 32}`,
    );
  }
});

