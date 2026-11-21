/** 「藏起来但不卸载」的面板，真的被挪出视线了吗。
 *
 * # 起因：这套机制从来没有生效过
 *
 * keepMounted 的面板（终端）关掉时不卸载 —— 卸载会关 WebSocket 进而杀掉 PTY。
 * 藏它的做法是挪到 `inset-inline: -200vw`，**不能用 display:none**（xterm 的
 * 容器会量到 0，fit() 算出 1 行）。
 *
 * 但那条规则原本是 `.reader-notes-panel[data-hidden]`，特异性 (0,2,0)；而
 * panel-shell.css 的 `.reader-notes-panel--workspace.is-pane-right` 同样是
 * (0,2,0)，且 @import 排在后面（entry.css:37 vs :40）。**后来者赢**，于是
 * `inset-inline: auto 0` 把 `left: -200vw` 顶掉，面板原地不动。
 *
 * 用户看到的：开过一次 AI 面板再关掉，右半个阅读区一直盖着一块不透明白板
 * （background: var(--paper)，z-index 24），上面印着上次的终端内容。
 * pointer-events:none 让鼠标穿过去，所以底下的 PDF 还能滚能选 —— 只是看不见。
 *
 * # 为什么原来的门禁抓不到
 *
 * `panel-keep-mounted.test.mjs` 只断言 `.reader-notes-panel[data-hidden]` 这个
 * **字符串在 CSS 里存在**，从不检查它有没有赢下层叠。和圆钮那次一模一样：
 * 守着一条永远不生效的规则。
 *
 * 所以这份文件真算层叠：把所有命中「藏起来的面板」那个元素、且设置了行内起始
 * 偏移的规则收集起来，按 (特异性, 出现顺序) 排序，断言赢的那条把它挪出了视口。
 */
import test from "node:test";
import assert from "node:assert/strict";

import { readerStyleSources, allRules } from "./helpers/reader-css.mjs";

/** 藏起来的面板那个元素真实带的东西（ReaderPanelShell.tsx 拼的 className）。 */
const PANEL_CLASSES = ["reader-notes-panel", "reader-notes-panel--workspace", "is-pane-right"];
const PANEL_ATTRS = ["data-hidden"];

/** CSS 特异性，只算这里用得到的那部分：#id / .class|[attr]|:pseudo-class / 元素。 */
function specificity(selector) {
  let s = selector.replace(/::[a-z-]+/g, "");
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[a-z-]+(\([^)]*\))?/g) || []).length;
  const elements = (s.replace(/[.#[][^\s>+~]*/g, "").match(/\b[a-z][\w-]*/g) || []).length;
  return ids * 10000 + classes * 100 + elements;
}

/** 这条**复合**选择器（不含后代组合）命中我们那个元素吗。 */
function matchesPanel(compound) {
  const classes = compound.match(/\.[\w-]+/g) || [];
  const attrs = compound.match(/\[[\w-]+/g) || [];
  if (/[#:]/.test(compound.replace(/:(hover|focus|active|disabled|focus-visible)\b/g, ""))) {
    // 带 id 或我们没建模的伪类：保守地判不命中，避免假阳性。
    if (/#/.test(compound)) return false;
  }
  for (const c of classes) if (!PANEL_CLASSES.includes(c.slice(1))) return false;
  for (const a of attrs) if (!PANEL_ATTRS.includes(a.slice(1))) return false;
  return classes.length + attrs.length > 0;
}

/** 声明块里设置「行内起始偏移」的那些属性。 */
const INLINE_START = /(^|;)\s*(left|inset-inline|inset-inline-start|inset)\s*:\s*([^;]+)/gi;

function inlineStartWinner() {
  const candidates = [];
  let order = 0;
  for (const { name, css } of readerStyleSources()) {
    for (const rule of allRules(css)) {
      order += 1;
      // prelude 可能是逗号分隔的多条。**特异性必须按真正命中的那条算** ——
      // 按整组取 max 会把一条根本不命中的选择器（比如多带了 .reader-float-ai）
      // 的特异性安到这条规则头上，于是层叠算错（我第一版就是这么错的）。
      const matched = rule.prelude.split(",").filter((sel) => {
        const parts = sel.trim().split(/\s+|>|\+|~/).filter(Boolean);
        const last = parts[parts.length - 1];
        return last && matchesPanel(last);
      });
      if (matched.length === 0) continue;
      let m;
      INLINE_START.lastIndex = 0;
      while ((m = INLINE_START.exec(rule.body))) {
        candidates.push({
          name,
          selector: matched.map((x) => x.trim()).join(", ").replace(/\s+/g, " "),
          prop: m[2].toLowerCase(),
          value: m[3].trim(),
          spec: Math.max(...matched.map(specificity)),
          order,
        });
      }
    }
  }
  candidates.sort((a, b) => (a.spec - b.spec) || (a.order - b.order));
  return { winner: candidates[candidates.length - 1], all: candidates };
}

test("藏起来的面板真的被挪出视口 —— 算层叠，不是查字符串", () => {
  const { winner, all } = inlineStartWinner();
  // 正对照：确实有人在管这个元素的行内起始偏移。收集不到就说明匹配器坏了，
  // 那时下面的断言会因为 winner 是 undefined 而以一个看不懂的理由红。
  assert.ok(all.length >= 2,
    `只收集到 ${all.length} 条设置行内起始偏移的规则，匹配器八成失效了`);
  assert.ok(winner, "没有任何规则设置行内起始偏移");
  assert.match(
    winner.value,
    /-\s*200vw/,
    `赢下层叠的是 ${winner.name} 的 \`${winner.selector} { ${winner.prop}: ${winner.value} }\`，`
    + "面板没被挪出视口 —— 关掉之后它会盖住半个阅读区",
  );
});

test("挪出视口靠的是特异性，不是 @import 的先后", () => {
  // 靠顺序正是它上次栽的原因：panel-shell.css 排在 react-pdf.css 之后，
  // 同特异性就把隐藏规则顶掉了，而且没有任何东西会红。
  const { winner, all } = inlineStartWinner();
  const losers = all.filter((c) => c !== winner);
  assert.ok(losers.length > 0, "只有一条规则，这条断言没有判别力");
  const tied = losers.filter((c) => c.spec === winner.spec);
  assert.deepEqual(
    tied.map((c) => `${c.name}: ${c.selector}`),
    [],
    "有规则和隐藏规则特异性相同 —— 改一下 @import 顺序就会把它顶掉",
  );
});

test("不能用 display:none 藏它 —— xterm 会量到 0 尺寸", () => {
  // 这条守的是隐藏手法本身，不是层叠。fit() 会算出 1 行，切回来整段输出挤成一行。
  for (const { name, css } of readerStyleSources()) {
    for (const rule of allRules(css)) {
      const last = rule.prelude.split(",")[0].trim().split(/\s+/).pop();
      if (!last || !/\[data-hidden\]/.test(last) || !matchesPanel(last)) continue;
      assert.doesNotMatch(rule.body, /display\s*:\s*none/,
        `${name} 用 display:none 藏 keepMounted 面板 —— xterm 会量到 0 尺寸`);
      assert.doesNotMatch(rule.body, /visibility\s*:\s*(hidden|collapse)/, `${name} 同上`);
    }
  }
});
