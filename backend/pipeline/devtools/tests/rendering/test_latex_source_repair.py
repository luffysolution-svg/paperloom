"""OCR 修补不许把好写法改坏。

这条规则原本是无条件的 `\\\\{2,}(?=[A-Za-z]) → \\\\`,意图是修 OCR 把命令的反斜杠写重
（`\\\\mu` → `\\mu`）。但矩阵、cases、aligned、substack 里的 `\\\\` 是换行符,后面直接跟
字母时照样被合并,于是

    \\begin{cases} a & x>0 \\\\b & x<0 \\end{cases}  →  ... \\b ...  →  unknown command: \\b

整块渲染失败。和上游把 `\\` 与 `E` 拆开造成 `unknown command: \\E` 是同一种故障,方向
相反:那次是别人拆开,这次是我们自己合并。

它能潜伏下来,是因为覆盖清单里的矩阵用例恰好写成 `\\\\ `（带空格）。所以这里的用例
一律**不带空格**——真实 OCR 产物就是这样。
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from devtools.tests.rendering.mitex_probe import TYPST_BIN  # noqa: E402
from devtools.tests.rendering.mitex_probe import compile_pipeline  # noqa: E402
from retainpdf_pipeline.foundation.shared.latex_source_repair import (  # noqa: E402
    collapse_doubled_command_backslashes,
)
from retainpdf_pipeline.services.pipeline_shared.direct_typst_math import (  # noqa: E402
    normalize_direct_typst_translation,
)

ROW_SEPARATOR_CASES = [
    r"\begin{pmatrix} a \\b \end{pmatrix}",
    r"\begin{bmatrix} x_1 \\x_2 \end{bmatrix}",
    r"\begin{cases} a & x>0 \\b & x<0 \end{cases}",
    r"\begin{aligned} a &= b \\c &= d \end{aligned}",
    r"\substack{a\\b}",
]


@pytest.mark.parametrize("expr", ROW_SEPARATOR_CASES, ids=lambda s: s[:26])
def test_row_separators_survive(expr: str) -> None:
    assert collapse_doubled_command_backslashes(expr) == expr, "换行符被当成写重的反斜杠合并了"


def test_a_doubled_command_backslash_is_still_repaired() -> None:
    """别把这条规则修没了——它本来要解决的问题仍然存在。"""
    assert collapse_doubled_command_backslashes(r"\\mu \\mathrm{m}") == r"\mu \mathrm{m}"
    assert collapse_doubled_command_backslashes(r"x + \\alpha") == r"x + \alpha"


def test_single_letters_are_not_treated_as_commands() -> None:
    """`\\\\b` 里的 b 基本不可能是命令名,更可能是换行后的变量。

    即便没有 \\begin 上下文也不合并——两道约束各自独立,少一道就漏。
    """
    assert collapse_doubled_command_backslashes(r"a \\b c") == r"a \\b c"


def test_translation_side_uses_the_same_rule() -> None:
    """同一条规则曾经在渲染侧和翻译侧各有一份拷贝。

    两份拷贝意味着坏文本在入缓存前就已经产生,修一处不够。
    """
    text = r"矩阵 $\begin{pmatrix} a \\b \end{pmatrix}$ 如上。"
    assert r"\\b" in normalize_direct_typst_translation(text), "翻译侧仍在合并换行符"


@pytest.mark.skipif(not TYPST_BIN, reason="没有可用的 typst 二进制")
@pytest.mark.parametrize("expr", ROW_SEPARATOR_CASES, ids=lambda s: s[:26])
def test_row_separators_really_compile(expr: str) -> None:
    ok, error = compile_pipeline(expr)
    assert ok, f"{expr}\n{error}"
