"""表格 / 图片 / 代码标题在渲染侧不能被漏掉。

翻译侧把 table_caption / image_caption / code_caption 加进了
translate/core/ocr/json_extractor.py 的 PRIMARY_TRANSLATABLE_STRUCTURE_ROLES（表格标题
此前从不翻译）。渲染侧有一份按文件契约复制过来的抽取器
（render/workflow/source_page_records.py，render 不许 import translate），OCR 阶段的
渲染预热（prewarm_entry.build_source_render_preprocess_pages）用的是它：集合里没有这三类
标题，预热就不会为它们算缩进 / 几何 / 颜色 / bbox 擦除候选。

擦除侧 render/source_cleanup/planning/item_classifier.py 的 TEXT_STRIP_ROLE_ALLOWLIST
里其他标题都在，唯独缺 code_caption：代码标题因此按普通正文处理，不允许和矢量
（代码框底纹）重叠、也拿不到 item cover 兜底，原文可能擦不掉。
"""

from __future__ import annotations

from pathlib import Path

from retainpdf_pipeline.ocr.document_schema.adapters import adapt_payload_to_document_v1
from retainpdf_pipeline.ocr.document_schema.providers import PROVIDER_GENERIC_FLAT_OCR
from retainpdf_pipeline.render.source_cleanup.planning.item_classifier import TEXT_STRIP_ROLE_ALLOWLIST
from retainpdf_pipeline.render.source_cleanup.planning.item_classifier import item_allows_forced_text_strip
from retainpdf_pipeline.render.workflow import source_page_records
from retainpdf_translation.core.ocr import json_extractor

CAPTION_ROLES = ("table_caption", "image_caption", "code_caption")


def _block(sub_type: str, top: float, text: str, tags: list[str]) -> dict:
    bbox = [0, top, 200, top + 20]
    return {
        "type": "text",
        "sub_type": sub_type,
        "bbox": bbox,
        "text": text,
        "lines": [{"bbox": bbox, "spans": [{"type": "text", "raw_type": "text", "text": text, "bbox": bbox}]}],
        "segments": [],
        "tags": tags,
        "derived": {"role": sub_type if sub_type != "body" else "", "by": "", "confidence": 0.0},
        "metadata": {},
    }


def test_render_prewarm_extractor_keeps_caption_blocks() -> None:
    blocks = [_block("body", 0, "Body paragraph", [])]
    for index, role in enumerate(CAPTION_ROLES):
        blocks.append(_block(role, 30 + index * 30, f"{role} text", ["caption", role]))
    adapted = adapt_payload_to_document_v1(
        payload={
            "provider": PROVIDER_GENERIC_FLAT_OCR,
            "pages": [{"width": 300.0, "height": 240.0, "unit": "pt", "blocks": blocks}],
        },
        document_id="doc-captions",
        provider=PROVIDER_GENERIC_FLAT_OCR,
        source_json_path=Path("doc-captions.json"),
    )

    # 生产里的 document.v1（paddle）标题块带 policy.translate=True、structure_role
    # 就是 table_caption 这类细分角色（实测 data/jobs 里 120 个 table_caption 块全是）；
    # generic flat 适配器给的是 translate=False / metadata，这里改成和生产一致，
    # 只考察角色集合这道闸。
    for block, sub_type in zip(adapted["pages"][0]["blocks"], ["body", *CAPTION_ROLES]):
        block["policy"] = {"translate": True, "translate_reason": "test"}
        if sub_type != "body":
            block["structure_role"] = sub_type

    items = source_page_records.extract_text_items(adapted, page_idx=0)
    texts = {item.text for item in items}

    for role in CAPTION_ROLES:
        assert f"{role} text" in texts, f"{role} 在渲染预热里被漏掉了"


def test_render_translatable_roles_track_translate_side() -> None:
    # render 不能 import translate，只能复制一份；这里守住两份不漂移。
    # 用并集比较：翻译侧那份补上三类标题之前和之后，这条断言都成立。
    render_roles = source_page_records.PRIMARY_TRANSLATABLE_STRUCTURE_ROLES
    translate_roles = json_extractor.PRIMARY_TRANSLATABLE_STRUCTURE_ROLES
    assert set(CAPTION_ROLES) <= render_roles
    assert render_roles == translate_roles | set(CAPTION_ROLES)


def test_code_caption_is_force_stripped_like_other_captions() -> None:
    assert "code_caption" in TEXT_STRIP_ROLE_ALLOWLIST
    item = {"item_id": "p001-b001", "block_kind": "text", "block_type": "text", "layout_role": "code_caption"}
    assert item_allows_forced_text_strip(item)
