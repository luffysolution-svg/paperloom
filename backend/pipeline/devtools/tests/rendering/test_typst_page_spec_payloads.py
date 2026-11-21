import tempfile
from pathlib import Path


from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs
from devtools.tests.pdf_fixtures import write_pdf


def test_build_render_page_specs_restores_leaked_formula_tokens_before_render() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"

        write_pdf(source_pdf, width=200, height=300)

        translated_pages = {
            0: [
                {
                    "item_id": "p003-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 90.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "However ...",
                    "protected_source_text": "However <f1-9a9/> orbitals",
                    "translation_unit_protected_translated_text": "然而，研究表明这些传统方法不适用于表征具有局域电子态的半导体<f1-9a9/>或<f2-797/>轨道）。",
                    "translation_unit_protected_map": [
                        {
                            "token_tag": "<f1-9a9/>",
                            "token_type": "formula",
                            "original_text": r"^ { \cdot } d",
                            "restore_text": r"^ { \cdot } d",
                            "source_offset": 0,
                            "checksum": "9a9",
                        },
                        {
                            "token_tag": "<f2-797/>",
                            "token_type": "formula",
                            "original_text": "f",
                            "restore_text": "f",
                            "source_offset": 0,
                            "checksum": "797",
                        },
                    ],
                    "translation_unit_formula_map": [
                        {"placeholder": "<f1-9a9/>", "formula_text": r"^ { \cdot } d"},
                        {"placeholder": "<f2-797/>", "formula_text": "f"},
                    ],
                }
            ]
        }

        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        block = page_specs[0].blocks[0]
        assert "<f1-9a9/>" not in block.content_text
        assert "<f2-797/>" not in block.content_text
        assert "$" in block.content_text


def test_build_render_page_specs_marks_adjacent_collision_risk_for_stacked_blocks() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"

        write_pdf(source_pdf, width=200, height=300)

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 60.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "short text",
                    "protected_source_text": "short text",
                    "protected_translated_text": "这是一段明显会在翻译后变长很多很多很多的中文正文，用来模拟上方文本块在渲染时向下扩张。",
                },
                {
                    "item_id": "p001-b002",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 61.5, 180.0, 95.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "below text",
                    "protected_source_text": "below text",
                    "protected_translated_text": "下方块",
                },
            ]
        }

        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        upper, lower = page_specs[0].blocks
        assert upper.block_id == "item-p001-b001"
        assert lower.block_id == "item-p001-b002"
        assert upper.fit_to_box is True
        expected_limit = lower.content_rect[1] - upper.content_rect[1] - 0.9
        assert upper.fit_max_height_pt <= expected_limit + 0.2


def test_build_render_page_specs_uses_cover_bbox_gap_for_tight_stacked_blocks() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"

        write_pdf(source_pdf, width=240, height=320)

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [20.0, 40.0, 210.0, 110.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "upper",
                    "protected_source_text": "upper",
                    "protected_translated_text": (
                        "这是一段会在渲染时变得明显更长的中文正文，用来模拟上方块在原始 OCR 框已经"
                        "贴到下方块时，仍然需要继续压缩高度避免覆盖下一块。"
                    ),
                },
                {
                    "item_id": "p001-b002",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [20.0, 109.7, 210.0, 152.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "lower",
                    "protected_source_text": "lower",
                    "protected_translated_text": "下方块",
                },
            ]
        }

        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        upper, lower = page_specs[0].blocks
        upper_height = upper.content_rect[3] - upper.content_rect[1]
    assert upper.fit_to_box is True
    assert upper.skip_reason == "adjacent_collision_risk"
    assert upper.fit_max_height_pt < upper_height
    assert upper.fit_max_height_pt >= upper_height - 8.0
    assert lower.content_rect[1] == 109.7


