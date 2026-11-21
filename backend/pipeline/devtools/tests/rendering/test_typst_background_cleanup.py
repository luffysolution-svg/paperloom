import tempfile
from pathlib import Path
from unittest import mock

import fitz


from retainpdf_pipeline.render.source.background.stage import build_clean_background_pdf
from retainpdf_pipeline.render.layout.model.models import RenderLayoutBlock
from retainpdf_pipeline.render.layout.model.models import RenderPageSpec
from retainpdf_pipeline.render.output.typst.book_renderer import _background_cache_key
from retainpdf_pipeline.render.output.typst.source_page_overlay import apply_source_page_overlay
from retainpdf_pipeline.render.source.background.redaction_items import redaction_items_from_layout_blocks
from retainpdf_pipeline.render.output.typst.source_page_overlay import redaction_items_from_render_blocks
from retainpdf_pipeline.render.visual_profile.contracts import DocumentVisualProfile
from retainpdf_pipeline.render.visual_profile.contracts import ItemVisualProfile
from retainpdf_pipeline.render.visual_profile.contracts import PageVisualProfile
from retainpdf_pipeline.render.visual_profile.runtime import VisualProfileRuntime
from devtools.tests.pdf_fixtures import write_pdf


def test_background_stage_creates_cleaned_pdf() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "cleaned.pdf"

        write_pdf(source_pdf, width=200, height=300, text="source text", at=(20, 40))

        result = build_clean_background_pdf(
            source_pdf_path=source_pdf,
            translated_pages={
                0: [
                    {
                        "item_id": "b1",
                        "bbox": [10.0, 20.0, 80.0, 60.0],
                        "translated_text": "hello",
                        "protected_translated_text": "hello",
                        "formula_map": [],
                    }
                ]
            },
            output_pdf_path=output_pdf,
        )

        assert result == output_pdf
        assert output_pdf.exists()


