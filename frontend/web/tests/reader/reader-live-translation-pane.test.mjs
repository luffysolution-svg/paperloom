import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 实时译文叠加的回归约束（本轮新行为）：
//
// - 流式实时译文只叠加在 source 栏，且仅当 overlayOnSource 为真
//   （用户主动触发）；不再另开第二块「源 PDF + 叠加」的实时画布
//   （去掉 liveTranslationPair 双栏 / 双叠）。
// - 对照态叠加不再「消栏」：右栏（最终译文 PDF）照常保留，只在源栏叠加。
// - 源栏叠加时带「原文+实时译文叠加」badge，避免与「左右都是中文」混淆。
// - 译文 PDF 栏永远是最终译文本身，绝不叠加流式画布。

const GRID = new URL(
  "../../../../frontend/packages/reader/src/components/react-pdf/ReaderCompareGrid.tsx",
  import.meta.url,
);

function paneBlock(source, pane) {
  const start = source.indexOf(`pane="${pane}"`);
  assert.ok(start >= 0, `ReaderCompareGrid 必须渲染 pane="${pane}"`);
  const end = source.indexOf("/>", start);
  return source.slice(start, end < 0 ? source.length : end);
}

test("source 栏按 overlayOnSource 决定是否叠加实时译文", () => {
  const source = readFileSync(GRID, "utf8");
  const sourcePane = paneBlock(source, "source");

  assert.match(sourcePane, /liveTranslation=\{overlayOnSource \? liveTranslation : undefined\}/);
  assert.match(sourcePane, /showLiveTranslation=\{overlayOnSource\}/);
  // 不再有「源栏永不叠加」的旧硬编码，也不能再把叠加开关接到 pair 上。
  assert.doesNotMatch(sourcePane, /liveTranslation=\{undefined\}/);
  assert.doesNotMatch(sourcePane, /showLiveTranslation=\{false\}/);
  assert.doesNotMatch(source, /liveTranslationPair/);
});

test("对照叠加保留右栏，译文 PDF 栏绝不叠加", () => {
  const source = readFileSync(GRID, "utf8");
  const translatedPane = paneBlock(source, "translated");

  // 译文 PDF 栏渲染的是 translatedUrl，且无任何流式叠加。
  assert.match(translatedPane, /url=\{translatedUrl\}/);
  assert.match(translatedPane, /liveTranslation=\{undefined\}/);
  assert.match(translatedPane, /showLiveTranslation=\{false\}/);
  // 对照态叠加不再「消栏」：右栏挂载不再被 overlayOnSource 门控。
  assert.doesNotMatch(source, /mountTranslated && !overlayOnSource/);
  assert.match(source, /\{mountTranslated \?/);
});

test("源栏叠加时带「原文+实时译文叠加」标识", () => {
  const source = readFileSync(GRID, "utf8");
  assert.match(source, /reader-source-overlay-badge/);
  assert.match(source, /原文\+实时译文叠加/);
  assert.match(source, /data-source-overlay-badge/);
});
