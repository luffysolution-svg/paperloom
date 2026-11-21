"""不用渲染器就能判断的公式问题：花括号不配对、翻译时丢了 LaTeX 命令。"""

from __future__ import annotations

import collections
import re

from retainpdf_math.registry import command_aliases
from retainpdf_math.registry import expected_to_drift
from retainpdf_math.spans import compact_tex
from retainpdf_math.spans import math_spans


LATEX_COMMAND_RE = re.compile(r"\\([A-Za-z]+)")

# 什么算丢失、哪些拼法等价——规则在 latex_commands.json（registry.py），这里只消费。
# 第一版把这两张表手写在本文件里，于是和提示词的「不许替换」清单对不上：`\pmb` 在
# 这里被当成 `\mathbf` 的等价拼法折叠掉，而提示词明令禁止那个替换。登记表的一致性
# 闸门现在盯着这类矛盾。
EXPECTED_TO_DRIFT = expected_to_drift()
COMMAND_ALIASES = command_aliases()


def _semantic_commands(text: str) -> collections.Counter:
    return collections.Counter(
        COMMAND_ALIASES.get(name, name)
        for name in LATEX_COMMAND_RE.findall(text or "")
        if name not in EXPECTED_TO_DRIFT
    )


def _braces_balanced(tex: str) -> bool:
    depth = 0
    index = 0
    while index < len(tex):
        char = tex[index]
        if char == "\\":
            index += 2  # \{ \} \\ 都是转义，不算括号
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth < 0:
                return False
        index += 1
    return depth == 0


def unbalanced_brace_math_spans(source_text: str, translated_text: str) -> list[str]:
    """译文里花括号不配对、而原文里没有同样写法的公式。

    `$` 成对不代表公式能渲染：真实例子 `$\\rho_{s}(\\mathbf{r}}) = \\rho_{0}(\\mathbf{r})$` 多了一个 `}`，
    MathJax 解析失败，PDF 里只能把 LaTeX 原样当文字排出来。原文本来就不配对的（OCR 带来的）不算，
    免得重试也修不好。
    """
    source_unbalanced = {compact_tex(span) for span in math_spans(source_text) if not _braces_balanced(span)}
    return [
        span
        for span in math_spans(translated_text)
        if not _braces_balanced(span) and compact_tex(span) not in source_unbalanced
    ]


def dropped_latex_commands(source_text: str, translated_text: str) -> dict[str, int]:
    """原文里有、译文里没了的 LaTeX 命令，按丢失个数计。

    为什么需要这条：direct_typst 模式下模型直接处理带公式的整段文本——它必须
    改动公式（原文 OCR 没有 `$...$` 定界符，要由模型识别并包裹），而一旦动手，
    就会顺带"修"一些本来没坏的东西。实测一批真实产物：原文 998 个命令，译文
    只保留 712 个，`\\mathsf` 被换成 `\\delta`、`\\mathbb` 被换成 `\\mathrm`、
    `\\cdot` 直接消失。

    这类损失是静默的：译文读起来通顺，公式也能渲染，只是和原文不是一回事。
    没有这条检查就看不见它。

    只数**语义**命令。第一版把等价改写也算进来，于是虚报得离谱：一个真实任务
    报「158 条含公式、79 条丢命令（50%）」，其中 140 次是 `A ^ { \prime }` 写成
    `A\'`——同一个数学对象。拿这个数字当依据，会让人去修一个不存在的问题。
    所以等价写法要么进 EXPECTED_TO_DRIFT，要么进 COMMAND_ALIASES 折叠。

    先作为 warning 记录而不是 error：先积累数据，再决定要不要升级成硬错误。
    """
    source = _semantic_commands(source_text)
    translated = _semantic_commands(translated_text)
    return {name: count for name, count in (source - translated).items() if count > 0}


__all__ = [
    "COMMAND_ALIASES",
    "EXPECTED_TO_DRIFT",
    "LATEX_COMMAND_RE",
    "dropped_latex_commands",
    "unbalanced_brace_math_spans",
]
