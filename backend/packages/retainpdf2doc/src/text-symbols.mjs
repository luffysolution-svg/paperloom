/**
 * 把 MathJax 不认识的**文本模式**符号命令换成对应的 Unicode 字符。
 *
 * 这些命令（`\AA`、`\L`、`\o`…）在 LaTeX 里只在文本模式有定义，MathJax 的 TeX 输入
 * 不实现它们。碰上就抛 `MathJax did not resolve LaTeX command \AA`，那一处只能退回
 * 显示原始 LaTeX。
 *
 * 全仓 3579 个公式实测:9 个转换失败，其中 **8 个是 `\AA`**（埃，Å），1 个是 `\L`（Ł）。
 * 加上这张表之后全部通过。
 *
 * **这不是那张 47 条符号表的复活。** 区别在于兜底行为:
 *   - 旧的 Python 转换器把这张表当成**唯一**机制，表里没有的命令就剥掉反斜杠当字母
 *     印出去——`\chi` 变成 `chi`，而且没人知道。
 *   - 这里的主力是 MathJax（整个 TeX 解析器），这张表只补它在**文本模式符号**上的
 *     那个已知缺口。表里没有、MathJax 也不认的命令会**响亮地失败**
 *     （`assertResolvedPresentationMathMl` 主动拒绝未解析命令），调用方保留原始
 *     LaTeX 文本并报出来。静默印错是不可能的。
 *
 * 所以这张表不全也没关系:不全只意味着某个符号退回显示源码并被报出来，不会变成乱码。
 */

// 只收 MathJax 确实拒绝的。它认得的（`\S`、`\textdegree`、`\micro`…）不要放进来——
// 覆盖掉它自己的处理只会引入新的偏差。
const TEXT_MODE_SYMBOLS = {
  AA: "Å", aa: "å",
  L: "Ł", l: "ł",
  O: "Ø", o: "ø",
  ss: "ß",
  AE: "Æ", ae: "æ",
  OE: "Œ", oe: "œ",
  DH: "Ð", dh: "ð",
  TH: "Þ", th: "þ",
  pounds: "£",
  copyright: "©",
  dag: "†", ddag: "‡",
  P: "¶",
  angstrom: "Å",
};

// `(?![A-Za-z])`:后面还跟着字母就不是这个命令。它同时解决两件事——
//   1. `\L` 不会把 `\Lambda` 的头吃掉（旧版 `\le` 吃掉 `\left` 就是这类错误）；
//   2. 短名是长名前缀时（`o` 之于 `oe`）不会截胡:`o` 先匹配上，但后顾看到 `e` 是
//      字母就回溯，换 `oe`。
// 所以**不需要**按长度排序。命令名按定义只含字母，这条恒成立。
const SYMBOL_RE = new RegExp(
  `\\\\(${Object.keys(TEXT_MODE_SYMBOLS).join("|")})(?![A-Za-z])`,
  "g",
);

export function normalizeTextModeSymbols(latex) {
  const source = `${latex ?? ""}`;
  if (!source.includes("\\")) return source;
  return source.replace(SYMBOL_RE, (_match, name) => TEXT_MODE_SYMBOLS[name]);
}

export { TEXT_MODE_SYMBOLS };
