"""跨栏 / 跨页续接组：模型只翻整段，程序切回各框。

此前续接组要求模型按原来的分界逐框返回译文。英文在句中断栏时中文语序对不上，模型会把
跨分界的半句挪进前一块翻完，再把后一块整个原样交回英文，而检查只看拼起来的整段，放过去了：

- 20261014022104-4120a5 p001-b0012 / b0013（跨栏）：b0013 整块英文
- 20261013010838-bf3f91 p046-b008 / p047-b002（跨页）：p047-b002 整块英文

同时修拼组时的 OCR 断词：b0012 末尾已被 OCR 补成 "calculations."，b0013 开头仍留着 "tions"。
"""

from __future__ import annotations

import re

from retainpdf_translation.core.payload.parts.apply import apply_group_translated_entry
from retainpdf_translation.core.payload.parts.units import _build_group_translation_unit
from retainpdf_translation.core.payload.parts.units import join_member_sources

HAN_RE = re.compile(r"[一-鿿]")

B012_SOURCE = (
    "Being an antiaromatic system, the chemistry of cyclobutadiene has been of great interest for both "
    "experimental [1] and theoretical chemists [2-4]. In the absence of reliable experimental data it is "
    "necessary to carry out high-level ab initio calculations."
)
B013_SOURCE = (
    "tions in order to achieve a proper description of its chemical properties. For example, quantitative "
    "interpretation of the kinetics of automerization, or of the splitting of the ground vibrational state, "
    "requires knowledge of an accurate value for the automerization barrier."
)
B012_B013_TRANSLATION = (
    "作为一种反芳香体系，环丁二烯的化学性质一直受到实验化学家[1]和理论化学家[2-4]的广泛关注。"
    "在缺乏可靠实验数据的情况下，为了恰当描述其化学性质，有必要开展高水平的从头算（ab initio）计算。"
    "例如，要定量解释自异构化动力学或基态振动能级的劈裂，就需要知道自异构化能垒的准确数值。"
)

P046_B008_SOURCE = (
    "The next major advance in DFT was the introduction of gradient-corrected functionals in the mid-1980s, "
    "which Becke found to give accurate dissociation energies. Also in 1988, analytic gradients were "
    "implemented in DFT, greatly facilitating calculation of equilibrium geometries. The 1989 DFT book by "
    "Parr and Yang helped draw the attention of quantum"
)
P047_B002_SOURCE = (
    "chemists to DFT. In 1993, provision for DF calculations was added to the popular program Gaussian. "
    "In the mid-1990s molecular DFT calculations experienced explosive growth."
)
P046_P047_TRANSLATION = (
    "DFT 发展的下一个重要进展是在 20 世纪 80 年代中期引入了梯度修正泛函，Becke 发现它们能给出准确的解离能。"
    "同样在 1988 年，DFT 中实现了解析梯度，这极大地便利了平衡几何构型的计算。"
    "1989 年 Parr 和 Yang 出版的 DFT 专著促使量子化学家开始关注 DFT。"
    "1993 年，流行程序 Gaussian 中加入了密度泛函计算功能。20 世纪 90 年代中期，分子 DFT 计算经历了爆发式增长。"
)


def _member(item_id: str, source: str, *, page_idx: int = 0) -> dict:
    return {
        "item_id": item_id,
        "page_idx": page_idx,
        "math_mode": "direct_typst",
        "should_translate": True,
        "continuation_group": "cg-test",
        "protected_source_text": source,
        "source_text": source,
        "formula_map": [],
        "protected_map": [],
    }


def test_join_drops_ocr_duplicated_word_tail_and_its_period() -> None:
    joined = join_member_sources([B012_SOURCE, B013_SOURCE])

    assert "ab initio calculations in order to achieve a proper description" in joined
    assert "tions" not in joined.split()
    assert "calculations." not in joined


def test_join_attaches_after_line_end_hyphen_without_space() -> None:
    # 20261014013934-0427ec p005-b008：复合词在栏尾断开。
    assert join_member_sources(["correction with SF-EOM-", "CCSD(fT) and SF-EOM-CCSD"]) == (
        "correction with SF-EOM-CCSD(fT) and SF-EOM-CCSD"
    )


def test_join_leaves_real_words_alone() -> None:
    assert join_member_sources([P046_B008_SOURCE, P047_B002_SOURCE]).endswith(
        "attention of quantum chemists to DFT. In 1993, provision for DF calculations was added to the "
        "popular program Gaussian. In the mid-1990s molecular DFT calculations experienced explosive growth."
    )
    assert join_member_sources(["This is another.", "other thing"]) == "This is another. other thing"
    assert join_member_sources(["the energy", "gy is"]) == "the energy gy is"


def test_group_unit_sends_the_repaired_paragraph() -> None:
    unit = _build_group_translation_unit("__cg__:cg-test", [_member("p001-b012", B012_SOURCE), _member("p001-b013", B013_SOURCE)])

    assert unit is not None
    assert "calculations in order to achieve" in unit["protected_source_text"]
    # 切回各框按各自原文的长度算，成员原文不动。
    assert [member["protected_source_text"] for member in unit["translation_unit_members"]] == [B012_SOURCE, B013_SOURCE]


def _assert_every_box_is_chinese(items: list[dict], translation: str) -> None:
    texts = [item["translated_text"] for item in items]
    assert re.sub(r"\s+", "", "".join(texts)) == re.sub(r"\s+", "", translation)
    for item, text in zip(items, texts):
        assert text != item["source_text"], item["item_id"]
        assert len(HAN_RE.findall(text)) >= 10, (item["item_id"], text)


def test_real_cross_column_group_fills_both_boxes_with_chinese() -> None:
    items = [_member("p001-b012", B012_SOURCE), _member("p001-b013", B013_SOURCE)]

    apply_group_translated_entry(items, {"decision": "translate", "translated_text": B012_B013_TRANSLATION})

    _assert_every_box_is_chinese(items, B012_B013_TRANSLATION)


def test_real_cross_page_group_fills_both_boxes_with_chinese() -> None:
    items = [_member("p046-b008", P046_B008_SOURCE, page_idx=45), _member("p047-b002", P047_B002_SOURCE, page_idx=46)]

    apply_group_translated_entry(items, {"decision": "translate", "translated_text": P046_P047_TRANSLATION})

    _assert_every_box_is_chinese(items, P046_P047_TRANSLATION)
    # 后一块的原文以 "In 1993…" 两句为主，切到它那边的应该是这两句的译文。
    assert "1993" in items[1]["translated_text"]
