"""bbox 文字剥离的执行层：并行 worker 数与阈值、分块均衡、候选 manifest、保护变化时重新规划。

从 test_bbox_text_strip_document.py 整块拆出，用例本身未改。
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import fitz
import pikepdf
import pytest
from pikepdf import Name

from retainpdf_pipeline.render.source_cleanup.pdf import document as source_cleanup_document
from retainpdf_pipeline.render.source_cleanup import build_bbox_text_stripped_pdf_copy
from retainpdf_pipeline.render.source.prewarm_manifest_io import bbox_candidates_from_manifest
from retainpdf_pipeline.render.source.prewarm_manifest_io import bbox_candidates_to_manifest
from retainpdf_pipeline.render.source_cleanup.types import BBoxTextStripCandidates
from devtools.tests.pdf_fixtures import write_pdf


def test_bbox_text_strip_parallel_worker_count_scales_for_medium_documents() -> None:
    assert source_cleanup_document._parallel_worker_count(30) >= 2
    assert source_cleanup_document._parallel_worker_count(500) <= source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS


def test_bbox_text_strip_parallel_threshold_scales_with_cpu_count(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RETAIN_BBOX_TEXT_STRIP_PARALLEL_THRESHOLD", raising=False)
    monkeypatch.setattr(source_cleanup_document.os, "cpu_count", lambda: 4)
    assert source_cleanup_document._parallel_worker_count(500) == 4

    monkeypatch.setattr(source_cleanup_document.os, "cpu_count", lambda: 8)
    assert source_cleanup_document._parallel_worker_count(500) == source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS


def test_bbox_text_strip_parallel_threshold_can_be_overridden(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_PARALLEL_THRESHOLD", "18")

    assert source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD == 12


def test_bbox_text_strip_worker_override_is_clamped_to_ceiling(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(source_cleanup_document.os, "cpu_count", lambda: 8)

    monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "1000")
    assert source_cleanup_document._parallel_worker_count(500) == source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS

    monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "0")
    assert source_cleanup_document._parallel_worker_count(500) == 1

    monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "abc")
    assert source_cleanup_document._parallel_worker_count(500) == source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS

    monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "3")
    assert source_cleanup_document._parallel_worker_count(500) == 3


def test_bbox_text_strip_chunks_balance_decoded_stream_weights() -> None:
    pdf = pikepdf.Pdf.new()
    sizes = [1200, 1100, 1000, 220, 210, 200, 190, 180, 170]
    for size in sizes:
        page = pdf.add_blank_page(page_size=(120, 120))
        page.obj[Name("/Contents")] = pdf.make_stream(b"q\n" + (b" " * size) + b"\nQ")

    page_rects = {
        index: [fitz.Rect(10.0, 10.0, 60.0, 40.0)]
        for index in range(len(sizes))
    }

    chunks = source_cleanup_document._page_chunks(pdf, page_rects, {}, 3)
    loads = [sum(weight for _page_idx, weight, _rects, _protected in chunk) for chunk in chunks]

    assert len(chunks) == 3
    assert max(loads) - min(loads) < max(sizes)


def test_bbox_text_strip_candidates_manifest_preserves_runtime_skip_metadata() -> None:
    candidates = BBoxTextStripCandidates(
        page_rects={1: ((10.0, 20.0, 30.0, 40.0),)},
        page_protected_rects={1: ((12.0, 22.0, 18.0, 28.0),)},
        pages_skipped_complex=1,
        pages_skipped_form_xobject=2,
        pages_strip_no_effect=3,
        skipped_complex_page_indices=frozenset({4}),
        skipped_form_xobject_page_indices=frozenset({5, 6}),
        strip_no_effect_page_indices=frozenset({7, 8, 9}),
        page_features={1: {"content_stream_size": 1234, "has_form_xobjects": True}},
    )

    restored = bbox_candidates_from_manifest(bbox_candidates_to_manifest(candidates))

    assert restored is not None
    assert restored.page_rects == candidates.page_rects
    assert candidates.candidate_source == "fresh_plan"
    assert restored.candidate_source == "manifest"
    assert restored.skipped_form_xobject_page_indices == frozenset({5, 6})
    assert restored.strip_no_effect_page_indices == frozenset({7, 8, 9})
    assert restored.page_features[1]["content_stream_size"] == 1234


def test_execute_source_cleanup_replans_when_protected_pages_present() -> None:
    from retainpdf_pipeline.render.source_cleanup.contracts import SourceCleanupRequest
    from retainpdf_pipeline.render.source_cleanup.executor import execute_source_cleanup
    from retainpdf_pipeline.render.source_cleanup.planning.planner import plan_source_cleanup

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        write_pdf(source_pdf, width=200, height=200, text="inside text", at=(20, 40), fontsize=12)

        translated_pages = {
            0: [
                {
                    "block_kind": "text",
                    "bbox": [10.0, 20.0, 140.0, 55.0],
                    "protected_translated_text": "译文",
                }
            ]
        }
        stale_candidates = plan_source_cleanup(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )
        assert stale_candidates.page_rects != {}

        result = execute_source_cleanup(
            SourceCleanupRequest(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                translated_pages=translated_pages,
                protected_pages={0: [{"bbox": [10.0, 20.0, 140.0, 55.0]}]},
                candidates=stale_candidates,
            )
        )

        assert result.changed is False
        assert result.bbox_text_strip.text_show_ops_removed == 0


def test_execute_source_cleanup_reuses_candidates_when_protection_matches() -> None:
    from retainpdf_pipeline.render.source_cleanup.contracts import SourceCleanupRequest
    from retainpdf_pipeline.render.source_cleanup.executor import execute_source_cleanup
    from retainpdf_pipeline.render.source_cleanup.planning.planner import plan_source_cleanup

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        write_pdf(source_pdf, width=200, height=200, text="inside text", at=(20, 40), fontsize=12)

        translated_pages = {
            0: [
                {
                    "block_kind": "text",
                    "bbox": [10.0, 20.0, 140.0, 55.0],
                    "protected_translated_text": "译文",
                }
            ]
        }
        protected_pages = {0: [{"bbox": [10.0, 20.0, 140.0, 55.0]}]}
        matching_candidates = plan_source_cleanup(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
            protected_pages=protected_pages,
        )
        from dataclasses import replace

        manifest_candidates = replace(matching_candidates, candidate_source="manifest")

        result = execute_source_cleanup(
            SourceCleanupRequest(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                translated_pages=translated_pages,
                protected_pages=protected_pages,
                candidates=manifest_candidates,
            )
        )

        assert result.changed is False
        assert result.bbox_text_strip.candidates is not None
        assert result.bbox_text_strip.candidates.candidate_source == "manifest"
        assert (
            result.bbox_text_strip.candidates.protected_fingerprint
            == manifest_candidates.protected_fingerprint
        )


def test_bbox_text_strip_parallel_matches_serial(monkeypatch: pytest.MonkeyPatch) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        doc = fitz.open()
        for index in range(20):
            page = doc.new_page(width=240, height=180)
            page.insert_text((30, 50), f"remove me {index}", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        translated_pages = {
            index: [
                {
                    "block_kind": "text",
                    "bbox": [20.0, 30.0, 200.0, 70.0],
                    "protected_translated_text": "译文",
                }
            ]
            for index in range(20)
        }

        def _run(workers: str | None) -> tuple[list[str], int]:
            if workers is None:
                monkeypatch.delenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", raising=False)
            else:
                monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", workers)
            output_pdf = root / f"stripped-{workers or 'pool'}.pdf"
            result = build_bbox_text_stripped_pdf_copy(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                translated_pages=translated_pages,
            )
            naive_doc = fitz.open(output_pdf)
            try:
                texts = [naive_doc[index].get_text() for index in range(20)]
            finally:
                naive_doc.close()
            return texts, result.text_show_ops_removed

        pool_texts, pool_removed = _run(None)
        serial_texts, serial_removed = _run("1")

        assert pool_removed == serial_removed > 0
        assert pool_texts == serial_texts
