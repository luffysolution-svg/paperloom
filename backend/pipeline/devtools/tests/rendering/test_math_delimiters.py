import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from retainpdf_pipeline.render.layout.inline_content.core.markdown import build_direct_typst_passthrough_text
from retainpdf_pipeline.render.layout.payload.blocks import build_render_blocks
from retainpdf_pipeline.render.layout.text_analysis import analyze_text
from retainpdf_pipeline.render.layout.text_tokens import TextTokenKind, math_token_body


# The translated paragraph at PDF page 32 (printed page 102) uses \( ... \).
POLARIZABILITY = (
    r"其中 \( \nu_{\mathrm{i}} = \frac{4}{3}\pi a_{\mathrm{i}}^3 \) 是分子或球体的体积。"
    r"该式表明，对于自由空间（其中 \( \varepsilon=1 \)）中具有高 \( \varepsilon_{\mathrm{i}} \) 的介质球，"
    r"其极化率约为 \( \alpha_{\mathrm{i}} \approx 4\pi\varepsilon_0 a_{\mathrm{i}}^3 \)；"
    r"正如先前对简单单电子原子所得，见式(5.5)。此外，若 \( \varepsilon_{\mathrm{i}} < \varepsilon \)，"
    r"则极化率为负，这意味着诱导偶极的方向与自由空间中或 \( \varepsilon_{\mathrm{i}} > \varepsilon \) 时相反。"
)


@pytest.mark.parametrize("wrapped,kind", [
    (r"$\varepsilon_i$", TextTokenKind.INLINE_MATH),
    (r"\( \varepsilon_i \)", TextTokenKind.INLINE_MATH),
    (r"$$\varepsilon_i$$", TextTokenKind.DISPLAY_MATH),
    (r"\[ \varepsilon_i \]", TextTokenKind.DISPLAY_MATH),
])
def test_render_analysis_recognizes_all_reader_math_delimiters(wrapped, kind):
    analysis = analyze_text(f"前文{wrapped}后文")
    assert len(analysis.formula_segments) == 1
    formula = analysis.formula_segments[0]
    assert formula.kind == kind
    assert formula.body == r"\varepsilon_i"
    assert math_token_body(wrapped) == r"\varepsilon_i"
    assert analysis.plain_text == "前文后文"


def test_pdf_paragraph_normalizes_parenthesis_math_without_losing_formulas():
    blocks = build_render_blocks([{
        "item_id": "p032-b004", "page_idx": 31, "block_type": "text",
        "block_kind": "text", "normalized_sub_type": "body",
        "bbox": [58, 114, 464, 179], "math_mode": "direct_typst",
        "source_text": "where the volume is given by the following equation",
        "translated_text": POLARIZABILITY, "protected_translated_text": POLARIZABILITY,
    }], page_width=522, page_height=720)
    assert len(blocks) == 1
    markdown = blocks[0].markdown_text
    assert r"$\nu_{\mathrm{i}} = \frac{4}{3}\pi a_{\mathrm{i}}^3$" in markdown
    assert r"$\varepsilon_{\mathrm{i}} < \varepsilon$" in markdown
    assert "见式(5.5)" in markdown
    assert len(analyze_text(markdown).formula_segments) == 6
    assert r"\(" not in markdown
    assert r"\)" not in markdown


def test_multiline_bracket_math_is_normalized_for_export():
    markdown = build_direct_typst_passthrough_text("结果\\[\n\\frac{4}{3}\\pi a_i^3\n\\]如下")
    assert markdown == r"结果 $\frac{4}{3}\pi a_i^3$ 如下"


def test_multiline_parenthesis_math_stays_one_formula_for_export():
    markdown = build_direct_typst_passthrough_text("结果\\(a_i\n + b_i\\)如下")
    assert markdown == r"结果 $a_i + b_i$ 如下"
    assert len(analyze_text(markdown).formula_segments) == 1


@pytest.mark.parametrize("text", [
    r"字面量 \\( x \\) 与 \\[ y \\]",
    r"未闭合 \( x 与 \[ y",
    r"普通括号 (a_i) 和 [b_i]",
])
def test_literal_or_unclosed_math_delimiters_stay_plain(text):
    assert analyze_text(text).formula_segments == ()


def test_backslash_math_preserves_escaped_delimiters_inside_the_formula():
    text = r"\(a \\) + b\)"
    formulas = analyze_text(text).formula_segments
    assert len(formulas) == 1
    assert formulas[0].body == r"a \\) + b"


@pytest.mark.parametrize("text", [
    r"示例 `\(x\)` 与 `\[y\]`",
    "```latex\n\\(x\\) 与 $y$\n```",
    "~~~latex\n\\[x\\]\n~~~",
    r"示例 `` `\(x\)` ``",
    "~~~text\n~~~literal\n\\(x\\)\n~~~",
])
def test_code_examples_preserve_literal_math_delimiters(text):
    assert analyze_text(text).formula_segments == ()
    assert build_direct_typst_passthrough_text(text) == text


def test_inline_code_after_math_does_not_hide_the_following_formula():
    markdown = build_direct_typst_passthrough_text(r"\(x\) ```literal``` \(y\)")
    assert markdown == "$x$ ```literal``` $y$"


@pytest.mark.parametrize("opening,closing", [(r"\(", r"\)"), (r"\[", r"\]")])
@pytest.mark.parametrize("body_length", [1199, 1200])
def test_backslash_formulas_respect_the_normalized_inline_length_limit(opening, closing, body_length):
    source = opening + "x" * body_length + closing
    markdown = build_direct_typst_passthrough_text(source)
    if body_length == 1199:
        assert len(analyze_text(markdown).formula_segments) == 1
    else:
        assert analyze_text(source).formula_segments == ()
        assert markdown == source
