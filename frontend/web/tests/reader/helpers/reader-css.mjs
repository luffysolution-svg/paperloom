/** 阅读页 CSS 的扫描设施 —— 「这段 UI 渲染得出来吗」那一类门禁共用。
 *
 * ## 为什么值得单独一份
 *
 * 本仓库已经被同一种缺陷咬过两次：代码在、DOM 里有、一条 CSS 让它永远看不见。
 * 第一次是可拖动圆钮（`.is-assistant-open .reader-fab { opacity: 0 }`，它管的
 * 6 个功能在任何面板开着时不可达）；第二次是面板工具条
 * （`.reader-notes-panel--workspace .reader-notes-panel-toolbar { display: none }`，
 * 批注导出 / AI 批注层级开关 / 摘录刷新一起没了）。两次都有测试守着那段 UI 的
 * 逻辑，两次都全绿。
 *
 * ## 上一版扫描器的三个盲区（复查实测能绕过去）
 *
 * 1. at-rule 只展开 `@media / @container / @supports`。把同一条隐藏规则包进
 *    `@layer pages { … }` 就扫不到 —— 而 `@layer` 在本仓库是现成写法
 *    （styles/base.css、entries/reader.css 都在用）。
 * 2. 只扫 `packages/reader/styles/`。真正编译成 `dist/css/reader.css` 的入口是
 *    `frontend/web/src/styles/entries/reader.css`，里面已经有几十条 `.reader-*`
 *    规则，隐藏规则写在那里整套全绿。
 * 3. 展开 at-rule 用的是 `\{([\s\S]*?)\n\}` —— 靠「行首右花括号」断句，缩进一下
 *    就断错。这里改成真的配对花括号。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_STYLES = fileURLToPath(new URL("../../../../packages/reader/styles/", import.meta.url));
const WEB_ENTRIES = fileURLToPath(new URL("../../../src/styles/entries/", import.meta.url));
const WEB_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** 注释先剥掉：`/* { *\/` 里的花括号会把配对算错。 */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** 会进到阅读页那张渲染树上的每一份 CSS。
 *
 * 包的 styles/ 全量 + 宿主的 reader 入口（reader.css 里是 fx 终端那块宿主专有
 * 样式）。曾经还有懒注入的 reader-canvas.css，随画布一起删了。宿主入口不能漏 ——
 * 它和包的 styles 一起编译进同一份 dist/css/reader.css，浏览器看不出区别。
 */
export function readerStyleSources() {
  const out = [];
  for (const name of readdirSync(PKG_STYLES).filter((n) => n.endsWith(".css")).sort()) {
    out.push({ name: `packages/reader/styles/${name}`, css: stripComments(readFileSync(join(PKG_STYLES, name), "utf8")) });
  }
  for (const name of readdirSync(WEB_ENTRIES).filter((n) => /^reader.*\.css$/.test(n)).sort()) {
    const entryCss = readFileSync(join(WEB_ENTRIES, name), "utf8");
    out.push({ name: `web/src/styles/entries/${name}`, css: stripComments(entryCss) });
    // 入口用相对路径引入的宿主分片（features/reader/ui/*.css）同样编进 dist/css/reader.css，
    // 不跟进去就又回到上面的盲区 2。包目录里的已经扫过，跳过。
    for (const match of entryCss.matchAll(/@import\s+"(\.{1,2}\/[^"]+\.css)"/g)) {
      const file = resolve(WEB_ENTRIES, match[1]);
      if (file.startsWith(PKG_STYLES)) continue;
      out.push({ name: `web/${relative(WEB_ROOT, file)}`, css: stripComments(readFileSync(file, "utf8")) });
    }
  }
  return out;
}

/** 按配对的花括号切成 { prelude, body }，不依赖缩进也不依赖换行位置。 */
/** 切出顶层的 `prelude { body }`。
 *
 * 顶层的 `;` 必须把 start 推过去 —— 没有花括号的语句型 at-rule（`@import`、
 * `@charset`、`@namespace`）否则会被粘进**下一个**块的 prelude 里。
 *
 * 这不是理论问题：`entries/reader.css` 开头是两行 @import，正文整个包在
 * `@layer pages { }` 里。粘起来之后那唯一的顶层块 prelude 变成
 * `@import "tailwindcss"; @import "…entry.css"; @layer pages`，以 @import 开头、
 * 不匹配 NESTING_AT_RULE，于是被整块跳过 —— `allRules()` 对那个文件返回 0 条，
 * 宿主加的每一条规则（fx 终端、agent 产物那块）从来没被扫描器看过。
 * 而这个扫描器正是「入口被 CSS 藏掉」那类 bug 的唯一门禁。
 */
