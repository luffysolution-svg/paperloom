"""bbox 文字剥离的底层原语：分段、命中测试、文本状态推进、q/Q 图形状态栈。

从 test_bbox_text_strip_document.py 整块拆出，用例本身未改。
"""

from __future__ import annotations

import fitz
import pikepdf
import pytest

from retainpdf_pipeline.render.source_cleanup.pdf.hit_test import RectIndex
from retainpdf_pipeline.render.source_cleanup.pdf import pdf_math
from retainpdf_pipeline.render.source_cleanup.pdf import text_ops
from retainpdf_pipeline.render.source_cleanup.planning import segments


def test_bbox_text_strip_segments_keep_inline_formula_sides_deletable() -> None:
    text_rect = fitz.Rect(10, 20, 210, 50)
    formula_rect = fitz.Rect(80, 22, 140, 48)

    split_segments = segments.strip_segments_for_text_rect(text_rect, [formula_rect])

    assert len(split_segments) == 2
    assert split_segments[0].x0 <= 10
    assert split_segments[0].x1 <= formula_rect.x0
    assert split_segments[1].x0 >= formula_rect.x1
    assert split_segments[1].x1 >= 210
    assert all((segment & formula_rect).is_empty for segment in split_segments)


def test_text_strip_hit_test_ignores_tiny_edge_intersections() -> None:
    strip_index = RectIndex.build([(100.0, 100.0, 160.0, 120.0)])

    assert strip_index.matches_text_for_removal(
        20.0,
        110.0,
        (20.0, 100.0, 101.0, 120.0),
    ) is False
    assert strip_index.matches_text_for_removal(
        20.0,
        110.0,
        (20.0, 100.0, 145.0, 120.0),
    ) is True
    assert strip_index.matches_text_for_removal(
        120.0,
        110.0,
        (20.0, 100.0, 101.0, 120.0),
    ) is True


def test_text_state_advance_uses_font_size_spacing_and_tj_adjustments() -> None:
    state = text_ops.TextState(font_size=12.0, char_spacing=1.0, word_spacing=3.0)

    plain = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["hello"], text_state=state)
    with_space = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["a b"], text_state=state)
    with_tj_pull = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, [pikepdf.Array(["a", -120, "b"])], text_state=state)

    assert plain == pytest.approx(35.0)
    assert with_space == pytest.approx(24.0)
    assert with_tj_pull > text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["ab"], text_state=state)


def test_estimated_text_rect_uses_font_size_from_text_state() -> None:
    state = text_ops.TextState(font_size=12.0)
    _point, rect = text_ops.estimated_user_text_geometry(
        pdf_math.IDENTITY_MATRIX,
        (1, 0, 0, 1, 20, 40),
        state,
        text_length=4,
    )

    assert rect[0] == pytest.approx(20.0)
    assert rect[1] < 40.0
    assert rect[2] >= 44.0
    assert rect[3] > 50.0


def test_stray_q_keeps_accumulated_graphics_state() -> None:
    from retainpdf_pipeline.render.source_cleanup.pdf.stream_state import ContentStreamState

    state = ContentStreamState()
    state.concat_matrix([2, 0, 0, 2, 10, 20])
    state.pop_graphics_state([])

    assert state.ctm == (2, 0, 0, 2, 10, 20)


def test_balanced_q_still_restores_graphics_state() -> None:
    from retainpdf_pipeline.render.source_cleanup.pdf.stream_state import ContentStreamState

    state = ContentStreamState()
    state.concat_matrix([2, 0, 0, 2, 10, 20])
    state.push_graphics_state([])
    state.concat_matrix([1, 0, 0, 1, 5, 5])
    state.pop_graphics_state([])

    assert state.ctm == (2, 0, 0, 2, 10, 20)
