/**
 * LaTeX → 原生 Office Math（OMML），走 vendor 进来的 VisualTeX 公式链路。
 *
 * 这是换掉 Python 那版手写转换器的原因。旧版有一张 **47 条**的符号表，不在表里的命令
 * 直接剥掉反斜杠当字母印出去。实测全仓 1933 个带命令的公式里，**625 个（32.3%）**会
 * 这样：`\mathbf{2a}` 显示成 `mathbf2a`（369 次）、`\chi` 成 `chi`、`\prime` 成
 * `prime`；还有 `\left(` 被符号表里的 `\le` 匹配成 `≤ft(`。
 *
 * vendor 的这条链路是 LaTeX → MathJax → Presentation MathML → OMML，等于把整个 TeX
 * 解析器接了进来，没有「表里没有」这回事。
 */

import { latexLinesToOmml } from "../vendor/visualtex/core/formula/latexToOmml.ts";
import { formulaLetterPrimaryFontName } from "../vendor/visualtex/core/formula/fontPreferences.ts";
import { nodeXmlRuntime } from "../vendor/visualtex/core/nodeXmlRuntime.ts";
import { normalizeTextModeSymbols } from "./text-symbols.mjs";

/**
 * 公式用 Latin Modern Math，而且**随文档嵌入**（见 index.mjs）。
 *
 * 不用 Cambria Math 的原因:它是 Windows 版 Office 自带的，macOS 的 Word、
 * LibreOffice、WPS 上不一定有——缺了 Word 会拿一个没有数学字形的字体去替换，
 * 积分号、求和号、可伸缩括号直接变成豆腐块。嵌入之后跟机器上装没装无关。
 *
 * Latin Modern Math 是 Computer Modern 的 OpenType 数学版，也就是 LaTeX 排出来的
 * 那个样子——对着一篇论文的译文来说，这比 Cambria 更贴原文观感。
 */
const FORMULA_LETTER_FONT = "latin-modern";

export const FORMULA_FONT_NAME = formulaLetterPrimaryFontName(FORMULA_LETTER_FONT);

// 同一篇文档里公式高度重复（`\mathbf{2a}` 一篇里出现 369 次）。MathJax 每次解析约
// 0.46ms，缓存是白捡的。
const cache = new Map();
const CACHE_LIMIT = 4096;
const CACHE_SEPARATOR = "";

export class FormulaConversionError extends Error {
  constructor(latex, cause) {
    super(`公式转换失败：${latex}`);
    this.name = "FormulaConversionError";
    this.latex = latex;
    this.cause = cause;
  }
}

/**
 * 单个公式的 OMML 片段。
 *
 * 没有行内/行间的区分:实测这一层对两种模式产出完全相同（`\frac`、`\sum`、`\int`
 * 都验过），区分发生在上游的文档组装层（`m:oMathPara` 包装）。我们的每个公式都待在
 * 一个绝对定位的文本框里、位置由排版层给定，用不到那一层，所以不留这个参数——
 * 留着只会让人以为它有用。
 */
export function latexToOmml(latex) {
  const source = `${latex ?? ""}`.trim();
  if (!source) return "";
  const cached = cache.get(source);
  if (cached !== undefined) return cached;

  // MathJax 的 TeX 输入不实现文本模式符号命令（`\AA`、`\L`…），先换成 Unicode。
  // 见 text-symbols.mjs——那张表只补这一个缺口，不是兜底机制。
  const normalized = normalizeTextModeSymbols(source);

  let omml;
  try {
    omml = latexLinesToOmml(
      [normalized], "inline", "raw",
      { formulaLetterFont: FORMULA_LETTER_FONT },
      nodeXmlRuntime,
    );
  } catch (cause) {
    throw new FormulaConversionError(source, cause);
  }
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(source, omml);
  return omml;
}

export function clearFormulaCache() {
  cache.clear();
}
