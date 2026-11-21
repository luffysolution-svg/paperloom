import tempfile
from pathlib import Path
from unittest import mock

import fitz


from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs
from retainpdf_pipeline.render.output.typst.book_renderer import _compile_render_pages_pdf_resilient
from retainpdf_pipeline.render.output.typst.emitter import build_typst_source_from_page_specs


def test_background_render_resilient_compile_sanitizes_on_failure() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        background_pdf = root / "background.pdf"

        doc = fitz.open()
        doc.new_page(width=200, height=300)
        doc.save(source_pdf)
        doc.save(background_pdf)
        doc.close()

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "raw text",
                    "protected_source_text": "raw text",
                    "protected_translated_text": "translated text",
                }
            ]
        }
        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        sanitized_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "raw text",
                    "protected_source_text": "raw text",
                    "protected_translated_text": "sanitized text",
                }
            ]
        }

        with mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.compile_typst_render_pages_pdf",
            side_effect=[RuntimeError("mitex failed"), root / "probe.pdf", root / "sanitized.pdf"],
        ) as compile_mock, mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.collect_background_page_specs",
            return_value=[(0, 200.0, 300.0, translated_pages[0])],
        ), mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.sanitize_page_specs_for_typst_book_background",
            return_value=[(0, 200.0, 300.0, sanitized_pages[0])],
        ):
            result, diagnostics = _compile_render_pages_pdf_resilient(
                source_pdf_path=source_pdf,
                color_sample_pdf_path=source_pdf,
                background_pdf_path=background_pdf,
                translated_pages=translated_pages,
                page_specs=page_specs,
                work_dir=root,
            )

        assert result == root / "sanitized.pdf"
        assert diagnostics["background_compile_retried"] is True
        assert diagnostics["background_compile_failed"] is True
        assert "background_sanitize_elapsed_seconds" in diagnostics
        assert compile_mock.call_count == 3
        assert compile_mock.call_args_list[2].kwargs["stem"] == "book-background-overlay-sanitized"


def test_background_render_resilient_compile_sanitizes_only_bad_pages() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        background_pdf = root / "background.pdf"

        doc = fitz.open()
        for _ in range(4):
            doc.new_page(width=200, height=300)
        doc.save(source_pdf)
        doc.save(background_pdf)
        doc.close()

        translated_pages = {
            page_idx: [
                {
                    "item_id": f"p{page_idx + 1:03d}-b001",
                    "page_idx": page_idx,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "raw text",
                    "protected_source_text": "raw text",
                    "protected_translated_text": "translated text",
                }
            ]
            for page_idx in range(4)
        }
        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        def fake_compile(*, page_specs, stem, **kwargs):
            del kwargs
            if stem == "book-background-overlay":
                raise RuntimeError("mitex failed")
            if "probe" in stem and any(spec.page_index == 2 for spec in page_specs):
                raise RuntimeError("mitex failed")
            return root / f"{stem}.pdf"

        with mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.compile_typst_render_pages_pdf",
            side_effect=fake_compile,
        ), mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.collect_background_page_specs",
            return_value=[
                (page_idx, 200.0, 300.0, translated_pages[page_idx])
                for page_idx in range(4)
            ],
        ), mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.sanitize_page_specs_for_typst_book_background",
            return_value=[
                (page_idx, 200.0, 300.0, translated_pages[page_idx])
                for page_idx in range(4)
            ],
        ) as sanitize_mock:
            result, diagnostics = _compile_render_pages_pdf_resilient(
                source_pdf_path=source_pdf,
                color_sample_pdf_path=source_pdf,
                background_pdf_path=background_pdf,
                translated_pages=translated_pages,
                page_specs=page_specs,
                work_dir=root,
            )

        assert result == root / "book-background-overlay-sanitized.pdf"
        assert diagnostics["background_bad_page_indices"] == [2]
        assert sanitize_mock.call_args.kwargs["page_indices"] == {2}


def test_background_render_color_adapt_samples_original_pdf_not_cleaned_background() -> None:
    from retainpdf_pipeline.render.output.typst.book_renderer import _apply_background_page_color_adapt

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        original_pdf = root / "original.pdf"
        cleaned_pdf = root / "cleaned.pdf"

        doc = fitz.open()
        page = doc.new_page(width=200, height=160)
        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(20, 30, 150, 80))
        shape.finish(color=None, fill=(216 / 255.0, 216 / 255.0, 216 / 255.0))
        shape.commit()
        page.insert_text((28, 54), "source text", fontsize=10, color=(0, 0, 0))
        doc.save(original_pdf)
        doc.close()

        doc = fitz.open()
        page = doc.new_page(width=200, height=160)
        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(20, 30, 150, 80))
        shape.finish(color=None, fill=(1, 1, 1))
        shape.commit()
        doc.save(cleaned_pdf)
        doc.close()

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "block_kind": "text",
                    "bbox": [26.0, 40.0, 130.0, 66.0],
                    "lines": [{"text": "source text", "bbox": [26.0, 40.0, 130.0, 66.0]}],
                    "source_text": "source text",
                    "protected_source_text": "source text",
                        "protected_translated_text": "译文",
                        "translated_text": "译文",
                        "formula_map": [],
                        "_render_policy": {"overlay_fill": "sampled"},
                        "_render_use_cover_fill": True,
                    }
                ]
            }
        adapted_pages = _apply_background_page_color_adapt(
            sample_pdf_path=original_pdf,
            translated_pages=translated_pages,
        )
        page_specs = build_render_page_specs(
            source_pdf_path=cleaned_pdf,
            translated_pages=adapted_pages,
            background_pdf_path=cleaned_pdf,
            prepared=True,
        )
        source = build_typst_source_from_page_specs(
            background_pdf_path=cleaned_pdf,
            page_specs=page_specs,
            work_dir=root,
        )

    assert "fill: rgb(216, 216, 216)" in source
    assert "fill: rgb(255, 255, 255)" not in source


