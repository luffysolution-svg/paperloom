# retainpdf2doc

RetainPDF 排版规格 → 保留排版的 Word 文档，公式是**原生可编辑的 Office Math**。

```bash
retainpdf2doc <spec.json> <output.docx>
```

正常不直接调它——`retainpdf-pipeline layout-docx` 会算好规格再起它。

## 这条缝为什么在这里

排版规格（页面尺寸、每个块的位置、收敛后的字号和基线间距）由 Python 侧的
`retainpdf_pipeline` 算，那是几千行逻辑，搬不动也不该搬。这个包只管「规格 → 文档」。
规格的形状见 `src/spec.mjs`。

## 为什么不继续用 Python

公式。Python 那版用 python-docx 自己写 OMML，转换器带一张 **47 条**的符号表，不在表里
的命令直接剥掉反斜杠当字母印出去。实测：

| | 旧版（python-docx） | 现在 |
|---|---|---|
| 全仓带命令的公式中命令名泄漏 | 625 / 1933（**32.3%**） | 0 |
| 同一个真实 job（91 个公式） | 58 个泄漏 | 0 |
| `\mathbf{2a}` | `mathbf2a` | `2a` + 粗体样式 |
| `\left(\frac{a}{b}\right)` | `≤ft(abright)` | `m:d` + `m:f` |
| `\sum_{i=1}^{n}` | `sumi=1^n` | `m:nary` |

这边走 LaTeX → MathJax → Presentation MathML → OMML（vendor 自 VisualTeX，MIT，
见 NOTICE.md），整个 TeX 解析器都在，没有「表里没有」这回事。

顺带把文本框从 VML 换成了 DrawingML：VML 是 Office 2007 前的遗留格式，而且**不裁切**
——字排多一点就糊到相邻块上。

## 构建

```bash
npm run build --workspace retainpdf2doc   # 产出 dist/cli.mjs
npm test --workspace retainpdf2doc
```

`dist/` 不在版本库里。Python 侧找不到它时会直接报出这条命令，不会让人对着非零退出码猜。

## 覆盖面

全仓 3579 个公式逐个跑过：**3579 个全部转成原生 OMML**（每个约 0.09ms）。

补到 100% 之前差 9 个，8 个是 `\AA`（埃）、1 个是 `\L`（Ł）——都是**文本模式**符号
命令，MathJax 的 TeX 输入不实现。`src/text-symbols.mjs` 把它们换成 Unicode。

那张表**不是**旧版 47 条符号表的复活，区别在兜底：表里没有、MathJax 也不认的命令会
**响亮失败**（`assertResolvedPresentationMathMl` 主动拒绝未解析命令），调用方保留原始
LaTeX 文本并在 stderr 报出来。静默印错是不可能的。

## 数学字体

公式用 **Latin Modern Math**，而且**随文档嵌入**（`assets/fonts/`，GUST 协议允许再分发）。

不用 Cambria Math 是因为它只在 Windows 版 Office 自带——macOS 的 Word、LibreOffice、
WPS 上不一定有，缺了 Word 会拿没有数学字形的字体替换，积分号、求和号、可伸缩括号
直接变豆腐块。嵌入之后跟机器上装没装无关。

代价是固定 **+0.49 MB**（压缩后）。5 页的文档 +35%，29 页的 +6%，文档越大占比越小。
