"""摘要合组切回各框时，切点必须落在句末（有标签时对齐标签）。

设计不变：摘要的几个框一次翻译、再按原来的几个框分开填，框不合并、框不变。
出问题的只是切点：旧逻辑按源文长度比例找锚点，只在 ±36 token 窗口里挑，任何
标点（含逗号）只有 −2 分奖励，于是常切在句中甚至词中。

真实样本（data/jobs/20261006123428-1ed40e 及重跑 c5fe8e / 7c89c4 / 91ceaf 的
page-001）：p001-b008 源文以 "…hospital in Tanzania." 结尾，译文却以
"…一家三级公立教" 结尾；p001-b009 以 "学医院——Jakaya…" 开头、把 "结果：…" 吞进
来；p001-b010 以 "，女性约占…" 开头。夹具只保留切分器读的字段。
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from retainpdf_translation.core.payload.parts.apply import apply_group_translated_entry
from retainpdf_translation.core.payload.parts.group_split import split_group_protected_translation

FIXTURE = Path(__file__).parent / "fixtures" / "abstract_group_split_1ed40e.json"
SENTENCE_END_RE = re.compile(r"[。！？]$")
SOURCE_SENTENCE_END_RE = re.compile(r"[.!?]$")
EXPECTED_LABELS = {"p001-b008": "背景：", "p001-b009": "方法：", "p001-b010": "结果："}


def _load_fixture() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _group_items(fixture: dict) -> list[dict]:
    group_id = "__cg__:abstract:p001-b008"
    return [
        {
            "item_id": member["item_id"],
            "page_idx": 0,
            "math_mode": "direct_typst",
            "should_translate": True,
            "translation_unit_id": group_id,
            "translation_group_kind": "abstract",
            "translation_group_strategy": "aggregate_geometry",
            "protected_source_text": member["protected_source_text"],
            "source_text": member["protected_source_text"],
            "formula_map": [],
            "protected_map": [],
        }
        for member in fixture["members"]
    ]


def _assert_member_chunks(chunks: list[str], fixture: dict) -> None:
    group_text = fixture["group_protected_translated_text"]
    assert re.sub(r"\s+", "", "".join(chunks)) == re.sub(r"\s+", "", group_text)
    for member, chunk in zip(fixture["members"], chunks):
        assert chunk.startswith(EXPECTED_LABELS[member["item_id"]]), (member["item_id"], chunk[:20])
        if SOURCE_SENTENCE_END_RE.search(member["protected_source_text"].strip()):
            assert SENTENCE_END_RE.search(chunk), (member["item_id"], chunk[-20:])


def test_real_abstract_group_splits_at_member_labels_and_sentence_ends() -> None:
    fixture = _load_fixture()
    # 夹具里留着旧切点，确认它确实是坏的（证据本身没被裁坏）。
    old_chunks = [member["old_protected_translated_text"] for member in fixture["members"]]
    assert old_chunks[0].endswith("一家三级公立教")

    chunks = split_group_protected_translation(fixture["group_protected_translated_text"], _group_items(fixture))

    _assert_member_chunks(chunks, fixture)


def test_apply_group_entry_fills_each_original_box_with_its_own_section() -> None:
    fixture = _load_fixture()
    items = _group_items(fixture)

    apply_group_translated_entry(
        items,
        {"decision": "translate", "translated_text": fixture["group_protected_translated_text"]},
    )

    _assert_member_chunks([item["translated_text"] for item in items], fixture)
    # 框不合并：每个成员仍是自己的一份，整组译文只作为组级字段保留。
    assert len({item["translated_text"] for item in items}) == len(items)
    assert all(
        item["translation_unit_translated_text"] == fixture["group_protected_translated_text"] for item in items
    )


def test_unlabeled_complete_members_split_only_after_sentence_ends() -> None:
    items = [
        {"protected_source_text": "The first box states the problem in a single short sentence."},
        {
            "protected_source_text": (
                "The second box is much longer, describes the method in detail, lists the data sources, "
                "and explains how the comparison was carried out across all of the settings."
            )
        },
        {"protected_source_text": "The third box closes with the conclusion."},
    ]
    translated = (
        "第一个框用一句很短的话说明了问题，并补充了一点背景，说明为什么值得研究这个问题。"
        "第二个框详细描述了方法，列出了数据来源。并解释了如何在所有设置下进行比较，"
        "比较时控制了相同的计算预算。第三个框给出结论。"
    )

    chunks = split_group_protected_translation(translated, items)

    assert "".join(chunks) == translated
    assert all(SENTENCE_END_RE.search(chunk) for chunk in chunks), chunks
