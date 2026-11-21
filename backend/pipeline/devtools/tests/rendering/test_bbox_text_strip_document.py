"""bbox 文字剥离的主路径：哪些源文字被删、哪些必须留下（保护块、未翻译块、背景图页、矢量重叠）。

公式、Form XObject、执行层/并行、意图判定和底层原语各自拆到了
test_bbox_text_strip_{formula,form_xobject,executor,primitives}.py 与
test_source_cleanup_intent.py。
"""

from __future__ import annotations

import tempfile
import json
from pathlib import Path

import fitz
import pikepdf
from pikepdf import Name

from retainpdf_pipeline.render.source_cleanup import build_bbox_text_stripped_pdf_copy
from retainpdf_pipeline.render.source_cleanup import strip_bbox_text_rects_from_pdf_copy


def test_bbox_text_strip_preserves_explicit_protected_source_blocks() -> None:
    """document.v1 里 `policy.translate=false` 的文本块，源文字不能被抠掉。

    原型是真实 job 20260607133703-aa37db 第 9 页：「The Supporting Information is
    available free of charge at」这行夹在译文块的 bbox 里，没有保护就会被一起剥掉。
    这条以前直接读本机 data/jobs 下那本书，CI 和别的机器上永远 skip；这里按同样的
    形状现造：第 2 页（非首页，顺带钉住页码映射）一行要翻译的正文 + 一行
    translate=false 的说明文字，译文 bbox 把两行都罩住。

    同时跑一遍「不给 protected_pages」作对照——对照里那行也被剥掉，才说明保留下来
    确实是保护在起作用，而不是 bbox 恰好没罩住它。
    """
    from retainpdf_pipeline.render.source_cleanup.protected_blocks import protected_pages_from_document_path

    protected_line = "The Supporting Information is available free of charge at"
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        doc = fitz.open()
        doc.new_page(width=400, height=300)
        page = doc.new_page(width=400, height=300)
        page.insert_text((30, 60), "translated body text", fontsize=11)
        page.insert_text((30, 90), protected_line, fontsize=9)
        doc.save(source_pdf)
        doc.close()

        normalized_path = root / "document.v1.json"
        normalized_path.write_text(
            json.dumps(
                {
                    "schema": "normalized_document_v1",
                    "schema_version": "1.1",
                    "document_id": "protected-source-blocks",
                    "page_count": 2,
                    "pages": [
                        {"page_index": 0, "page": 1, "width": 400, "height": 300, "blocks": []},
                        {
                            "page_index": 1,
                            "page": 2,
                            "width": 400,
                            "height": 300,
                            "blocks": [
                                {
                                    "block_id": "p002-b001",
                                    "type": "text",
                                    "bbox": [25.0, 45.0, 380.0, 65.0],
                                    "content": {"kind": "text", "text": "translated body text"},
                                    "policy": {"translate": True},
                                },
                                {
                                    "block_id": "p002-b002",
                                    "type": "text",
                                    "bbox": [25.0, 78.0, 380.0, 95.0],
                                    "content": {"kind": "text", "text": protected_line},
                                    "policy": {"translate": False},
                                },
                            ],
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )
        translated_items = [
            {
                "block_kind": "text",
                "bbox": [20.0, 40.0, 390.0, 100.0],
                "protected_translated_text": "译文",
            }
        ]

        def strip(output_pdf: Path, protected_pages: dict) -> tuple[bool, str]:
            result = build_bbox_text_stripped_pdf_copy(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                translated_pages={1: translated_items},
                protected_pages=protected_pages,
            )
            stripped = fitz.open(output_pdf)
            try:
                return result.changed, stripped[1].get_text()
            finally:
                stripped.close()

        protected_pages = protected_pages_from_document_path(normalized_path)
        assert [item["item_id"] for item in protected_pages.get(1, [])] == ["p002-b002"]

        changed, text = strip(root / "stripped.pdf", protected_pages)
        assert changed is True
        assert protected_line in text
        assert "translated body text" not in text

        _changed, unprotected_text = strip(root / "unprotected.pdf", {})
        assert protected_line not in unprotected_text, "对照组也保留了这行，说明 bbox 没罩住它，这条测不到保护"


def test_bbox_text_strip_removes_text_inside_bbox_without_redaction_bloat() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.insert_text((20, 140), "outside text", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
            skip_form_xobject_pages=True,
        )

        assert result.changed is True
        assert result.text_show_ops_removed >= 1

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "inside text" not in text
        assert "outside text" in text


def test_bbox_text_strip_preserves_text_block_with_embedded_display_formula() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=260, height=180)
        page.insert_text((30, 50), "body text", fontsize=12)
        page.insert_text((30, 90), "E = mc2", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "block_type": "text",
                        "bbox": [20.0, 30.0, 230.0, 105.0],
                        "source_text": "body text\n$$ E=mc^2 $$",
                        "protected_translated_text": "正文\n$$ E=mc^2 $$",
                    },
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_keeps_source_text_when_no_translated_overlay() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside source", fontsize=12)
        page.insert_text((20, 140), "outside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "inside source",
                        "protected_translated_text": "",
                    }
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_keeps_non_translated_items_even_with_render_text() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "keep original", fontsize=12)
        page.insert_text((20, 140), "outside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "keep original",
                        "protected_translated_text": "keep original",
                        "final_status": "kept_origin",
                        "decision": "keep_origin",
                    }
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_deletes_safe_items_when_same_page_has_keep_origin_item() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=220)
        page.insert_text((20, 40), "translated source", fontsize=12)
        page.insert_text((20, 110), "keep original", fontsize=12)
        page.insert_text((20, 180), "outside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "item_id": "p001-b001",
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 180.0, 58.0],
                        "protected_source_text": "translated source",
                        "protected_translated_text": "已翻译",
                    },
                    {
                        "item_id": "p001-b002",
                        "block_kind": "text",
                        "bbox": [10.0, 90.0, 180.0, 128.0],
                        "protected_source_text": "keep original",
                        "protected_translated_text": "keep original",
                        "final_status": "kept_origin",
                        "decision": "keep_origin",
                    },
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_visual_background_page_indices == frozenset()
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "translated source" not in text
        assert "keep original" in text
        assert "outside source" in text


