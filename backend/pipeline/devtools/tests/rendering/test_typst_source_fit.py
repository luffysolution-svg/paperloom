import tempfile
from pathlib import Path
import re


from retainpdf_pipeline.render.layout.model.models import RenderLayoutBlock
from retainpdf_pipeline.render.layout.model.models import RenderPageSpec
from retainpdf_pipeline.render.output.typst.emitter import build_typst_source_from_page_specs
from devtools.tests.pdf_fixtures import write_pdf


def test_typst_render_source_keeps_title_fit_inside_rect_budget() -> None:
    spec = RenderPageSpec(
        page_index=0,
        page_width_pt=200.0,
        page_height_pt=300.0,
        background_pdf_path=None,
        blocks=[
            RenderLayoutBlock(
                block_id="title-1",
                page_index=0,
                background_rect=[10.0, 20.0, 160.0, 60.0],
                content_rect=[12.0, 22.0, 158.0, 58.0],
                content_kind="markdown",
                content_text="引言",
                plain_text="引言",
                math_map=[],
                font_size_pt=12.0,
                leading_em=0.42,
                font_weight="bold",
                fit_to_box=True,
                fit_single_line=True,
                fit_min_font_size_pt=12.0,
                fit_max_font_size_pt=24.0,
                fit_min_leading_em=0.42,
                fit_max_height_pt=36.0,
            )
        ],
    )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        background_pdf = root / "background.pdf"
        write_pdf(background_pdf, width=200, height=300)

        source = build_typst_source_from_page_specs(
            background_pdf_path=background_pdf,
            page_specs=[spec],
            work_dir=root,
        )

    assert 'weight: "bold"' in source
    assert "clip: false" in source
    assert "fit_width: 146.0pt" in source
    assert re.search(r"fit_height: 36(\.0+)?pt", source)


def test_typst_render_source_does_not_shrink_multiline_markdown_fit_height() -> None:
    spec = RenderPageSpec(
        page_index=0,
        page_width_pt=200.0,
        page_height_pt=300.0,
        background_pdf_path=None,
        blocks=[
            RenderLayoutBlock(
                block_id="body-1",
                page_index=0,
                background_rect=[10.0, 20.0, 160.0, 70.0],
                content_rect=[10.0, 20.0, 160.0, 70.0],
                content_kind="markdown",
                content_text=r"正文 $\\frac{\\partial E}{\\partial R}$ 继续说明。",
                plain_text="正文继续说明。",
                math_map=[],
                font_size_pt=10.0,
                leading_em=0.6,
                fit_to_box=True,
                fit_single_line=False,
                fit_min_font_size_pt=9.2,
                fit_min_leading_em=0.52,
                fit_max_height_pt=24.0,
                use_cover_fill=True,
            )
        ],
    )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        background_pdf = root / "background.pdf"
        write_pdf(background_pdf, width=200, height=300)

        source = build_typst_source_from_page_specs(
            background_pdf_path=background_pdf,
            page_specs=[spec],
            work_dir=root,
        )

    assert "height: 50.0pt" in source
    assert "fit_height: 24.0pt" in source
    assert "fill: rgb(255, 255, 255)" in source


def test_long_plain_fallback_wraps_instead_of_single_line_scaling() -> None:
    spec = RenderPageSpec(
        page_index=0,
        page_width_pt=220.0,
        page_height_pt=320.0,
        background_pdf_path=None,
        blocks=[
            RenderLayoutBlock(
                block_id="plain-long",
                page_index=0,
                background_rect=[10.0, 20.0, 190.0, 120.0],
                content_rect=[10.0, 20.0, 190.0, 120.0],
                content_kind="plain_line",
                content_text="",
                plain_text="这是一段从 Typst 兼容性降级而来的很长纯文本，应该保持块宽换行，而不能按整段单行宽度缩放到几乎不可读。",
                math_map=[],
                font_size_pt=10.0,
                leading_em=0.56,
                first_line_indent_pt=18.0,
                justify_text=True,
            )
        ],
    )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        background_pdf = root / "background.pdf"
        write_pdf(background_pdf, width=220, height=320)

        source = build_typst_source_from_page_specs(
            background_pdf_path=background_pdf,
            page_specs=[spec],
            work_dir=root,
        )

    assert "scaled-font" not in source
    assert "set par(leading: 0.56em, justify: true)" in source
    assert "h(18.0pt)" in source
    plain_block_start = source.index("#let rp0_plain_long_0_body")
    plain_block_end = source.index("#context", plain_block_start)
    assert "cmarker.render" not in source[plain_block_start:plain_block_end]


