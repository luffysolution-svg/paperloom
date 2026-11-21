"""`\\text{\\AA}` 不能被渲染成字面的 "circle(A)"。

mitex 0.2.7 在文本组（\\text / \\textrm / \\textup …）里把 `\\AA` 翻成 Typst 代码
`circle(A)` 却不求值，页面上就印出 "circle(A)"；`\\aa`、`\\r{A}`、`\\text{\\mathring{A}}`
同病（后两个印出 "circle[A];" / "mathring[A];"）。数学模式里 `\\AA` 倒是能出字，
但是是斜体 𝐴̊，`\\aa` 更是出成大写的 𝐴̊。生产里已渲染的 PDF 搜得到
"𝑅𝑒= 2.36 circle(A)" 这类残字（20261006134628-96126f 第 32 页等 5 份文档）。

修法是清洗器把埃符号的几种 LaTeX 拼法统一改写成 Unicode 字符 Å / å：
它在 mitex 的数学模式和文本模式里都按正体原样输出。
`\\mathring{A}` 只在文本组里改写——数学模式下它渲染正确，而且常常是「集合 A 的内部」
这类数学记号，不是埃。
"""

from __future__ import annotations

import fitz
import pytest

from retainpdf_pipeline.render.layout.inline_content import (
    build_direct_typst_passthrough_markdown,
)

from devtools.tests.rendering.mitex_probe import TYPST_BIN
from devtools.tests.rendering.mitex_probe import compile_markdown_pdf


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        (r"$0.02\text{ \AA}$", r"$0.02\text{ Å}$"),
        (r"$0.02\text{\AA}$", r"$0.02\text{Å}$"),
        (r"$\textrm{\AA}^{-1}$", r"$\textrm{Å}^{-1}$"),
        (r"$\text{1 \AA{} thick}$", r"$\text{1 Å thick}$"),
        (r"$0.02\ \AA$", r"$0.02\ Å$"),
        (r"$Re = 2.36 \AA$", r"$Re = 2.36 Å$"),
        (r"$\text{\aa}$", r"$\text{å}$"),
        (r"$\text{\r{A}}$", r"$\text{Å}$"),
        (r"$\text{\r A}$", r"$\text{Å}$"),
        (r"$\text{ \mathring{A}}$", r"$\text{ Å}$"),
        (r"$\textup{\mathring A}$", r"$\textup{Å}$"),
        (r"波长 \AA 级", r"波长 Å 级"),
    ],
)
def test_angstrom_spellings_become_unicode(source: str, expected: str) -> None:
    assert build_direct_typst_passthrough_markdown(source) == expected


@pytest.mark.parametrize(
    "source",
    [
        # 数学模式里的 \mathring{A} 渲染正确，且多半是「A 的内部」，不能改成埃。
        r"$\mathring{A} \subset X$",
        # 以 AA / aa 开头的更长命令不能被误伤。
        r"$\AAx + \aab$",
    ],
)
def test_non_angstrom_commands_are_left_alone(source: str) -> None:
    assert build_direct_typst_passthrough_markdown(source) == source


@pytest.mark.needs_typst
@pytest.mark.skipif(not TYPST_BIN, reason="typst 不在本机")
@pytest.mark.parametrize(
    "source",
    [
        r"$0.02\text{ \AA}$",
        r"$\text{\AA}^{-1}$",
        r"$Re= 2.36\text{ \AA}$",
        r"$\text{\aa}$",
        r"$\text{\r{A}}$",
        r"$\text{ \mathring{A}}$",
        r"$0.02 \AA$",
    ],
)
def test_angstrom_really_renders_as_a_glyph(source: str) -> None:
    ok, message, pdf = compile_markdown_pdf(build_direct_typst_passthrough_markdown(source))
    assert ok, message
    with fitz.open(stream=pdf, filetype="pdf") as doc:
        text = "".join(page.get_text() for page in doc)
    assert "circle" not in text
    assert "mathring" not in text
    assert "Å" in text or "å" in text, text
