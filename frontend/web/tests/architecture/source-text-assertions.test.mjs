/** 元门禁：对源码文本的断言不许被自己的注释 / import 行满足，也不许用定长窗口。
 *
 * # 为什么要有这一条
 *
 * 这个仓库在**同一个形状**上栽过八次：断言的那个串在注释或 import 行里也出现，于是
 * 正向断言被自己的说明满足、门禁再也红不了。实测过的两例：
 *
 *   - 删掉选区浮条上整个「问 AI」按钮（阅读页**唯一**的 AI 入口），1953 条全绿 ——
 *     `/问 AI/` 被该文件里三处注释满足
 *   - 删掉 closeAssistant 里那行 setAssistantPdfPane(null)，1953 条全绿 ——
 *     `indexOf(…) + 700` 的窗口越过函数边界，命中了邻居 changeWorkspace 里的同一行
 *
 * 人一次次靠自觉躲这个坑躲不住，所以扫一遍。
 *
 * # 两条独立扫描
 *
 * A. `assert.match(SRC, /x/)` 里的 x 在目标文件里**只**出现在注释或 import/export 行。
 *    注意方向：`doesNotMatch` 被注释满足时是**红**的（吵，但不是假门禁），真正会悄悄
 *    永绿的是正向断言。
 * B. `X.slice(X.indexOf(A), X.indexOf(A) + N)` 这种定长窗口。
 *
 * # 它抓不住今天那两例里的第一例 —— 这一点必须说清
 *
 * 扫描 A 查的是「这个串**现在**只在注释里」。而「问 AI」那条当时是：串在注释里有
 * **三处**，在真代码里也有一处（那个按钮）。扫描器看现状，判定它不空转 —— 对的。
 * 它变空转是在**按钮被删之后**，而那是个反事实，静态扫描看不到。
 *
 * 所以扫描 A 守的是「已经空转的断言」（`FileText` 被 import 行满足、
 * `.reader-notes-count` 被文件头注释满足、`resolveReaderWidthCommit(` 被 import 行
 * 满足 —— 这三例它都抓得住），不是「将来会空转的断言」。
 *
 * 「将来会空转」只能靠写法避免：正向断言盯**渲染出来的那个东西**
 * （`/<span>问 AI<\/span>/` 而不是 `/问 AI/`），并且先过 code()。这条规矩进不了
 * 静态扫描，所以它写在 helpers/source-text.mjs 的文件头上。
 *
 * # 扫描器是欠近似的
 *
 * 只认 `const NAME = read("…")` 这种最常见的绑定、只认字面量正则。**漏报可以接受，
 * 误报不行** —— 误报会被人加白名单绕过去，白名单一长这条就废了。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { body, code } from "../helpers/source-text.mjs";

const TESTS = fileURLToPath(new URL("../", import.meta.url));

/** 故意断言「注释里写了什么」的地方。每一条都得说清为什么只能正向断言。 */
const COMMENT_ASSERTIONS_ON_PURPOSE = new Set([
  // board-html.ts 的说明里必须纠正「CSP 把出网整个关掉」那句错话（实测 location.href
  // 能逃出去）。负向断言在这里不可用 —— 那份注释正引用着那句原话。
  "reader/reader-board-html.test.mjs:管不住导航",
  "reader/reader-board-html.test.mjs:frame-src",
  "reader/reader-board-html.test.mjs:form-action`? 不在 default-src 的回退链里",
]);

function testFiles() {
  const out = [];
  const pending = [TESTS];
  while (pending.length > 0) {
    const current = pending.pop();
    if (statSync(current).isDirectory()) {
      for (const entry of readdirSync(current)) pending.push(join(current, entry));
    } else if (current.endsWith(".test.mjs")) out.push(current);
  }
  return out.sort();
}

const rel = (file) => file.slice(TESTS.length);
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

test("正向断言不能只被注释或 import 行满足", () => {
  const offenders = [];
  let analysed = 0;
  for (const file of testFiles()) {
    const src = readFileSync(file, "utf8");
    // 先收集「这个变量是读哪个源文件来的」。带 code()/body() 包装的跳过 —— 它们已经剥过了。
    const binds = new Map();
    for (const m of src.matchAll(
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*(stripComments\(|code\(|body\()?\s*(?:read|readSource|readFileSync)\s*\(\s*(?:new URL\(\s*)?["'`]([^"'`]+)["'`]/g,
    )) {
      binds.set(m[1], { rel: m[3], wrapped: Boolean(m[2]) });
    }
    for (const m of src.matchAll(
      /assert\.match\(\s*([A-Za-z_$][\w$]*)\s*,\s*\/((?:\\.|\[[^\]]*\]|[^/\\\n])+)\/([a-z]*)\s*[,)]/g,
    )) {
      const bound = binds.get(m[1]);
      if (!bound || bound.wrapped) continue;
      const target = resolve(dirname(file), bound.rel);
      if (!existsSync(target)) continue;
      let pattern;
      try { pattern = new RegExp(m[2], m[3].replace("g", "")); } catch { continue; }
      const raw = readFileSync(target, "utf8");
      analysed += 1;
      // 整份文件里有、但剥掉注释和 import 行之后没有 → 这条断言永远红不了。
      if (!pattern.test(raw) || pattern.test(body(raw))) continue;
      if (COMMENT_ASSERTIONS_ON_PURPOSE.has(`${rel(file)}:${m[2]}`)) continue;
      const where = pattern.test(code(raw)) ? "只出现在 import/export 行" : "只出现在注释里";
      offenders.push(
        `${rel(file)}:${lineOf(src, m.index)}  assert.match(${m[1]}, /${m[2]}/)  → 在 ${bound.rel} 里${where}`,
      );
    }
  }
  // 扫描器失效时必须红，不能在空集合上恒真 —— 那正是这条门禁要抓的那种假。
  assert.ok(analysed >= 20, `只分析了 ${analysed} 条源码文本断言，扫描器的绑定识别失效了`);
  assert.deepEqual(offenders, [], `这些断言永远红不了：\n  ${offenders.join("\n  ")}`);
});

test("不许用定长窗口切源码 —— 用 region() 的两个锚点", () => {
  const offenders = [];
  for (const file of testFiles()) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/\.indexOf\((?:[^()]|\([^()]*\))*\)\s*\+\s*\d+/g)) {
      offenders.push(`${rel(file)}:${lineOf(src, m.index)}  ${m[0].replace(/\s+/g, " ")}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "定长窗口会越过函数边界，把邻居的代码当成被守对象（实测：closeAssistant 那条 +700 的"
      + "窗口里含着 changeWorkspace 的同一行，删掉被守的那行、1953 条全绿）。改用 "
      + `helpers/source-text.mjs 的 region(src, 起点锚点, 终点锚点)：\n  ${offenders.join("\n  ")}`,
  );
});
