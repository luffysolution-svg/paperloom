"""译文块的实心填充只能落在原始 OCR bbox（cover_bbox）里。

排版框可以因为标题对齐正文、短正文扩展等被加宽，但填充不能跟着变宽，
否则会把压在加宽区域里的小图标 / 装饰图形（Crossmark、ORCID、列表圆点）擦掉。
"""

from __future__ import annotations

import re

from retainpdf_pipeline.render.layout.model.models import RenderBlock
from retainpdf_pipeline.render.layout.model.models import RenderLineBox
from retainpdf_pipeline.render.output.typst.block_renderer import build_typst_block
from retainpdf_pipeline.render.output.typst.source_builder import build_typst_overlay_source

_SHAPE_RE = re.compile(
    r"let (\w+) = (?:block|rect)\(width: ([\d.]+)pt, height: ([\d.]+)pt[^)\n]*?fill: rgb\("
)
_PLACE_RE = re.compile(r"place\(top \+ left, dx: (-?[\d.]+)pt, dy: (-?[\d.]+)pt, (\w+)\)")


def _filled_rects(source: str) -> list[tuple[float, float, float, float]]:
    shapes = {name: (float(w), float(h)) for name, w, h in _SHAPE_RE.findall(source)}
    rects = []
    for x, y, name in _PLACE_RE.findall(source):
        if name in shapes:
            w, h = shapes[name]
            rects.append((float(x), float(y), float(x) + w, float(y) + h))
    return rects


def _assert_within(rects, outer, tol: float = 0.01) -> None:
    assert rects, "expected at least one filled shape"
    for rect in rects:
        assert rect[0] >= outer[0] - tol, (rect, outer)
        assert rect[1] >= outer[1] - tol, (rect, outer)
        assert rect[2] <= outer[2] + tol, (rect, outer)
        assert rect[3] <= outer[3] + tol, (rect, outer)


def _block(**overrides) -> RenderBlock:
    values = dict(
        block_id="item-0",
        bbox=[100.0, 100.0, 300.0, 130.0],
        cover_bbox=[99.0, 99.0, 301.0, 131.0],
        # 标题被拉宽到正文右沿：排版框右沿 360 > 原始 OCR 右沿 300
        inner_bbox=[101.0, 101.0, 360.0, 129.0],
        markdown_text="一个被加宽的标题",
        plain_text="一个被加宽的标题",
        render_kind="markdown",
        font_size_pt=14.0,
        leading_em=0.5,
        cover_fill=(1.0, 1.0, 1.0),
        use_cover_fill=True,
    )
    values.update(overrides)
    return RenderBlock(**values)


def test_widened_markdown_block_fill_stays_inside_cover_bbox() -> None:
    block = _block()
    source = build_typst_block("b0", block, include_fill=True)
    _assert_within(_filled_rects(source), block.cover_bbox)
    # 文字排版框保持加宽后的宽度
    assert "block(width: 259.0pt" in source


def test_widened_fit_block_fill_stays_inside_cover_bbox() -> None:
    block = _block(fit_to_box=True, fit_min_font_size_pt=8.0, fit_min_leading_em=0.3)
    source = build_typst_block("b0", block, include_fill=True)
    _assert_within(_filled_rects(source), block.cover_bbox)


def test_widened_single_line_fit_block_fill_stays_inside_cover_bbox() -> None:
    block = _block(
        fit_to_box=True,
        fit_single_line=True,
        fit_target_width_pt=280.0,
        fit_shift_up_pt=3.0,
    )
    source = build_typst_block("b0", block, include_fill=True)
    _assert_within(_filled_rects(source), block.cover_bbox)


def test_widened_plain_line_block_fill_stays_inside_cover_bbox() -> None:
    block = _block(render_kind="plain_line")
    source = build_typst_block("b0", block, include_fill=True)
    _assert_within(_filled_rects(source), block.cover_bbox)


def test_preserved_line_box_fill_stays_inside_cover_bbox() -> None:
    block = _block(
        preserve_line_breaks=True,
        preserved_line_boxes=[
            RenderLineBox(text="第一行", bbox=[101.0, 101.0, 340.0, 114.0]),
            RenderLineBox(text="第二行", bbox=[101.0, 115.0, 340.0, 129.0]),
        ],
    )
    source = build_typst_block("b0", block, include_fill=True)
    _assert_within(_filled_rects(source), block.cover_bbox)


def test_unwidened_block_fill_still_covers_text_box() -> None:
    # 排版框在 OCR 框内时，填充范围与排版框一致（不缩小原有擦除范围）
    block = _block(inner_bbox=[102.0, 101.0, 298.0, 129.0])
    rects = _filled_rects(build_typst_block("b0", block, include_fill=True))
    assert any(
        abs(r[0] - 102.0) < 0.01
        and abs(r[1] - 101.0) < 0.01
        and abs(r[2] - 298.0) < 0.01
        and abs(r[3] - 129.0) < 0.01
        for r in rects
    ), rects


def test_overlay_source_title_widened_by_body_alignment_keeps_fill_in_ocr_bbox() -> None:
    title_bbox = [50.0, 50.0, 250.0, 72.0]
    body_text = "A body paragraph with enough words to be treated as body text by the renderer. " * 4
    items = [
        {
            "item_id": "p001-title",
            "page_idx": 0,
            "block_type": "title",
            "block_kind": "text",
            "layout_role": "heading",
            "structure_role": "heading",
            "bbox": title_bbox,
            "lines": [{"bbox": title_bbox, "spans": [{"type": "text", "content": "A Title"}]}],
            "source_text": "A Title For The Paper",
            "protected_source_text": "A Title For The Paper",
            "protected_translated_text": "论文的一个标题",
            "_render_policy": {"overlay_fill": "sampled"},
        },
        {
            "item_id": "p001-body",
            "page_idx": 0,
            "block_type": "text",
            "block_kind": "text",
            "layout_role": "paragraph",
            "semantic_role": "body",
            "structure_role": "body",
            "bbox": [50.0, 90.0, 300.0, 200.0],
            "lines": [{"bbox": [50.0, 90.0, 300.0, 102.0], "spans": [{"type": "text", "content": "body"}]}],
            "source_text": body_text,
            "protected_source_text": body_text,
            "protected_translated_text": "这是一段足够长的正文，用来让标题向正文右沿对齐。" * 4,
            "_render_policy": {"overlay_fill": "sampled"},
        },
    ]
    source = build_typst_overlay_source(400.0, 400.0, items, include_cover_rect=True)
    title_rects = [r for r in _filled_rects(source) if r[1] < 80.0]
    _assert_within(
        title_rects,
        [title_bbox[0] - 1.5, title_bbox[1] - 1.5, title_bbox[2] + 1.5, title_bbox[3] + 1.5],
    )
