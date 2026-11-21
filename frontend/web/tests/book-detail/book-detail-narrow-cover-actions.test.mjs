/**
 * 手机宽度（≤ 719px）的书籍详情看不到「对照阅读 / 查看原版」。
 *
 * 窄屏把左栏压成一行：`grid-template-rows: 112px …` + 左栏 `overflow: hidden`，左栏内部又是
 * `64px | 1fr` 两列网格 —— 封面、书名身份各占一格之后，按钮组被挤到第二行的 64px 窄列里，
 * 落在 112px 之外被裁掉。实测 375 宽「对照阅读」top=187，那个点上的 elementFromPoint 是
 * 「概览」tab；下载区窄屏又是 display:none，于是手机上根本没有阅读入口。
 *
 * 修法：这一行改 auto 高度（设上限、超出可滚），按钮组横跨两列单独一行。
 * 坐标级证据见 Playwright（375 / 768）；这里钉住 CSS 上的成因，防止回退。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../../src/features/book-detail/ui/shell/BookDetailShellResponsive.css", import.meta.url),
  "utf8",
);

/** 取 `@media (max-width: 719px) { ... }` 的内容（按花括号配平）。 */
function narrowMedia() {
  const start = css.indexOf("@media (max-width: 719px)");
  assert.ok(start >= 0, "找不到 ≤ 719px 的媒体查询");
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

const narrow = narrowMedia();

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return narrow.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[2] || "";
}

test("窄屏左栏这一行不是固定像素高：内容多高就多高（设上限）", () => {
  const rows = rule(".book-detail-shell-grid").match(/grid-template-rows:\s*([^;]+);/)?.[1] || "";
  assert.doesNotMatch(rows.trim(), /^\d+px\b/, `第一行仍是固定高度：${rows}`);
});

test("窄屏左栏不裁内容：超出上限时滚动而不是 overflow:hidden", () => {
  const left = rule(".book-detail-shell-left");
  assert.doesNotMatch(left, /overflow:\s*hidden/, "左栏 overflow:hidden 会把按钮裁掉");
  assert.match(left, /max-height:/, "auto 高度要有上限，别把右栏 tabs 挤出屏幕");
});

test("窄屏按钮组横跨两列，不被挤进 64px 的封面列", () => {
  const buttons = rule(".book-detail-cover-buttons");
  assert.match(buttons, /grid-column:\s*1\s*\/\s*-1/, "按钮组没有独占一行");
});
