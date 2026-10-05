"""阅读器 HTML 图层那套字号收敛，搬到导出这边之后的行为。

搬的时候踩了三个坑，每个都让结果明显变差过，所以每个都单独钉一条:
  ① 下界照抄阅读器的 `|| 5.5` —— 排版层没给下界的块被一路砸到 5.5pt；
  ② 把公式的 LaTeX 源码当正文量宽度 —— 带公式的块行数严重高估；
  ③ 行高按 `1 + leading_em` 折算 —— 系统性高 21%。

搜索本身是从 `frontend/packages/reader/src/pdf/LiveTranslationOverlay.tsx` 的
`computeLiveTranslationFit` 逐行搬过来的。改这里之前先看那边:两边跑的必须是同一套
判定，否则阅读器里看到的排版和导出的 Word 会对不上。
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import sys

import pytest

PIPELINE_ROOT = Path(__file__).resolve().parents[3]
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

pytest.importorskip("fitz", reason="PyMuPDF 未安装")

from retainpdf_pipeline.render.output.word.html_fit import (  # noqa: E402
    LINE_STEP_RATIO,
    compute_fit,
    fitted_typography,
    measure,
    renderable_text,
    wrap_lines,
)


JOBS_ROOT = PIPELINE_ROOT.parents[1] / "data" / "jobs"


def _find_translated_job() -> Path | None:
    if not JOBS_ROOT.is_dir():
        return None
    for job in sorted(JOBS_ROOT.iterdir(), reverse=True):
        if not (job / "translated" / "translation-manifest.json").is_file():
            continue
        if list((job / "source").glob("*.pdf")):
            return job
    return None


@dataclass
class FakeBlock:
    plain_text: str
    content_rect: list
    font_size_pt: float
    leading_em: float = 0.55
    fit_to_box: bool = True
    fit_min_font_size_pt: float = 6.0
    fit_max_height_pt: float = 0.0
    math_map: list = None

    def __post_init__(self):
        if self.math_map is None:
            self.math_map = []


def test_a_block_that_fits_keeps_its_size():
    """装得下就不动它——和 Typst 一样，`exact` 时只缩不放。"""
    block = FakeBlock("短文本", [0, 0, 300, 100], font_size_pt=10.0)
    assert fitted_typography(block)[0] == 10.0


def test_a_block_that_overflows_is_shrunk_within_its_bounds():
    block = FakeBlock("很长的中文段落" * 30, [0, 0, 120, 40], font_size_pt=12.0,
                      fit_min_font_size_pt=6.0)
    fitted, _step = fitted_typography(block)
    assert fitted < 12.0, "装不下却没缩"
    assert fitted >= 6.0, f"缩到了下界以下:{fitted}"


def test_a_block_without_a_configured_floor_falls_back_to_its_own_size():
    """坑 ①:排版层没给下界时，下界是**字号本身**，不是阅读器那个 5.5。

    阅读器的 `fit_min_font_size_pt || 5.5` 是给没有排版数据的块兜底的；照搬过来，
    真实数据里三成没有下界的块会被一路砸到 5.5pt。Typst 的 `fit_dimensions` 用的是
    `min(fit_min or font_size, font_size)`——没有下界就等于不收缩。
    """
    # 框小得离谱，装不下:有下界才该缩，没下界就该原样。
    tight = dict(plain_text="很长的中文段落" * 20, content_rect=[0, 0, 100, 12],
                 font_size_pt=10.0, fit_to_box=True)
    assert fitted_typography(FakeBlock(**tight, fit_min_font_size_pt=0.0))[0] == 10.0, (
        "没有配置下界的块被缩了——多半是照抄了阅读器的 5.5 默认值"
    )
    assert fitted_typography(FakeBlock(**tight, fit_min_font_size_pt=6.0))[0] < 10.0, (
        "配了下界却没缩"
    )


def test_blocks_the_layout_never_fits_are_left_alone():
    """`fit_to_box` 为假的块不参与收敛——Typst 对它们直接按上界排、允许溢出。

    这一支在**今天的真实数据上**是冗余的:全仓 1475 个块查过，fit_to_box 为假时
    fit_min 一定是 0，下界因此等于字号，二分本来就空转（下一条测试核这个不变量）。
    所以这里用的是构造数据——fit_to_box 假 + 有下界，正是守卫防的那种块，今天的排版层
    不产出它。拿真实块写的话这条会恒成立，去掉守卫也不变红。
    """
    never_fits = dict(plain_text="很长的中文段落" * 20, content_rect=[0, 0, 100, 12],
                      font_size_pt=10.0, fit_min_font_size_pt=6.0)
    assert fitted_typography(FakeBlock(**never_fits, fit_to_box=False))[0] == 10.0
    assert fitted_typography(FakeBlock(**never_fits, fit_to_box=True))[0] < 10.0


def test_the_layout_never_pairs_a_floor_with_a_non_fitting_block():
    """上面那条守卫依赖的不变量，在真实数据上核一遍。

    它一旦不成立，守卫就从冗余变成唯一防线——而那时没有任何测试会告诉我们。
    """
    from retainpdf_pipeline.render.output.word.job_io import single_pdf, translated_pages
    from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs

    job = _find_translated_job()
    if job is None:
        pytest.skip("本机没有已翻译的 job")
    specs = build_render_page_specs(
        source_pdf_path=single_pdf(job / "source"), translated_pages=translated_pages(job),
    )
    offenders = [
        b.block_id for spec in specs for b in spec.blocks
        if b.plain_text.strip() and not b.fit_to_box and (b.fit_min_font_size_pt or 0) > 0
    ]
    assert not offenders, (
        f"排版层开始给不收敛的块配下界了（{offenders[:3]}）——"
        "html_fit 里那条 fit_to_box 守卫从此是唯一防线，去掉会把正常字号砸到下界"
    )


def test_formula_source_is_not_measured_as_body_text():
    """坑 ②:`plain_text` 里的公式是 LaTeX **源码**。

    `$\\mathbf{2a}$` 有 13 个字符，排出来只有 2 个字形。照源码量宽度，带公式的块会被
    严重高估——实测有块因此多算出 4 行，字号被无谓地缩下去。
    """
    raw = "当量等于$\\mathbf{2a}$时"
    rendered = renderable_text(raw, [])
    assert "\\mathbf" not in rendered, f"LaTeX 命令没被换掉:{rendered}"
    assert len(rendered) < len(raw), f"没有变短:{raw!r} → {rendered!r}"
    assert "当量等于" in rendered and "时" in rendered, f"正文被吃掉了:{rendered}"

    # 框要窄到两者折出的行数不同，否则都是一行、高度相等，这条就分辨不出对错。
    narrow = 60.0
    assert (
        measure(rendered, 10.0, narrow)[1] < measure(raw, 10.0, narrow)[1]
    ), "换掉公式源码之后高度没有下降"


def test_a_formula_placeholder_is_resolved_through_the_math_map():
    text = "见 ⟦F1⟧ 式"
    rendered = renderable_text(text, [{"placeholder": "⟦F1⟧", "formula_text": "x^2+y^2"}])
    assert "⟦F1⟧" not in rendered, f"占位符没被还原:{rendered}"


def test_line_height_uses_the_measured_ratio():
    """坑 ③:行高不是 `字号 × (1 + leading_em)`。

    跨 9 本书 111 个块实测，译文 PDF 里相邻基线的距离是字号的 1.289 倍，而
    `1 + leading_em` 给出 1.560——高 21%。Typst 的 `par(leading:)` 是行盒之间的间隙，
    行盒本身不是 1em，这个换算从一开始就不成立。
    """
    assert LINE_STEP_RATIO == pytest.approx(1.289), "改这个常数要重新跑实测，别凭感觉调"
    # 单行的高度就是一个行步长，且明显小于 (1 + 0.55) 的折算值。
    _width, height = measure("一行字", 10.0, 500.0)
    assert height == pytest.approx(10.0 * 1.289, abs=0.01)
    assert height < 10.0 * (1.0 + 0.55)

    block = FakeBlock("短", [0, 0, 300, 100], font_size_pt=10.0, leading_em=0.55)
    size, step = fitted_typography(block)
    assert step == pytest.approx(size * LINE_STEP_RATIO, abs=0.01)
    # leading_em 变了也不该影响行距——它不再参与计算。
    assert fitted_typography(FakeBlock(**{**block.__dict__, "leading_em": 0.30}))[1] == pytest.approx(step, abs=0.01)


def test_cjk_wraps_per_character_and_latin_wraps_at_spaces():
    # 中文逐字可断:一个窄框里应该折成多行而不是一行冲出去。
    assert len(wrap_lines("中文中文中文中文中文", 10.0, 35.0)) > 1
    # 拉丁不能从单词中间断开:一个放不下整词的框里，每行至多一个词。
    lines = wrap_lines("alpha beta gamma", 10.0, 45.0)
    assert len(lines) >= 3, f"英文没有按空格折行:{lines}"


def test_the_search_matches_the_readers_contract():
    """搜索本身:装得下不放大（exact）、装不下才二分、永远不低于下界。"""
    # 高度 = 行数 × size × 1.0 的假 measure，便于精确推断。
    fake = lambda size: (0.0, size)
    assert compute_fit(fake, 100, 20, 5.0, 10.0, 10.0, exact=True) == 10.0
    # exact 时装得下就停，不会去够 max。
    assert compute_fit(fake, 100, 20, 5.0, 20.0, 8.0, exact=True) == 8.0
    # 非 exact 时会继续往上够。
    assert compute_fit(fake, 100, 20, 5.0, 20.0, 8.0, exact=False) > 8.0
    # 怎么都装不下时落在下界，而不是 0 或负数。
    assert compute_fit(fake, 100, 1, 5.0, 10.0, 10.0, exact=True) == 5.0


def test_the_ported_search_is_kept_in_step_with_the_reader():
    """前端那份还在原地——两边跑的必须是同一套判定。"""
    overlay = (
        PIPELINE_ROOT.parents[1] / "frontend" / "packages" / "reader" / "src" / "pdf"
        / "LiveTranslationOverlay.tsx"
    )
    if not overlay.is_file():
        pytest.skip("前端源码不在这个检出里")
    source = overlay.read_text(encoding="utf-8")
    assert "export function computeLiveTranslationFit" in source, (
        "阅读器那侧的收敛函数改名或删了，导出这边这份就成了没人对照的孤本"
    )


def test_the_document_declares_the_font_the_fit_was_measured_with():
    """量宽度用的字体和 Word 文档声明的字体必须是同一个。

    两边不一致的话，Word 按另一个字体折行，这里算出来的字号就没有依据了——中文两边
    都是 1em 等宽、影响不大，拉丁字母差得明显。这条以前是错的:量的是 Source Han
    Serif SC（PDF 和阅读器 HTML 图层用的那个），文档里声明的却是 SimSun。
    """
    from retainpdf_pipeline.foundation.config.fonts import DEFAULT_FONT_PATH
    from retainpdf_pipeline.render.output.word.exporter import export_layout_docx
    from retainpdf_pipeline.render.output.word.html_fit import MEASURED_FONT_FAMILY
    import inspect

    assert "SourceHanSerif" in DEFAULT_FONT_PATH.name, (
        f"量宽度的字体换成了 {DEFAULT_FONT_PATH.name}，MEASURED_FONT_FAMILY 要跟着改"
    )
    assert MEASURED_FONT_FAMILY == "Source Han Serif SC"
    default = inspect.signature(export_layout_docx).parameters["font_family"].default
    assert default == MEASURED_FONT_FAMILY, (
        f"导出默认声明的是 {default!r}，和量宽度用的字体不是同一个"
    )
