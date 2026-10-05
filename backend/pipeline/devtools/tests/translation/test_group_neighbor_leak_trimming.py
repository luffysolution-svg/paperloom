"""跨页群组的译文也要裁掉泄漏进来的后文公式。

邻段泄漏裁剪原本只接在 apply_single_translated_entry 上。而 quality.py 正是以
「apply 层的 _sanitize_neighbor_continuation_leak 已经能确定性修剪泄漏的后文公式」
为由,把续接条目的 context_bleed 从 error 降成 warning。

`__cg__:` 群组走的是 apply_group_translated_entry,那条路从来没调过裁剪器。于是它
两头落空:既不重试（已降级成 warning）,也不裁剪（裁剪器没接上）,模型顺手带进来的
下一块公式直接落盘进 PDF。降级的理由对这条路不成立。

用的必须是**合并后的组源文**:quality.py 判 context_bleed 时看的就是组源文,而裁剪
器原本读的是 `protected_source_text`——成员自己的那一份。两边前提条件
（_source_looks_incomplete）落在不同文本上,就会出现一边报、另一边不修。
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from retainpdf_pipeline.translate.core.payload.parts.apply import (  # noqa: E402
    apply_translated_text_map,
)

# 组源文停在半句上——跨页续接就是这个样子,也是两处前提条件都要求的形态。
GROUP_SOURCE = r"The coupling term $\alpha_{I}$ governs the transition and"
NEXT_SOURCE = r"the rate constant $k_{B}T$ follows from it."
# 模型把下一块的公式一起翻译了进来。
LEAKY_TRANSLATION = r"耦合项 $\alpha_{I}$ 支配跃迁，而速率常数 $k_{B}T$ 由此得出。"


def _member(item_id: str) -> dict:
    return {
        "item_id": item_id,
        "math_mode": "direct_typst",
        # 两个成员共享 continuation_group 才会被合成一个 __cg__ 单元。
        "continuation_group": "cg-001-002",
        "translation_unit_protected_source_text": GROUP_SOURCE,
        "protected_source_text": GROUP_SOURCE,
        "source_text": GROUP_SOURCE,
        "translation_context_after": NEXT_SOURCE,
        "continuation_next_text": NEXT_SOURCE,
    }


def _neighbour() -> dict:
    return {
        "item_id": "p002-b001",
        "math_mode": "direct_typst",
        "protected_source_text": NEXT_SOURCE,
        "source_text": NEXT_SOURCE,
    }


def _payload(*, with_neighbour: bool = True) -> list[dict]:
    items = [_member("p001-b001"), _member("p001-b002")]
    if with_neighbour:
        items.append(_neighbour())
    return items


def _apply(payload: list[dict]) -> str:
    from retainpdf_pipeline.translate.core.payload.parts.common import (
        effective_translation_unit_id,
    )
    from retainpdf_pipeline.translate.core.payload.parts.translation_units import (
        refresh_payload_translation_units,
    )

    # 单元 id 是刷新出来的,不是 fixture 里写死的。apply_translated_text_map 内部也会
    # 刷新一次,这里先跑是为了拿到那个 id 当 translated 的键。
    refresh_payload_translation_units(payload)
    unit_id = effective_translation_unit_id(payload[0])
    assert unit_id.startswith("__cg__:"), f"用例没有构成群组单元：{unit_id}"
    apply_translated_text_map(payload, {unit_id: {"decision": "translate", "translated_text": LEAKY_TRANSLATION}})
    # 取组级字段。成员的 translated_text 只是组译文按几何切给它的一段——拿它断言会
    # 因为切分位置碰巧落在泄漏片段之前而「通过」,测的却不是裁剪。
    return str(payload[0].get("group_translated_text") or "")


def test_leaked_next_block_math_is_trimmed_from_a_group_translation() -> None:
    translated = _apply(_payload())
    assert translated, "群组译文没有落盘"
    assert r"\alpha_{I}" in translated, "把本段自己的公式也裁掉了"
    assert r"k_{B}T" not in translated, (
        f"泄漏进来的后文公式没有被裁掉：{translated}"
    )


def test_a_group_without_a_following_block_is_left_alone() -> None:
    """没有后邻就没有可比对的来源,不能凭空裁剪。"""
    assert _apply(_payload(with_neighbour=False)) == LEAKY_TRANSLATION


def test_a_complete_group_source_is_left_alone() -> None:
    """组源文收了句就不是续接形态,此时译文里的公式一律当成本段自己的。

    这条和 quality.py 的前提条件是同一个:_source_looks_incomplete 为假时,
    context_bleed 检查本身就不会触发。两边必须同进同退。
    """
    payload = _payload()
    complete = GROUP_SOURCE + " so on."
    for item in payload[:2]:
        item["translation_unit_protected_source_text"] = complete
        item["protected_source_text"] = complete
        item["source_text"] = complete

    assert r"k_{B}T" in _apply(payload)
