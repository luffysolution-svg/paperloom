/** 三条会让用户丢东西的。
 *
 * 1. 隐藏栏被当成答案 → 阅读位置被写成第 1 页
 * 2. 栏锁跟着别的面板活下去 → PDF 半边卡在译文栏
 * 3. 一条物理上不可能成功的 retry → 该页永久停在旧版本，并堵住后面所有页 8.2 秒
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

import { pickPageAtFocus } from "../../../packages/reader/src/pdf/scroll-to-page.ts";
import { decideLiveTranslationSnapshot }
  from "../../../packages/reader/src/shared/data/live-translation-state.ts";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const APP = read("../../../packages/reader/src/ReaderAppReactPdf.tsx");

// ---------------------------------------------------------------- 阅读锚点

/** 造一批页槽；`hidden` 的那些 rect 全是 0（`.is-hidden{display:none}` 的效果）。 */
function makePages(count, { hidden }) {
  const dom = new JSDOM("<!doctype html><body></body>");
  const out = [];
  for (let i = 1; i <= count; i += 1) {
    const el = dom.window.document.createElement("div");
    el.setAttribute("data-reader-page", String(i));
    el.getBoundingClientRect = () => (hidden
      ? { top: 0, bottom: 0, height: 0, width: 0 }
      : { top: (i - 1) * 100, bottom: i * 100, height: 100, width: 800 });
    dom.window.document.body.appendChild(el);
    out.push(el);
  }
  return out;
}

test("整栏被隐藏时说「我不知道」，不是返回第 1 页", () => {
  // 从选区问 AI 会锁栏，另一栏拿到 display:none —— 它的页槽全在 DOM 里但 rect 是 0。
  // 原来这里退到 pages[0]，返回 {page:1, fraction:1}：一个看起来合法的假答案。
  // 调用方拿它去写阅读锚点和 URL，300 页处的位置就被改写成第 1 页了。
  assert.equal(pickPageAtFocus(makePages(5, { hidden: true }), 300), null);
});

test("正对照：栏没被隐藏时照常挑得出页", () => {
  // 否则上一条可能是因为函数整个坏了才返回 null。
  const picked = pickPageAtFocus(makePages(5, { hidden: false }), 250);
  assert.ok(picked, "可见栏也挑不出页了");
  assert.equal(picked.page, 3);
});

// ---------------------------------------------------------------- 栏锁

test("换面板时清掉栏锁 —— 它的语义是「这一次提问」", () => {
  // 定长窗口是假的：`closeAssistant` 那条原来取 +700 字符，而它的真实函数体只有 4 行 ——
  // 窗口越过边界，把**下一个** useCallback（changeWorkspace）里的同一行包了进来，
  // 于是删掉 closeAssistant 里那行、1953 条全绿（子 agent 实测）。
  // 改成「到下一个 useCallback / useMemo 之前」。
  const callbackBody = (name) => {
    const start = APP.indexOf(`const ${name} = useCallback`);
    assert.ok(start >= 0, `${name} 不见了，这条门禁守错了地方`);
    const rest = APP.slice(start + 1);
    const end = rest.search(/\n {2}const \w+ = use(?:Callback|Memo)\(/);
    assert.ok(end > 0, `找不到 ${name} 的结尾`);
    return rest.slice(0, end);
  };
  for (const [where, name] of [
    ["换面板", "selectAssistant"],
    ["关面板", "closeAssistant"],
    ["切顶栏页签", "changeWorkspace"],
  ]) {
    assert.match(callbackBody(name), /setAssistantPdfPane\(null\)/,
      `${where}没清栏锁 —— 在译文栏问过 AI 之后${where}，PDF 还只剩译文栏`);
  }
});

// ---------------------------------------------------------------- 快照决策

const ev = { page_idx: 3, attempt: 1, generation: 2, page_hash: "h", seq: 10 };
const snap = (over = {}) => ({ page_idx: 3, attempt: 1, generation: 2, page_hash: "h", ...over });

test("同版本、本地 hash 对不上 → 以后端为准，不能 retry", () => {
  // 走到这一步时快照已经过了对事件的全部校验，后端就是权威。retry 会去重读
  // **同一个不可变端点** 9 次（累计 8.2 秒），答案必然完全相同 —— 不可能成功，
  // 而代价是堵住后面所有页，然后放弃这一页并推进游标（该页永久停在旧版本）。
  const current = { attempt: 1, generation: 2, pageHash: "别的" };
  assert.equal(decideLiveTranslationSnapshot(current, ev, snap()), "accept");
});

test("同版本、hash 一致 → ignore（已经是最新的了）", () => {
  const current = { attempt: 1, generation: 2, pageHash: "h" };
  assert.equal(decideLiveTranslationSnapshot(current, ev, snap()), "ignore");
});

test("正对照：该 retry 的还得 retry", () => {
  // 快照比事件旧 —— 这是真的要重试（后端还没落盘），去掉就会显示过期译文。
  assert.equal(decideLiveTranslationSnapshot(undefined, ev, snap({ generation: 1 })), "retry");
  assert.equal(decideLiveTranslationSnapshot(undefined, ev, snap({ page_idx: 4 })), "retry");
  assert.equal(decideLiveTranslationSnapshot(undefined, ev, snap({ page_hash: "x" })), "retry");
});

test("正对照：本地更新时仍然 ignore，更旧时仍然 accept", () => {
  assert.equal(decideLiveTranslationSnapshot({ attempt: 2, generation: 0, pageHash: "h" }, ev, snap()), "ignore");
  assert.equal(decideLiveTranslationSnapshot({ attempt: 0, generation: 9, pageHash: "h" }, ev, snap()), "accept");
});
