/** 对「源码文本」做断言时共用的四件套。
 *
 * # 为什么要有这个文件
 *
 * 这个仓库在同一个形状上栽过**八次**：断言的那个串在注释或 import 行里也出现。
 * 解释一处错误时往往要引用那句错话（`useState(960)`、`.reader-notes-count`、
 * `CSP 把出网整个关掉`、`问 AI`、`只读`…），于是正向断言被自己的说明满足、负向断言
 * 被自己的引文命中 —— 两种都让门禁再也红不了。
 *
 * 原来 `code()` 只住在 `reader-page-width-settle.test.mjs` 一个文件里。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** 剥掉注释。凡是「这段代码里（不）该出现 X」的断言一律先过它。
 *
 * `//` 前面要求不是 `:` 或 `\`，否则 `https://…` 和字符串里的转义会被当成注释开头。 */
export const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:\\])\/\/.*$/gm, "$1");

/** 剥注释**再剥 import/export 行**。查「这个标识符真的被用上了」时用它 ——
 * `/resolveReaderWidthCommit\(/` 和 `FileText` 都被 import 行满足过。 */
export const body = (src) => code(src)
  .split("\n")
  .filter((line) => !/^\s*(?:import|export)\b/.test(line))
  .join("\n");

/** 读一份源文件，路径相对调用方的 `import.meta.url`。 */
export const readSource = (rel, base) => readFileSync(fileURLToPath(new URL(rel, base)), "utf8");

/** 取 `[起点锚点, 终点锚点)` 这一段，而不是「从锚点往后数 N 个字符」。
 *
 * 定长窗口是确诊过的假门禁：`APP.indexOf("const closeAssistant = useCallback") + 700`
 * 的窗口里同时含着**下一个** useCallback 里的 `setAssistantPdfPane(null)`，于是删掉
 * 被守的那一行，1953 条测试全绿。
 *
 * 另外 `indexOf` 找不到时返回 -1，`slice(-1, …)` 会悄悄给出空串或最后一个字符 ——
 * 正向断言以一个看不懂的理由红，负向断言直接变绿。所以这里三件事都显式断言：
 * 起点在、起点唯一、终点在。
 */
export function region(src, startAnchor, endAnchor, label = "") {
  const where = label ? ` (${label})` : "";
  const start = src.indexOf(startAnchor);
  assert.ok(start >= 0, `找不到起点锚点 ${JSON.stringify(startAnchor)}${where}`);
  assert.equal(src.indexOf(startAnchor, start + 1), -1,
    `起点锚点 ${JSON.stringify(startAnchor)} 出现了多次，窗口不唯一${where}`);
  const rest = src.slice(start);
  const tail = rest.slice(1);
  const offset = typeof endAnchor === "string" ? tail.indexOf(endAnchor) : tail.search(endAnchor);
  assert.ok(offset >= 0, `找不到终点锚点 ${endAnchor}${where}`);
  return rest.slice(0, offset + 1);
}

/** 一份源码里所有 import / export-from / 动态 import() / require() 的模块说明符。
 *
 * test-layout 与 reader 的两条包边界门禁原来各抄一份同样的正则，收到这里保证三处认的是
 * 同一种写法。 */
export function importSpecifiers(source) {
  const pattern = /\b(?:import\s*(?:\(|(?:type\s+)?(?:[^"'();]*?\s+from\s+)?)|export\s+(?:type\s+)?[^"';]*?\s+from\s+|require\s*\()\s*["']([^"']+)["']/g;
  return Array.from(source.matchAll(pattern), (match) => match[1]);
}
