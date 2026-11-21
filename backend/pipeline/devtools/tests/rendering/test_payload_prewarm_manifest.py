"""payload 预热 manifest 里暴露给后续渲染的东西：bbox 候选、视觉配色、几何调整、OCR 预处理一致性。

从 test_render_prewarm.py 整块拆出，用例本身未改。
"""

import tempfile
import json
from pathlib import Path

from devtools.tests.rendering_support.prewarm_fixtures import source_document_analysis
from devtools.tests.rendering_support.prewarm_fixtures import tight_gap_page_payload as _tight_gap_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_document_v1 as _document_v1
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from retainpdf_pipeline.foundation.config import layout
from retainpdf_pipeline.render.source.prewarm import RenderPrewarmSpec
from retainpdf_pipeline.render.source.prewarm import prewarm_manifest_path_from_artifacts_dir
from retainpdf_pipeline.render.source.prewarm import start_render_source_prewarm
from retainpdf_pipeline.render.source.prewarm import try_load_render_payload_prewarm
from retainpdf_pipeline.render.source.prewarm import try_load_prewarmed_render_source_pdf
from retainpdf_pipeline.render.source.prewarm_payload import build_payload_prewarm
from retainpdf_pipeline.render.pdf_structure_profile import pdf_structure_profile_path_from_prewarm_manifest
from retainpdf_pipeline.render.visual_profile import visual_profile_path_from_prewarm_manifest
from retainpdf_pipeline.render.visual_profile.contracts import VISUAL_PROFILE_ALGORITHM_VERSION
from retainpdf_pipeline.render.workflow.prewarm_entry import run_ocr_render_preprocess


def test_ocr_render_preprocess_manifest_matches_translated_payload() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        source_json = root / "ocr" / "normalized" / "document.v1.json"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)
        _document_v1(source_json)

        manifest_path = run_ocr_render_preprocess(
            source_json_path=source_json,
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            artifacts_dir=artifacts_dir,
            render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
            math_mode="direct_typst",
        )

        translated_payload = _translated_page_payload()
        translated_payload[0][0]["item_id"] = "p001-b000"
        translated_payload[0][0]["translation_unit_id"] = "p001-b000"
        translated_payload[0][0]["translation_unit_member_ids"] = ["p001-b000"]
        translated_payload[0][0]["raw_block_type"] = "text"
        translated_payload[0][0]["normalized_sub_type"] = "text"

        assert manifest_path == prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        assert try_load_prewarmed_render_source_pdf(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=translated_payload,
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        ) is None
        payload = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=translated_payload,
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
        )
        assert payload is not None
        assert payload.render_colors_by_item_id
        assert payload.document_analysis is not None


def test_payload_prewarm_writes_visual_profile_color_manifest() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        manifest_path = root / "artifacts" / "render_prewarm" / "render_source_prewarm_manifest.json"
        manifest_path.parent.mkdir(parents=True)
        _source_pdf(source_pdf)

        payload = build_payload_prewarm(
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            manifest_path=manifest_path,
            effective_render_mode="overlay",
            source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
        )

        color_profile = payload["render_color_profile"]
        assert color_profile["algorithm"] == "render_color_profile_v3_visual_profile"
        assert payload["pdf_structure_profile_path"] == "pdf_structure_profile.v1.json"
        assert payload["visual_profile_path"] == "visual_profile.v1.json"
        assert color_profile["visual_profile_path"] == "visual_profile.v1.json"
        assert color_profile["colors_by_item_id"]
        visual_profile_path = visual_profile_path_from_prewarm_manifest(manifest_path)
        visual_profile = json.loads(visual_profile_path.read_text(encoding="utf-8"))
        assert visual_profile["algorithm"] == VISUAL_PROFILE_ALGORITHM_VERSION
        assert "p001-b001" in visual_profile["pages"]["0"]["items"]
        structure_profile_path = pdf_structure_profile_path_from_prewarm_manifest(manifest_path)
        structure_profile = json.loads(structure_profile_path.read_text(encoding="utf-8"))
        assert structure_profile["algorithm"] == "pdf_structure_profile_v1"
        assert structure_profile["pages"]["0"]["text_objects"]


def test_payload_prewarm_loads_visual_profile_path_from_manifest() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
        )

        assert payload_prewarm is not None
        assert payload_prewarm.visual_profile_path == visual_profile_path_from_prewarm_manifest(manifest_path)
        assert payload_prewarm.visual_profile_path.exists()
        assert payload_prewarm.pdf_structure_profile_path == pdf_structure_profile_path_from_prewarm_manifest(manifest_path)
        assert payload_prewarm.pdf_structure_profile_path.exists()
        assert payload_prewarm.render_colors_by_item_id


def test_payload_prewarm_manifest_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                document_analysis=source_document_analysis(source_pdf),
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.document_analysis is not None
        assert payload_prewarm.document_analysis.page(0) is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_payload_prewarm_pikepdf_text_strip_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="pikepdf_text_strip",
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="pikepdf_text_strip",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_payload_prewarm_default_pikepdf_text_strip_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_redact_restore_formula_strategy_is_runtime_alias_for_pikepdf_text_strip() -> None:
    assert layout.normalize_source_cleanup_strategy("redact_restore_formulas") == "pikepdf_text_strip"
    assert layout.use_bbox_text_strip_cleanup("redact_restore_formulas") is True
    assert layout.use_redact_restore_formula_cleanup("redact_restore_formulas") is False


def test_payload_prewarm_explicit_typst_fill_skips_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="typst_fill",
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="typst_fill",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is None


def test_payload_prewarm_manifest_exposes_geometry_adjustments() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_tight_gap_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_tight_gap_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

        assert payload_prewarm is not None
        adjusted = payload_prewarm.effective_inner_bbox_lookup["p001-b001"]
        assert adjusted[1] > 20.0
        assert adjusted[3] < 70.0