def test_bbox_text_strip_skips_large_background_image_page_before_deletion() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 200, 200), False)
        pix.clear_with(255)
        page.insert_image(page.rect, pixmap=pix)
        page.insert_text((20, 40), "inside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "inside source",
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is False
        assert result.changed_page_indices == frozenset()
        assert result.skipped_visual_background_page_indices == frozenset({0})
        assert output_pdf.exists() is False


def test_bbox_text_strip_keeps_body_text_deletable_when_vector_line_overlaps() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.draw_line((12, 45), (150, 45), color=(0, 0, 0), width=1)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 160.0, 60.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert output_pdf.exists() is True
        assert result.skipped_complex_page_indices == frozenset()


def test_bbox_text_strip_allows_fill_only_background_overlap() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=180)
        page.draw_rect(fitz.Rect(12, 25, 180, 75), color=None, fill=(1.0, 0.95, 0.82))
        page.insert_text((20, 50), "inside text", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 190.0, 80.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
            drawings = stripped[0].get_drawings()
        finally:
            stripped.close()
        assert "inside text" not in text
        assert drawings


def test_bbox_text_strip_allows_toc_leader_vector_overlap() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=260, height=180)
        page.insert_text((20, 50), "1.1 Introduction", fontsize=12)
        page.draw_line((120, 47), (210, 47), color=(0, 0, 0), width=0.5)
        page.insert_text((220, 50), "2", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "layout_role": "toc",
                        "semantic_role": "table_of_contents",
                        "structure_role": "table_of_contents",
                        "normalized_sub_type": "table_of_contents",
                        "bbox": [15.0, 30.0, 235.0, 60.0],
                        "protected_translated_text": "1.1 引言 ..... 2",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
            drawings = stripped[0].get_drawings()
        finally:
            stripped.close()
        assert "Introduction" not in text
        assert drawings


def test_bbox_text_strip_keeps_fast_path_when_vector_line_is_outside_text_bbox() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.draw_line((12, 120), (150, 120), color=(0, 0, 0), width=1)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 160.0, 60.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "inside text" not in text


def test_strip_bbox_text_rects_from_pdf_copy_removes_text_without_translated_pages() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=180)
        page.insert_text((30, 50), "remove me", fontsize=12)
        page.insert_text((30, 100), "keep me", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 115.0, 120.0, 150.0)]},
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "remove me" not in text
        assert "keep me" in text


def test_strip_bbox_text_rects_from_pdf_copy_removes_text_like_fill_paths() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 50 Td (remove me) Tj ET\n"
            b"q 0 0 0 rg 60 60 m 65 60 l 65 70 l 60 70 l h f Q\n"
            b"q 0 0 0 rg 160 120 m 165 120 l 165 130 l 160 130 l h f Q\n"
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 35.0, 100.0, 80.0)]},
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            bboxlog = stripped[0].get_bboxlog()
        finally:
            stripped.close()
        assert not any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(20, 35, 100, 80)) for kind, rect in bboxlog)
        assert any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(150, 40, 180, 70)) for kind, rect in bboxlog)
