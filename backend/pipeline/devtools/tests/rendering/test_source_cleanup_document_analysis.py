from __future__ import annotations

import sys
import tempfile
from pathlib import Path


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import empty_region_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf
from retainpdf_pipeline.render.analysis.document.builder import build_render_page_analysis
from retainpdf_pipeline.render.analysis.document.models import RenderDocumentAnalysis
from devtools.tests.rendering_support.page_profiles import sample_render_page_profile
from retainpdf_pipeline.render.source_cleanup.planning.planner import plan_source_cleanup


def test_source_cleanup_skips_physical_delete_when_document_analysis_requires_visual_cover() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        source_pdf = Path(tmp) / "source.pdf"
        write_source_pdf(source_pdf)
        page_analysis = build_render_page_analysis(sample_render_page_profile("pseudo_editable_scan"))

        candidates = plan_source_cleanup(
            source_pdf_path=source_pdf,
            translated_pages=translated_page_payload(),
            document_analysis=RenderDocumentAnalysis(pages={0: page_analysis}),
        )

    assert candidates.page_rects == {}
    assert candidates.pages_skipped_visual_background == 1
    assert candidates.skipped_visual_background_page_indices == frozenset({0})


def test_source_cleanup_skips_page_without_source_text_overlap() -> None:
    pages = empty_region_page_payload()
    # Keep the region away from source text in both PDF and display coordinates.
    pages[0][0]["bbox"] = [160.0, 80.0, 190.0, 110.0]
    with tempfile.TemporaryDirectory() as tmp:
        source_pdf = Path(tmp) / "source.pdf"
        write_source_pdf(source_pdf)

        candidates = plan_source_cleanup(
            source_pdf_path=source_pdf,
            translated_pages=pages,
        )

    assert candidates.page_rects == {}
    assert candidates.pages_skipped_no_text_overlap == 1
    assert candidates.skipped_no_text_overlap_page_indices == frozenset({0})
    assert candidates.pages_skipped_visual_background == 0


def test_source_cleanup_keeps_page_with_source_text_overlap() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        source_pdf = Path(tmp) / "source.pdf"
        write_source_pdf(source_pdf)

        candidates = plan_source_cleanup(
            source_pdf_path=source_pdf,
            translated_pages=translated_page_payload(),
        )

    assert candidates.page_rects[0]
    assert candidates.pages_skipped_no_text_overlap == 0
    assert candidates.skipped_no_text_overlap_page_indices == frozenset()
