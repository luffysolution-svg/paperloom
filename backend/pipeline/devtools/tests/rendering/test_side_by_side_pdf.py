import sys
from pathlib import Path

import fitz
import hashlib
import pytest


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from retainpdf_pipeline.render.tools.side_by_side_pdf import build_side_by_side_pdf


def _write_pdf(path: Path, page_sizes: list[tuple[int, int]], label: str) -> None:
    doc = fitz.open()
    for index, (width, height) in enumerate(page_sizes):
        page = doc.new_page(width=width, height=height)
        page.insert_text((24, 36), f"{label} {index + 1}")
    doc.save(path)
    doc.close()


def test_build_side_by_side_pdf_places_source_and_translation_pages(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    translated_pdf = tmp_path / "translated.pdf"
    output_pdf = tmp_path / "side-by-side.pdf"
    _write_pdf(source_pdf, [(200, 300), (200, 300)], "source")
    _write_pdf(translated_pdf, [(250, 320)], "translated")

    build_side_by_side_pdf(source_pdf, translated_pdf, output_pdf)

    with fitz.open(output_pdf) as doc:
        assert doc.page_count == 2
        assert round(doc[0].rect.width) == 450
        assert round(doc[0].rect.height) == 320
        assert round(doc[1].rect.width) == 400
        assert round(doc[1].rect.height) == 300
        assert "source 1" in doc[0].get_text()
        assert "translated 1" in doc[0].get_text()
        assert "source 2" in doc[1].get_text()


@pytest.mark.parametrize("rotation", [90, 180, 270])
@pytest.mark.parametrize("cropped", [False, True])
def test_rotated_both_panes_match_input_pixels_without_mutating_inputs(tmp_path, rotation, cropped):
    source, translated, output = [tmp_path / name for name in ("source.pdf", "translated.pdf", "side.pdf")]
    for path, offset in ((source, 0), (translated, 20)):
        with fitz.open() as doc:
            # Mixed sizes exercise page-local geometry rather than a document-wide rotation.
            for width, height in ((200, 300), (260, 340)):
                page = doc.new_page(width=width, height=height)
                page.draw_rect(fitz.Rect(20 + offset, 40, 60 + offset, 80), color=(1, 0, 0), fill=(1, 0, 0))
                page.draw_rect(fitz.Rect(140, 220, 180, 260), color=(0, 0, 1), fill=(0, 0, 1))
                page.insert_text((20, 110), "ROTATION FIXTURE")
                if cropped:
                    page.set_cropbox(fitz.Rect(10, 15, width - 30, height - 25))
                page.set_rotation(rotation)
            doc.save(path)
    before = {path: hashlib.sha256(path.read_bytes()).digest() for path in (source, translated)}
    build_side_by_side_pdf(source, translated, output)
    with fitz.open(source) as left_doc, fitz.open(translated) as right_doc, fitz.open(output) as result:
        for index in range(2):
            left_width = left_doc[index].rect.width
            for doc, x in ((left_doc, 0), (right_doc, left_width)):
                expected = doc[index].get_pixmap(alpha=False)
                actual = result[index].get_pixmap(clip=fitz.Rect(x, 0, x + doc[index].rect.width, doc[index].rect.height), alpha=False)
                assert (actual.width, actual.height) == (expected.width, expected.height)
                assert actual.samples == expected.samples
            assert "ROTATION FIXTURE" in result[index].get_text()
    assert {path: hashlib.sha256(path.read_bytes()).digest() for path in before} == before
