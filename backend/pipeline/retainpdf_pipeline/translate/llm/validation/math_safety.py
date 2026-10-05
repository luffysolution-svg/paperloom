from __future__ import annotations

import collections
import re

from retainpdf_pipeline.foundation.shared.latex_commands import command_aliases
from retainpdf_pipeline.foundation.shared.latex_commands import expected_to_drift


UNESCAPED_INLINE_DOLLAR_RE = re.compile(r"(?<!\\)\$")
LATEX_COMMAND_RE = re.compile(r"\\([A-Za-z]+)")

# 什么算丢失、哪些拼法等价——规则在 foundation/shared/latex_commands.json，这里只消费。
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


def has_balanced_inline_math_delimiters(text: str) -> bool:
    return len(UNESCAPED_INLINE_DOLLAR_RE.findall(text or "")) % 2 == 0


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
    "UNESCAPED_INLINE_DOLLAR_RE",
    "dropped_latex_commands",
    "has_balanced_inline_math_delimiters",
]
