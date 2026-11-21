"""RetainPDF 的公式处理：LaTeX 命令登记表、不用渲染器就能判断的检查、问排版引擎能不能渲染。

- registry      LaTeX 命令登记表（latex_commands.json）：哪些命令渲染器支持、哪些等价、哪些会被模型改写
- spans         从文本里找公式（`$...$` / `$$...$$`）
- checks        花括号配对、翻译时丢没丢 LaTeX 命令
- direct_typst  direct_typst 译文里 `$...$` 的机械格式规整、`$` 是否成对、渲染不了的命令该换成什么
- render_check  交给排版引擎同一套 MathJax 试渲染（常驻 Node 子进程；不可用时自动跳过）
"""

from retainpdf_math.checks import dropped_latex_commands
from retainpdf_math.checks import unbalanced_brace_math_spans
from retainpdf_math.render_check import RenderResult
from retainpdf_math.render_check import unrenderable_formulas
from retainpdf_math.spans import has_balanced_inline_math_delimiters
from retainpdf_math.spans import math_spans

__all__ = [
    "RenderResult",
    "dropped_latex_commands",
    "has_balanced_inline_math_delimiters",
    "math_spans",
    "unbalanced_brace_math_spans",
    "unrenderable_formulas",
]
