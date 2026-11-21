from pathlib import Path


from retainpdf_pipeline.ocr.document_schema.defaults import default_block_continuation_hint
from retainpdf_pipeline.ocr.document_schema.adapters import adapt_payload_to_document_v1
from retainpdf_pipeline.ocr.document_schema.providers import PROVIDER_GENERIC_FLAT_OCR
from retainpdf_translation.core.ocr.json_extractor import extract_text_items

def test_extract_text_items_only_keeps_primary_body_like_text_blocks() -> None:
    adapted = adapt_payload_to_document_v1(
        payload={
            "provider": PROVIDER_GENERIC_FLAT_OCR,
            "pages": [
                {
                    "width": 300.0,
                    "height": 240.0,
                    "unit": "pt",
                    "blocks": [
                        {
                            "type": "text",
                            "sub_type": "body",
                            "bbox": [0, 0, 140, 20],
                            "text": "Body paragraph",
                            "lines": [{"bbox": [0, 0, 140, 20], "spans": [{"type": "text", "raw_type": "text", "text": "Body paragraph", "bbox": [0, 0, 140, 20]}]}],
                            "segments": [],
                            "tags": [],
                            "derived": {"role": "", "by": "", "confidence": 0.0},
                            "metadata": {},
                        },
                        {
                            "type": "text",
                            "sub_type": "heading",
                            "bbox": [0, 30, 140, 50],
                            "text": "Results",
                            "lines": [{"bbox": [0, 30, 140, 50], "spans": [{"type": "text", "raw_type": "text", "text": "Results", "bbox": [0, 30, 140, 50]}]}],
                            "segments": [],
                            "tags": [],
                            "derived": {"role": "heading", "by": "", "confidence": 0.0},
                            "metadata": {},
                        },
                        {
                            "type": "text",
                            "sub_type": "table_caption",
                            "bbox": [0, 60, 200, 80],
                            "text": "Table 1. Caption text",
                            "lines": [{"bbox": [0, 60, 200, 80], "spans": [{"type": "text", "raw_type": "text", "text": "Table 1. Caption text", "bbox": [0, 60, 200, 80]}]}],
                            "segments": [],
                            "tags": ["caption", "table_caption"],
                            "derived": {"role": "table_caption", "by": "", "confidence": 0.0},
                            "metadata": {},
                        },
                        {
                            "type": "text",
                            "sub_type": "header",
                            "bbox": [0, 90, 200, 110],
                            "text": "Journal Header",
                            "lines": [{"bbox": [0, 90, 200, 110], "spans": [{"type": "text", "raw_type": "text", "text": "Journal Header", "bbox": [0, 90, 200, 110]}]}],
                            "segments": [],
                            "tags": ["skip_translation"],
                            "derived": {"role": "header", "by": "", "confidence": 0.0},
                            "metadata": {},
                        },
                    ],
                }
            ],
        },
        provider=PROVIDER_GENERIC_FLAT_OCR,
        document_id="generic-body-only-doc",
        source_json_path=Path("/tmp/generic-body-only.json"),
    )

    items = extract_text_items(adapted, 0)

    # 表格标题在这里不抽出，是因为 generic provider 的 OCR 策略本身给它 policy.translate=False
    # （provider_non_body:table_caption），不是翻译层的结构角色过滤。provider 白名单放行的
    # 标题见 test_extract_text_items_keeps_provider_whitelisted_caption_roles。
    assert [item.text for item in items] == ["Body paragraph", "Results"]
    assert [item.structure_role for item in items] == ["body", "heading"]
    assert [item.block_class for item in items] == ["body", "title"]


def test_extract_text_items_keeps_empty_subtype_plain_text_body_block() -> None:
    adapted = {
        "schema": "normalized_document_v1",
        "schema_version": "1.0.0",
        "document_id": "normalized-empty-subtype-body",
        "source": {"provider": "test", "provider_version": "test", "raw_files": {}},
        "page_count": 1,
        "pages": [
            {
                "page_index": 0,
                "width": 200.0,
                "height": 120.0,
                "unit": "pt",
                "blocks": [
                        {
                            "block_id": "p001-b0000",
                            "page_index": 0,
                            "order": 0,
                            "type": "text",
                            "sub_type": "",
                            "geometry": {"bbox": [0, 0, 150, 20]},
                            "content": {"kind": "text", "text": "Plain normalized body block"},
                            "bbox": [0, 0, 150, 20],
                            "text": "Plain normalized body block",
                            "lines": [
                                {
                                    "bbox": [0, 0, 150, 20],
                                "spans": [
                                    {
                                        "type": "text",
                                        "raw_type": "text",
                                        "text": "Plain normalized body block",
                                        "bbox": [0, 0, 150, 20],
                                    }
                                ],
                            }
                        ],
                            "segments": [],
                            "tags": [],
                            "derived": {"role": "", "by": "", "confidence": 0.0},
                            "layout_role": "paragraph",
                            "semantic_role": "body",
                            "structure_role": "body",
                            "policy": {"translate": True, "translate_reason": "test_explicit_policy:body"},
                            "continuation_hint": default_block_continuation_hint(),
                            "metadata": {},
                        "source": {
                            "provider": "test",
                            "raw_page_index": 0,
                            "raw_type": "text",
                            "raw_sub_type": "",
                            "raw_bbox": [0, 0, 150, 20],
                            "raw_text_excerpt": "Plain normalized body block",
                        },
                    }
                ],
            }
        ],
        "derived": {},
        "markers": {},
    }

    items = extract_text_items(adapted, 0)

    assert [item.text for item in items] == ["Plain normalized body block"]
    assert [item.block_class for item in items] == ["body"]


