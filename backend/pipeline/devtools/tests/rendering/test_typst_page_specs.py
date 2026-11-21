import tempfile
from pathlib import Path

import fitz


from retainpdf_pipeline.render.layout.model.models import RenderLayoutBlock
from retainpdf_pipeline.render.layout.model.models import RenderPageSpec
from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs
from devtools.tests.pdf_fixtures import write_pdf


def test_build_render_page_specs_uses_layout_block_protocol() -> None:
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
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "source_text": "Raw CBFZ text with formula",
                    "protected_source_text": "Raw <f1-17a/> text",
                    "protected_translated_text": "译文 <f1-17a/> 内容",
                    "formula_map": [
                        {
                            "placeholder": "<f1-17a/>",
                            "formula_text": r"(\mathrm{CaO}_2)",
                            "kind": "formula",
                        }
                    ],
                }
            ]
        }

        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
        )

        assert len(page_specs) == 1
        spec = page_specs[0]
        assert isinstance(spec, RenderPageSpec)
        assert spec.page_index == 0
        assert len(spec.blocks) == 1

        block = spec.blocks[0]
        assert isinstance(block, RenderLayoutBlock)
        assert block.block_id == "item-p001-b001"
        assert block.content_kind == "markdown"
        assert "$(" in block.content_text
        assert block.content_rect == [10.0, 20.0, 180.0, 80.0]
        assert block.background_rect[0] < 10.0
        assert block.background_rect[1] < 20.0
        assert block.background_rect[2] > 180.0
        assert block.background_rect[3] > 80.0
        assert 8.4 <= block.font_size_pt <= 11.6
        assert 0.28 <= block.leading_em <= 0.74


def test_build_render_page_specs_reports_progress_only_via_callback() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"

        doc = fitz.open()
        doc.new_page(width=200, height=300)
        doc.new_page(width=200, height=300)
        doc.save(source_pdf)
        doc.close()

        translated_pages = {
            0: [
                {
                    "item_id": "p001-b001",
                    "page_idx": 0,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "translated_text": "第一页",
                }
            ],
            1: [
                {
                    "item_id": "p002-b001",
                    "page_idx": 1,
                    "block_type": "text",
                    "bbox": [10.0, 20.0, 180.0, 80.0],
                    "lines": [{"text": "raw"}],
                    "translated_text": "第二页",
                }
            ],
        }
        progress: list[tuple[int, int, int]] = []

        page_specs = build_render_page_specs(
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
            on_page_spec_built=lambda completed, total, page_index: progress.append(
                (completed, total, page_index)
            ),
        )

        assert [spec.page_index for spec in page_specs] == [0, 1]
        assert progress == [(1, 2, 0), (2, 2, 1)]


def test_page_specs_parallel_matches_sequential() -> None:
    from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs_from_page_sizes

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
                "protected_translated_text": f"译文 {page_idx}",
            }
        ]
        for page_idx in range(32)
    }
    page_size_lookup = {page_idx: (200.0, 300.0) for page_idx in range(32)}

    sequential = build_render_page_specs_from_page_sizes(
        translated_pages=translated_pages,
        page_size_lookup=page_size_lookup,
        max_workers=1,
    )
    parallel = build_render_page_specs_from_page_sizes(
        translated_pages=translated_pages,
        page_size_lookup=page_size_lookup,
        max_workers=2,
    )

    assert parallel == sequential
    assert [spec.page_index for spec in parallel] == list(range(32))