function splitBlocks(css) {
  const out = [];
  let depth = 0;
  let start = 0;
  let preludeEnd = -1;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) preludeEnd = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        out.push({ prelude: css.slice(start, preludeEnd).trim(), body: css.slice(preludeEnd + 1, i) });
        start = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      start = i + 1;
    }
  }
  return out;
}

// 这些 at-rule 是「条件外壳」：里面装的还是普通规则，必须往里走一层。
// @layer 尤其不能漏 —— 它对特异性没有影响，隐藏规则包进去照样生效。
const NESTING_AT_RULE = /^@(media|container|supports|layer|scope)\b/;

/** 展平成选择器规则，at-rule 外壳递归展开。 */
export function allRules(css) {
  const out = [];
  for (const block of splitBlocks(css)) {
    if (block.prelude.startsWith("@")) {
      if (NESTING_AT_RULE.test(block.prelude)) out.push(...allRules(block.body));
      continue; // @keyframes / @font-face 里没有选择器
    }
    out.push(block);
  }
  return out;
}

/** 「整体藏起来」的写法。圆钮当年用的是 opacity: 0 + pointer-events: none。
 * `!important` 必须能匹配到 —— 上一版的 opacity 正则要求分号紧跟，
 * `opacity: 0 !important` 从它眼皮底下过去了。 */
export const HIDING_DECLARATIONS = [
  /display\s*:\s*none/,
  /visibility\s*:\s*(hidden|collapse)/,
  /opacity\s*:\s*0(\.0*)?\s*(!important)?\s*(;|$)/,
  /pointer-events\s*:\s*none/,
  /content-visibility\s*:\s*hidden/,
];

export function hidingDeclarations(body) {
  return HIDING_DECLARATIONS.filter((pattern) => pattern.test(body));
}

/** 交互状态不算「入口消失」：:hover / :disabled 是反馈，不是不可达。 */
export function isStateSelector(prelude) {
  return /:(hover|focus|active|disabled|focus-visible|target)\b/.test(prelude)
    || /::(before|after|-webkit-scrollbar|placeholder|backdrop)/.test(prelude);
}

const COMPOUND_OF_CLASSES = /^(\.[A-Za-z0-9_-]+)+$/;

/** 这条选择器会不会命中「渲染出来的这条祖先链上的最后一个元素」。
 *
 * chain 是从某个祖先到目标元素的 class 集合数组（最后一项是目标元素）。
 * 只认「纯 class + 后代/子代组合」的选择器 —— 带属性、伪类、id、兄弟组合的
 * 一律放过。这是有意的欠近似：宁可漏报，也不要因为一条 `[hidden]` 规则把门禁
 * 变成噪声，然后被人加白名单绕过去。
 */
export function selectorHitsChain(prelude, chain) {
  for (const raw of prelude.split(",")) {
    const sel = raw.trim().replace(/>/g, " ");
    if (!sel || /[#[\]*+~:]/.test(sel)) continue;
    const compounds = sel.split(/\s+/).filter(Boolean);
    if (compounds.some((c) => !COMPOUND_OF_CLASSES.test(c))) continue;
    const classesOf = (c) => c.split(".").filter(Boolean);
    const target = chain[chain.length - 1];
    if (!classesOf(compounds[compounds.length - 1]).every((cls) => target.has(cls))) continue;
    // 前面每一段都要在祖先链上按顺序找到落点（从近到远贪心匹配）。
    let at = chain.length - 2;
    let ok = true;
    for (let k = compounds.length - 2; k >= 0; k -= 1) {
      const need = classesOf(compounds[k]);
      while (at >= 0 && !need.every((cls) => chain[at].has(cls))) at -= 1;
      if (at < 0) { ok = false; break; }
      at -= 1;
    }
    if (ok) return true;
  }
  return false;
}

/** 渲染出来的这个元素（连同它的每一级祖先）有没有被任何一条 CSS 藏掉。
 * 返回问题清单，空数组 = 看得见。 */
export function hidingRulesFor(element) {
  const chain = [];
  for (let node = element; node; node = node.parentElement) chain.unshift(new Set(node.classList));
  const problems = [];
  for (const { name, css } of readerStyleSources()) {
    for (const rule of allRules(css)) {
      if (isStateSelector(rule.prelude)) continue;
      const hits = hidingDeclarations(rule.body);
      if (hits.length === 0) continue;
      for (let depth = 1; depth <= chain.length; depth += 1) {
        if (!selectorHitsChain(rule.prelude, chain.slice(0, depth))) continue;
        problems.push(`${name}: ${rule.prelude} { …${hits[0].source} }`);
        break;
      }
    }
  }
  return problems;
}