def _normalized_document_with_blocks(*blocks: dict) -> dict:
    return {
        "schema": "normalized_document_v1",
        "schema_version": "1.0.0",
        "document_id": "translation-canonical-policy-test",
        "source": {"provider": "test"},
        "page_count": 1,
        "pages": [{"page_index": 0, "width": 200.0, "height": 120.0, "unit": "pt", "blocks": list(blocks)}],
    }


def _normalized_block(
    block_id: str,
    text: str,
    *,
    kind: str = "text",
    block_class: str = "body",
    policy_translate: bool = True,
    tags: list[str] | None = None,
    children: list[dict] | None = None,
) -> dict:
    return {
        "block_id": block_id,
        "page_index": 0,
        "order": 0,
        "type": kind,
        "sub_type": "body" if kind == "text" else kind,
        "block_class": block_class,
        "geometry": {"bbox": [0, 0, 180, 20]},
        "content": {"kind": kind, "text": text},
        "bbox": [0, 0, 180, 20],
        "text": text,
        "lines": [],
        "segments": [],
        "tags": list(tags or []),
        "layout_role": "paragraph" if kind == "text" else "unknown",
        "semantic_role": "body" if kind == "text" else "unknown",
        "structure_role": "body" if kind == "text" else "",
        "policy": {"translate": policy_translate},
        "source": {"provider": "test", "raw_type": kind},
        "blocks": list(children or []),
    }


def test_extract_text_items_explicit_policy_overrides_stale_skip_tag() -> None:
    body = _normalized_block(
        "p001-b0000",
        "Canonical body text",
        tags=["skip_translation"],
        policy_translate=True,
    )

    items = extract_text_items(_normalized_document_with_blocks(body), 0)

    assert [item.text for item in items] == ["Canonical body text"]


def test_extract_text_items_keeps_explicitly_skipped_formula_for_rendering() -> None:
    formula = _normalized_block(
        "p001-b0000",
        "E = mc^2",
        kind="formula",
        block_class="formula",
        tags=["skip_translation"],
        policy_translate=False,
    )

    items = extract_text_items(_normalized_document_with_blocks(formula), 0)

    assert len(items) == 1
    assert items[0].block_class == "formula"
    assert items[0].policy_translate is False


def test_extract_text_items_suppresses_algorithm_subtree_even_with_child_policy_true() -> None:
    child = _normalized_block("p001-b0001", "Do not translate nested algorithm text")
    algorithm = _normalized_block(
        "p001-b0000",
        "algorithm source",
        kind="code",
        block_class="code",
        policy_translate=False,
        children=[child],
    )

    assert extract_text_items(_normalized_document_with_blocks(algorithm), 0) == []


def _caption_block(block_id: str, text: str, structure_role: str, *, policy_translate: bool = True) -> dict:
    # 形状照搬 MinerU / Paddle 真实产出：layout_role=caption、semantic_role=metadata、
    # structure_role=<raw caption 类型>、policy 由 provider_caption_whitelist 放行。
    block = _normalized_block(block_id, text, block_class="caption", policy_translate=policy_translate)
    block.update(
        {
            "sub_type": structure_role,
            "layout_role": "caption",
            "semantic_role": "metadata",
            "structure_role": structure_role,
        }
    )
    block["policy"]["translate_reason"] = f"provider_caption_whitelist:{structure_role}"
    return block


def test_extract_text_items_keeps_provider_whitelisted_caption_roles() -> None:
    # 回归：OCR 层给 table_caption / image_caption / code_caption 的 policy.translate=True，
    # 但翻译层最终的结构角色过滤只认 caption / figure_caption，表格标题被静默丢掉。
    blocks = [
        _caption_block("p001-b0000", "Table I. Electronic energies of the F and Cl atoms", "table_caption"),
        _caption_block("p001-b0001", "Figure 2. Image caption text", "image_caption"),
        _caption_block("p001-b0002", "Listing 1. Code caption text", "code_caption"),
        _caption_block("p001-b0003", "Figure 3. Figure caption text", "figure_caption"),
    ]

    items = extract_text_items(_normalized_document_with_blocks(*blocks), 0)

    assert [item.structure_role for item in items] == [
        "table_caption",
        "image_caption",
        "code_caption",
        "figure_caption",
    ]
    assert all(item.block_class == "caption" for item in items)


def test_extract_text_items_still_drops_caption_when_provider_policy_says_no() -> None:
    caption = _caption_block("p001-b0000", "Table 1. Caption text", "table_caption", policy_translate=False)

    assert extract_text_items(_normalized_document_with_blocks(caption), 0) == []
