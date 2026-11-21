"""预热指纹：渲染算法、译文、公式映射任何一样变了，旧的预热产物都不能再复用。

从 test_render_prewarm.py 整块拆出，用例本身未改。
"""

import tempfile
from pathlib import Path

from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from retainpdf_pipeline.render.source.prewarm import PAYLOAD_RENDER_ALGORITHM_VERSION
from retainpdf_pipeline.render.source.prewarm import build_render_prewarm_fingerprint


def test_render_prewarm_fingerprint_tracks_payload_render_algorithm() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        fingerprint = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert fingerprint["payload_render_algorithm"] == PAYLOAD_RENDER_ALGORITHM_VERSION
    assert fingerprint["bbox_text_strip_algorithm"] == "bbox_text_strip"
    assert len(str(fingerprint["bbox_text_strip_implementation_hash"])) == 64


def test_render_prewarm_fingerprint_tracks_translated_text_changes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        first_payload = _translated_page_payload()
        second_payload = _translated_page_payload()
        second_payload[0][0]["protected_translated_text"] = "另一版译文"

        first = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=first_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )
        second = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=second_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert first["render_payload_hash"] != second["render_payload_hash"]
    assert first != second


def test_render_prewarm_fingerprint_tracks_formula_map_changes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        first_payload = _translated_page_payload()
        second_payload = _translated_page_payload()
        first_payload[0][0]["formula_map"] = [{"placeholder": "<f0-abc/>", "formula_text": "c_{\\kappa}"}]
        second_payload[0][0]["formula_map"] = [{"placeholder": "<f0-abc/>", "formula_text": "c_{\\lambda}"}]

        first = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=first_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )
        second = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=second_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert first["render_payload_hash"] != second["render_payload_hash"]
    assert first != second