def test_background_cache_key_includes_visual_profile_payload(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    write_pdf(source_pdf, width=200, height=300)
    spec = RenderPageSpec(
        page_index=0,
        page_width_pt=200,
        page_height_pt=300,
        background_pdf_path=None,
        blocks=[
            RenderLayoutBlock(
                block_id="p001-b001",
                page_index=0,
                background_rect=[10, 20, 80, 60],
                content_rect=[10, 20, 80, 60],
                content_kind="text",
                content_text="hello",
                plain_text="hello",
                math_map=[],
                font_size_pt=10,
                leading_em=1.2,
            )
        ],
    )
    translated_pages = {0: [{"item_id": "p001-b001", "bbox": [10, 20, 80, 60], "translated_text": "hello"}]}

    def runtime(background_rgb: tuple[float, float, float]) -> VisualProfileRuntime:
        item = ItemVisualProfile(
            item_id="p001-b001",
            page_index=0,
            bbox=(10, 20, 80, 60),
            bbox_space="page",
            bbox_source="test",
            source_item_kind="text",
            background_rgb=background_rgb,
            text_rgb=(0.0, 0.0, 0.0),
            confidence=1.0,
            method="test",
        )
        return VisualProfileRuntime(
            path=None,
            profile=DocumentVisualProfile(
                algorithm="visual_profile_v6_document_title_pixels_only",
                pages={
                    0: PageVisualProfile(
                        page_index=0,
                        background_rgb=(1.0, 1.0, 1.0),
                        items={"p001-b001": item},
                    )
                },
            ),
            diagnostics={"loaded": True},
        )

    first = _background_cache_key(
        source_pdf_path=source_pdf,
        translated_pages=translated_pages,
        page_specs=[spec],
        redaction_strategy="pikepdf_text_strip",
        source_text_precleaned_page_indices=frozenset(),
        visual_profile_runtime=runtime((1.0, 1.0, 1.0)),
    )
    second = _background_cache_key(
        source_pdf_path=source_pdf,
        translated_pages=translated_pages,
        page_specs=[spec],
        redaction_strategy="pikepdf_text_strip",
        source_text_precleaned_page_indices=frozenset(),
        visual_profile_runtime=runtime((0.95, 0.96, 0.97)),
    )

    assert first != second


def test_background_stage_uses_cover_only_redaction_for_vector_text() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "cleaned.pdf"

        write_pdf(source_pdf, width=200, height=300)

        with mock.patch(
            "retainpdf_pipeline.render.source.background.stage.collect_vector_text_rects",
            return_value=[fitz.Rect(10, 20, 80, 60)],
        ), mock.patch(
            "retainpdf_pipeline.render.source.background.stage.redact_source_text_areas",
        ) as redact_mock, mock.patch(
            "retainpdf_pipeline.render.source.background.stage.save_optimized_pdf",
        ):
            build_clean_background_pdf(
                source_pdf_path=source_pdf,
                translated_pages={
                    0: [
                        {
                            "item_id": "b1",
                            "bbox": [10.0, 20.0, 80.0, 60.0],
                            "translated_text": "hello",
                            "protected_translated_text": "hello",
                            "formula_map": [],
                        }
                    ]
                },
                output_pdf_path=output_pdf,
            )

        redact_mock.assert_called_once()
        assert redact_mock.call_args.kwargs["cover_only"] is True


def test_background_stage_uses_visual_cover_for_formula_pages_by_default() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "cleaned.pdf"

        write_pdf(source_pdf, width=200, height=300)

        with mock.patch(
            "retainpdf_pipeline.render.source.background.stage.redact_source_text_areas",
        ) as redact_mock, mock.patch(
            "retainpdf_pipeline.render.source.background.stage.save_optimized_pdf",
        ):
            build_clean_background_pdf(
                source_pdf_path=source_pdf,
                translated_pages={
                    0: [
                        {
                            "item_id": "p001-b001",
                            "block_type": "text",
                            "block_kind": "text",
                            "bbox": [10.0, 20.0, 180.0, 60.0],
                            "translated_text": "hello",
                            "protected_translated_text": "hello",
                        },
                        {
                            "item_id": "p001-b002",
                            "block_type": "formula",
                            "block_kind": "formula",
                            "normalized_sub_type": "display_formula",
                            "bbox": [60.0, 70.0, 140.0, 95.0],
                        },
                    ]
                },
                output_pdf_path=output_pdf,
            )

        redact_mock.assert_called_once()
        assert redact_mock.call_args.kwargs["strategy"] == "visual_cover"


def test_background_stage_skips_old_cleanup_for_precleaned_pages() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "cleaned.pdf"

        write_pdf(source_pdf, width=200, height=300, text="already stripped by pikepdf", at=(20, 40))

        with mock.patch(
            "retainpdf_pipeline.render.source.background.stage.protect_formula_regions_in_redaction_items",
        ) as protect_mock, mock.patch(
            "retainpdf_pipeline.render.source.background.stage.redact_source_text_areas",
        ) as redact_mock:
            build_clean_background_pdf(
                source_pdf_path=source_pdf,
                translated_pages={
                    0: [
                        {
                            "item_id": "p001-b001",
                            "block_type": "text",
                            "block_kind": "text",
                            "bbox": [10.0, 20.0, 180.0, 60.0],
                            "translated_text": "hello",
                            "protected_translated_text": "hello",
                        },
                        {
                            "item_id": "p001-b002",
                            "block_type": "formula",
                            "block_kind": "formula",
                            "normalized_sub_type": "display_formula",
                            "bbox": [60.0, 70.0, 140.0, 95.0],
                        },
                    ]
                },
                output_pdf_path=output_pdf,
                source_text_precleaned_page_indices=frozenset({0}),
            )

        protect_mock.assert_not_called()
        redact_mock.assert_not_called()
        assert output_pdf.exists()


def test_apply_source_page_overlay_uses_cover_only_when_vector_text_detected() -> None:
    page = fitz.open().new_page(width=300, height=400)
    translated_items = [
        {
            "item_id": "b1",
            "bbox": [10.0, 20.0, 80.0, 60.0],
            "translated_text": "hello",
            "protected_translated_text": "hello",
            "formula_map": [],
        }
    ]

    with mock.patch(
        "retainpdf_pipeline.render.source.background.redaction_plan.collect_vector_text_rects",
        return_value=[fitz.Rect(10, 20, 80, 60)],
    ), mock.patch(
        "retainpdf_pipeline.render.source.background.source_overlay.redact_source_text_areas",
    ) as redact_mock, mock.patch(
        "retainpdf_pipeline.render.source.background.source_overlay.strip_page_links",
    ):
        apply_source_page_overlay(page, translated_items)

    redact_mock.assert_called_once()
    assert redact_mock.call_args.kwargs["cover_only"] is True


def test_redaction_items_from_render_blocks_preserve_source_item_metadata() -> None:
    translated_items = [
        {
            "item_id": "p001-b001",
            "block_type": "text",
            "block_kind": "text",
            "layout_role": "paragraph",
            "semantic_role": "body",
            "source_text": "This editable source text should be matched in the PDF text layer.",
            "bbox": [20.0, 40.0, 180.0, 70.0],
            "translated_text": "这段可编辑源文本应在 PDF 文字层中匹配。",
            "protected_translated_text": "这段可编辑源文本应在 PDF 文字层中匹配。",
            "formula_map": [],
        }
    ]

    redaction_items = redaction_items_from_render_blocks(
        translated_items,
        page_width=300.0,
        page_height=400.0,
    )

    assert len(redaction_items) == 1
    item = redaction_items[0]
    assert item["item_id"] == "item-0"
    assert item["source_item_id"] == "p001-b001"
    assert item["source_block_kind"] == "text"
    assert item["block_kind"] == "render_block"
    assert item["block_type"] == "render_block"
    assert item["source_text"] == translated_items[0]["source_text"]
    assert len(item["bbox"]) == 4


def test_redaction_items_from_layout_blocks_use_background_rect() -> None:
    translated_items = [
        {
            "item_id": "p001-b001",
            "block_type": "text",
            "source_text": "source text",
            "translated_text": "译文",
            "protected_translated_text": "译文",
            "bbox": [20.0, 40.0, 180.0, 70.0],
        }
    ]
    block = RenderLayoutBlock(
        block_id="item-p001-b001",
        page_index=0,
        background_rect=[10.0, 30.0, 190.0, 80.0],
        content_rect=[20.0, 40.0, 180.0, 70.0],
        content_kind="markdown",
        content_text="译文",
        plain_text="译文",
        math_map=[],
        font_size_pt=10.0,
        leading_em=0.6,
    )

    redaction_items = redaction_items_from_layout_blocks(translated_items, [block])

    assert redaction_items[0]["bbox"] == [10.0, 30.0, 190.0, 80.0]
    assert redaction_items[0]["source_item_id"] == "p001-b001"