def test_background_render_resilient_compile_falls_back_to_page_overlay() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        background_pdf = root / "background.pdf"

        doc = fitz.open()
        doc.new_page(width=200, height=300)
        doc.save(source_pdf)
        doc.save(background_pdf)
        doc.close()

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "raw text",
                    "protected_source_text": "raw text",
                    "protected_translated_text": "translated text",
                }
            ]
        }
        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        sanitized_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "raw text",
                    "protected_source_text": "raw text",
                    "protected_translated_text": "sanitized text",
                }
            ]
        }

        with mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.compile_typst_render_pages_pdf",
            side_effect=[RuntimeError("mitex failed"), root / "probe.pdf", RuntimeError("still failing")],
        ) as compile_mock, mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.collect_background_page_specs",
            return_value=[(0, 200.0, 300.0, translated_pages[0])],
        ), mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.sanitize_page_specs_for_typst_book_background",
            return_value=[(0, 200.0, 300.0, sanitized_pages[0])],
        ), mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.overlay_pages_via_page_fallback",
            return_value={},
        ) as fallback_mock, mock.patch(
            "retainpdf_pipeline.render.output.typst.book_renderer.save_optimized_pdf",
        ) as save_mock:
            result, diagnostics = _compile_render_pages_pdf_resilient(
                source_pdf_path=source_pdf,
                color_sample_pdf_path=source_pdf,
                background_pdf_path=background_pdf,
                translated_pages=translated_pages,
                page_specs=page_specs,
                work_dir=root,
            )

        assert result == root / "book-background-overlay-fallback.pdf"
        assert diagnostics["background_fallback_overlay"] is True
        assert diagnostics["background_compile_retried"] is True
        assert compile_mock.call_count == 3
        fallback_mock.assert_called_once()
        _doc, ordered_pages, fallback_specs, fallback_translated = fallback_mock.call_args.args[:4]
        assert ordered_pages == [0]
        assert len(fallback_specs) == 1
        assert fallback_specs[0][:3] == (0, 200.0, 300.0)
        assert fallback_specs[0][4] == "book-background-overlay-fallback-000"
        assert fallback_translated[0][0]["protected_translated_text"] == "sanitized text"
        assert fallback_mock.call_args.kwargs["cover_only"] is False
        assert fallback_mock.call_args.kwargs["apply_source_overlay"] is True
        save_mock.assert_called_once()
        assert save_mock.call_args.args[1] == root / "book-background-overlay-fallback.pdf"


def _locate_with_bad_positions(total: int, bad: set[int]):
    from types import SimpleNamespace

    from retainpdf_pipeline.render.output.typst import book_renderer

    specs = [SimpleNamespace(page_index=index) for index in range(total)]
    stems: list[str] = []

    def fake_subset(*, page_indices, stem, **kwargs):
        stems.append(stem)
        if any(index in bad for index in page_indices):
            raise RuntimeError("mitex failed")

    with mock.patch.object(book_renderer, "_compile_render_page_subset", side_effect=fake_subset):
        found = book_renderer._locate_bad_render_page_indices(
            background_pdf_path=Path("/tmp/background.pdf"),
            page_specs=specs,
            font_family="Source Han Serif SC",
            font_paths=None,
            work_dir=Path("/tmp"),
        )
    return found, stems


def test_locate_bad_pages_probes_level_order() -> None:
    found, stems = _locate_with_bad_positions(4, {2})

    assert found == [2]
    assert len(stems) == 4
    assert len(set(stems)) == 4
    assert all("probe" in stem for stem in stems)


def test_locate_bad_pages_finds_multiple_without_full_reprobe() -> None:
    found, stems = _locate_with_bad_positions(4, {1, 3})

    assert found == [1, 3]
    assert len(stems) == 6


def test_locate_bad_pages_empty_and_singleton() -> None:
    found, stems = _locate_with_bad_positions(0, set())
    assert found == []
    assert stems == []

    from types import SimpleNamespace

    from retainpdf_pipeline.render.output.typst import book_renderer

    specs = [SimpleNamespace(page_index=0)]
    with mock.patch.object(
        book_renderer, "_compile_render_page_subset", side_effect=RuntimeError("mitex failed")
    ) as subset_mock:
        found = book_renderer._locate_bad_render_page_indices(
            background_pdf_path=Path("/tmp/background.pdf"),
            page_specs=specs,
            font_family="Source Han Serif SC",
            font_paths=None,
            work_dir=Path("/tmp"),
        )

    assert found == [0]
    assert subset_mock.call_count == 1


def test_locate_bad_pages_probes_frontier_concurrently() -> None:
    import threading
    from types import SimpleNamespace

    from retainpdf_pipeline.render.output.typst import book_renderer

    specs = [SimpleNamespace(page_index=index) for index in range(4)]
    barrier = threading.Barrier(2, timeout=30)

    def fake_subset(*, page_indices, stem, **kwargs):
        barrier.wait(timeout=30)
        if 2 in page_indices:
            raise RuntimeError("mitex failed")

    with mock.patch.object(book_renderer, "_compile_render_page_subset", side_effect=fake_subset):
        found = book_renderer._locate_bad_render_page_indices(
            background_pdf_path=Path("/tmp/background.pdf"),
            page_specs=specs,
            font_family="Source Han Serif SC",
            font_paths=None,
            work_dir=Path("/tmp"),
            compile_workers=2,
        )

    assert found == [2]
