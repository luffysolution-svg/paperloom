import tempfile
from pathlib import Path

import fitz


from retainpdf_pipeline.render.output.typst.source_page_overlay import overlay_pages_from_single_pdf
from retainpdf_pipeline.render.document.pikepdf_overlay import PikepdfOverlayChunk
from retainpdf_pipeline.render.document.pikepdf_overlay import overlay_pdf_chunks_with_pikepdf
from retainpdf_pipeline.render.document.pikepdf_overlay import overlay_pdf_pages_with_pikepdf
from retainpdf_pipeline.render.document.pikepdf_overlay import overlay_page_pdfs_with_pikepdf
from retainpdf_pipeline.render.document.pikepdf_pages import extract_pages_with_pikepdf
from devtools.tests.pdf_fixtures import write_pdf

def test_pikepdf_overlay_merges_overlay_page_without_pymupdf_write() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        overlay_pdf = root / "overlay.pdf"
        output_pdf = root / "merged.pdf"

        write_pdf(source_pdf, width=200, height=120, text="source text", at=(20, 40), fontsize=12)

        write_pdf(overlay_pdf, width=200, height=120, text="overlay text", at=(20, 80), fontsize=12)

        result = overlay_pdf_pages_with_pikepdf(
            source_pdf_path=source_pdf,
            overlay_pdf_path=overlay_pdf,
            output_pdf_path=output_pdf,
        )

        assert result.pages_merged == 1
        merged = fitz.open(output_pdf)
        try:
            text = merged[0].get_text()
        finally:
            merged.close()
        assert "source text" in text
        assert "overlay text" in text


def test_pikepdf_overlay_merges_single_page_pdfs_by_source_page() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        page_two_overlay = root / "page-two-overlay.pdf"
        output_pdf = root / "merged.pdf"

        doc = fitz.open()
        for index in range(3):
            page = doc.new_page(width=200, height=120)
            page.insert_text((20, 40), f"source page {index + 1}", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        write_pdf(page_two_overlay, width=200, height=120, text="page two overlay", at=(20, 80), fontsize=12)

        result = overlay_page_pdfs_with_pikepdf(
            source_pdf_path=source_pdf,
            overlay_paths_by_page_index={1: page_two_overlay},
            output_pdf_path=output_pdf,
        )

        assert result.pages_merged == 1
        merged = fitz.open(output_pdf)
        try:
            assert "page two overlay" not in merged[0].get_text()
            assert "page two overlay" in merged[1].get_text()
            assert "page two overlay" not in merged[2].get_text()
        finally:
            merged.close()


def test_pikepdf_overlay_merges_chunk_pdfs_by_source_pages() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        chunk_one_pdf = root / "chunk-one.pdf"
        chunk_two_pdf = root / "chunk-two.pdf"
        output_pdf = root / "merged.pdf"

        doc = fitz.open()
        for index in range(4):
            page = doc.new_page(width=200, height=120)
            page.insert_text((20, 40), f"source page {index + 1}", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        doc = fitz.open()
        page = doc.new_page(width=200, height=120)
        page.insert_text((20, 80), "chunk one page one", fontsize=12)
        page = doc.new_page(width=200, height=120)
        page.insert_text((20, 80), "chunk one page two", fontsize=12)
        doc.save(chunk_one_pdf)
        doc.close()

        write_pdf(chunk_two_pdf, width=200, height=120, text="chunk two page one", at=(20, 80), fontsize=12)

        result = overlay_pdf_chunks_with_pikepdf(
            source_pdf_path=source_pdf,
            overlay_chunks=[
                PikepdfOverlayChunk(chunk_one_pdf, [0, 1]),
                PikepdfOverlayChunk(chunk_two_pdf, [3]),
            ],
            output_pdf_path=output_pdf,
        )

        assert result.pages_merged == 3
        merged = fitz.open(output_pdf)
        try:
            assert "chunk one page one" in merged[0].get_text()
            assert "chunk one page two" in merged[1].get_text()
            assert "chunk two page one" not in merged[2].get_text()
            assert "chunk two page one" in merged[3].get_text()
        finally:
            merged.close()


def test_single_pdf_overlay_can_write_final_pdf_with_pikepdf() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        overlay_pdf = root / "overlay.pdf"
        output_pdf = root / "merged.pdf"

        doc = fitz.open()
        for index in range(2):
            page = doc.new_page(width=200, height=120)
            page.insert_text((20, 40), f"source page {index + 1}", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        doc = fitz.open()
        for index in range(2):
            page = doc.new_page(width=200, height=120)
            page.insert_text((20, 80), f"overlay page {index + 1}", fontsize=12)
        doc.save(overlay_pdf)
        doc.close()

        source_doc = fitz.open(source_pdf)
        try:
            diagnostics = overlay_pages_from_single_pdf(
                source_doc,
                [0, 1],
                {
                    0: [{"item_id": "p001-b001", "bbox": [10.0, 10.0, 50.0, 30.0]}],
                    1: [{"item_id": "p002-b001", "bbox": [10.0, 10.0, 50.0, 30.0]}],
                },
                overlay_pdf,
                apply_source_overlay=False,
                skip_visual_cover=True,
                source_base_pdf_path=source_pdf,
                pikepdf_output_pdf_path=output_pdf,
            )
        finally:
            source_doc.close()

        assert diagnostics["mode"] == "single_pdf_overlay_pikepdf"
        assert diagnostics["pikepdf_overlay_pages"] == 2
        merged = fitz.open(output_pdf)
        try:
            assert "source page 1" in merged[0].get_text()
            assert "overlay page 1" in merged[0].get_text()
            assert "source page 2" in merged[1].get_text()
            assert "overlay page 2" in merged[1].get_text()
        finally:
            merged.close()


def test_pikepdf_extract_pages_copies_selected_page() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "selected.pdf"
        doc = fitz.open()
        for index in range(3):
            page = doc.new_page(width=200, height=120)
            page.insert_text((20, 40), f"page {index + 1}", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        extract_pages_with_pikepdf(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            start_page=1,
            end_page=1,
        )

        selected = fitz.open(output_pdf)
        try:
            assert selected.page_count == 1
            text = selected[0].get_text()
        finally:
            selected.close()
        assert "page 2" in text
        assert "page 1" not in text
