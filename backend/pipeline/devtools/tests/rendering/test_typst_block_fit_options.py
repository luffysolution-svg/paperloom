


from retainpdf_pipeline.render.output.typst.source_builder import build_typst_overlay_source


def test_typst_overlay_fit_respects_python_min_font_and_leading() -> None:
    translated_items = [
        {
            "item_id": "p001-b001",
            "page_idx": 0,
            "block_type": "text",
            "bbox": [10.0, 20.0, 120.0, 42.0],
            "lines": [{"bbox": [10.0, 20.0, 120.0, 30.0], "spans": [{"type": "text", "content": "source"}]}],
            "source_text": "A dense source paragraph with enough words to be treated as body text.",
            "protected_source_text": "A dense source paragraph with enough words to be treated as body text.",
            "protected_translated_text": "这是一段非常长的中文译文，用来触发渲染拟合，但不能让 Typst 绕过 Python 给出的最小字号和最小行距继续压缩。",
        }
    ]

    source = build_typst_overlay_source(200.0, 300.0, translated_items)

    assert "min_size - 1.6pt" not in source
    assert "fallback_min_size - 1.2pt" not in source
    assert "min_leading - 0.12em" not in source
    assert "fallback_min_leading - 0.08em" not in source
    assert "pdftr_fit_leading" in source


def test_typst_overlay_emits_first_line_indent_for_markdown_blocks() -> None:
    source = build_typst_overlay_source(
        200.0,
        300.0,
        [
            {
                "item_id": "p001-b001",
                "page_idx": 0,
                "block_type": "text",
                "block_kind": "text",
                "layout_role": "paragraph",
                "semantic_role": "body",
                "structure_role": "body",
                "bbox": [10.0, 20.0, 160.0, 82.0],
                "lines": [{"bbox": [10.0, 20.0, 160.0, 32.0], "spans": [{"type": "text", "content": "source"}]}],
                "source_text": "A source paragraph with first line indent.",
                "protected_source_text": "A source paragraph with first line indent.",
                "protected_translated_text": "这是一段需要渲染首行缩进的中文正文。",
                "_render_first_line_indent_pt": 12.0,
            }
        ],
    )

    assert "first_line_indent: 12.0pt" in source


def test_typst_overlay_justifies_body_markdown_blocks() -> None:
    source = build_typst_overlay_source(
        200.0,
        300.0,
        [
            {
                "item_id": "p001-b001",
                "page_idx": 0,
                "block_type": "text",
                "block_kind": "text",
                "layout_role": "paragraph",
                "semantic_role": "body",
                "structure_role": "body",
                "bbox": [10.0, 20.0, 180.0, 90.0],
                "lines": [{"bbox": [10.0, 20.0, 180.0, 32.0], "spans": [{"type": "text", "content": "source"}]}],
                "source_text": "A body paragraph that should align on both sides.",
                "protected_source_text": "A body paragraph that should align on both sides.",
                "protected_translated_text": "这是一段需要左右两侧对齐的正文内容，用于确认 Typst 段落参数已经打开。",
            }
        ],
    )

    assert "justify: true" in source


def test_typst_overlay_does_not_justify_title_markdown_blocks() -> None:
    source = build_typst_overlay_source(
        200.0,
        300.0,
        [
            {
                "item_id": "p001-title",
                "page_idx": 0,
                "block_type": "text",
                "block_kind": "text",
                "layout_role": "heading",
                "structure_role": "heading",
                "bbox": [10.0, 20.0, 180.0, 50.0],
                "lines": [{"bbox": [10.0, 20.0, 180.0, 32.0], "spans": [{"type": "text", "content": "Title"}]}],
                "source_text": "Related work",
                "protected_source_text": "Related work",
                "protected_translated_text": "相关工作",
            }
        ],
    )

    assert "justify: true" not in source


def test_typst_overlay_defaults_to_transparent_text_blocks() -> None:
    translated_items = [
        {
            "item_id": "p001-b001",
            "page_idx": 0,
            "block_type": "text",
            "bbox": [10.0, 20.0, 120.0, 62.0],
            "translated_text": "白底文本块",
            "protected_translated_text": "白底文本块",
            "formula_map": [],
        }
    ]

    source = build_typst_overlay_source(200.0, 300.0, translated_items)

    assert "rect(" not in source
    assert "block(width:" in source
    assert "fill: rgb(255, 255, 255)" not in source


def test_typst_overlay_can_use_block_cover_fill_as_fallback() -> None:
    translated_items = [
        {
            "item_id": "p001-b001",
            "page_idx": 0,
            "block_type": "text",
            "bbox": [10.0, 20.0, 120.0, 62.0],
            "translated_text": "白底文本块",
            "protected_translated_text": "白底文本块",
            "formula_map": [],
            "_render_policy": {"overlay_fill": "white"},
        }
    ]

    source = build_typst_overlay_source(200.0, 300.0, translated_items)

    # 底色是单独一块裁到 OCR 框里的矩形，文字 block 本身不再带 fill
    assert "rect(width: 110.0pt, height: 42.0pt, fill: rgb(255, 255, 255)" in source
    assert "pt, fill: rgb(255, 255, 255))[" not in source


