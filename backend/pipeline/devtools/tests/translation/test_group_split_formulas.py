"""续接组一次翻译、按原来的几个框切开时，切点不能落在公式里，也尽量不落在词中。

公式在 direct_typst 模式下以 `$…$` 原样写在译文里，占位符模式下是 <f1-abc/> /
[[FORMULA_n]]。切分器把它们当成不可拆的整体；`$` 不成对时认不出公式边界，
整段不切。
"""

from __future__ import annotations

import re

import pytest

from retainpdf_translation.core.payload.parts.group_split import split_group_protected_translation

INLINE_MATH_RE = re.compile(r"(?<!\\)\$(?:\\.|[^$\\\n])+(?<!\\)\$")

FORMULA_TEXT = (
    "我们将能量定义为 $E = \\langle \\psi | \\hat{H} | \\psi \\rangle / \\langle \\psi | \\psi \\rangle$，"
    "其中 $\\hat{H}$ 为哈密顿算符，$\\psi$ 为试探波函数，满足 $\\int |\\psi|^2 d\\tau = 1$ 的归一化条件。"
    "由变分原理可知 $E \\geq E_0$，等号仅在 $\\psi$ 为基态波函数时成立。"
)


def _members(left_words: int, right_words: int, *, math_mode: str = "direct_typst") -> list[dict]:
    return [
        {"protected_source_text": "word " * left_words, "math_mode": math_mode},
        {"protected_source_text": "word " * right_words, "math_mode": math_mode},
    ]


def _compact(text: str) -> str:
    return re.sub(r"\s+", "", text)


@pytest.mark.parametrize("left_words", range(1, 40))
def test_inline_formulas_land_whole_in_one_box_at_every_ratio(left_words: int) -> None:
    chunks = split_group_protected_translation(FORMULA_TEXT, _members(left_words, 40 - left_words))

    assert _compact("".join(chunks)) == _compact(FORMULA_TEXT)
    for formula in INLINE_MATH_RE.findall(FORMULA_TEXT):
        assert sum(formula in chunk for chunk in chunks) >= 1, formula
    for chunk in chunks:
        assert chunk.count("$") % 2 == 0, chunk


def test_placeholder_formulas_stay_whole() -> None:
    text = "我们将能量定义为 <f1-abc/>，其中 <f2-x9z/> 为哈密顿算符，满足 [[FORMULA_3]] 的归一化条件。"
    for left_words in range(1, 20):
        chunks = split_group_protected_translation(text, _members(left_words, 20 - left_words, math_mode="placeholder"))
        joined = "".join(chunks)
        for token in ("<f1-abc/>", "<f2-x9z/>", "[[FORMULA_3]]"):
            assert token in joined
            assert sum(token in chunk for chunk in chunks) == 1


def test_unbalanced_dollar_keeps_whole_text_in_first_box() -> None:
    text = "我们定义能量为 $E = \\langle \\psi | \\hat{H} | \\psi \\rangle 其中算符作用在试探波函数上满足归一化条件并且给出变分上界。"

    chunks = split_group_protected_translation(text, _members(20, 20))

    assert chunks == [text, ""]


def test_dollar_is_plain_text_outside_direct_typst() -> None:
    text = "该项目耗资 $5 百万，其中大部分用于设备采购，其余用于人员培训和后续维护工作。"

    chunks = split_group_protected_translation(text, _members(10, 10, math_mode="placeholder"))

    assert all(chunks)
    assert "".join(chunks) == text


def test_mid_sentence_split_prefers_punctuation_and_never_starts_with_it() -> None:
    # 真实样本 20261014022104-4120a5 p001-b0012/b0013 的整段译文：左框源文停在半句。
    text = (
        "在缺乏可靠实验数据的情况下，为了恰当描述其化学性质，有必要开展高水平的从头算（ab initio）计算。"
        "例如，要定量解释自异构化动力学或基态振动能级的劈裂，就需要知道自异构化能垒的准确数值。"
    )
    landed_on_punctuation = 0
    for left_words in range(3, 30):
        chunks = split_group_protected_translation(text, _members(left_words, 32 - left_words))
        assert _compact("".join(chunks)) == _compact(text)
        assert all(chunks), chunks
        assert chunks[1][0] not in "，。、；：！？）】」』,.;:!?)]}", chunks
        landed_on_punctuation += chunks[0][-1] in "，。、；：！？"
    # 标点离比例切点只差几个字时切在标点后；两个标点隔得远（一个分句十几个字）时，
    # 照比例切在字与字之间——中文跨栏本来就可以断在任意两字之间，框的容量更要紧。
    assert landed_on_punctuation >= 13
