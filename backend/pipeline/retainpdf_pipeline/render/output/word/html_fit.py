"""阅读器 HTML 图层那套字号收敛，搬到导出这边。

`block.font_size_pt` 是**上界**不是结果:排版层把它当作 Typst `pdftr_fit_markdown`
的 `max_size`，Typst 再用 `measure()` 在 `[fit_min_font_size_pt, font_size_pt]` 里
二分。照上界排，当初被缩过的块在 Word 里会溢出——实测跨 9 本书 295 个块，**44.6%
的字符**会排到框外。

阅读器的 HTML 图层解决的是同一个问题（`computeLiveTranslationFit`），而且它的搜索
逻辑是一个纯函数，唯一依赖浏览器的地方是 `measure` 回调。这里把搜索原样搬过来，
`measure` 换成基于真实字形宽度的实现。

搬的时候踩到三个坑，都写在下面对应的位置:
  1. 下界照抄了阅读器的 `fit_min_font_size_pt || 5.5`。阅读器那个默认值是给没有排版
     数据的块兜底用的；这边必须跟 Typst 一样取 `min(fit_min or font_size, font_size)`，
     否则排版层没给下界的块（真实数据里占三成）会被一路砸到 5.5pt。
  2. `plain_text` 里的公式是 LaTeX **源码**，直接量宽度会严重高估；
  3. Typst 的 `par(leading:)` 不是行高倍数，照 `1 + leading` 换算高 21%。

实测（9 本书 / 295 块 / 23031 字，真值取自流水线自己渲染的译文 PDF）：

    方案                     平均绝对误差   偏大(会溢出)
    照搬 max_size(上界)          0.405pt        44.6%
    本模块                       0.345pt         1.5%

误差方向是偏小而不是偏大——排出来的字可能比 PDF 里略小一点，但不会顶到框外。
拿得到译文 PDF 时仍然优先读回真值（见 typography_readback），这条是读不到时的路。
"""

from __future__ import annotations

from functools import lru_cache
import re

import fitz

from retainpdf_pipeline.foundation.config.fonts import DEFAULT_FONT_PATH
from retainpdf_pipeline.render.layout.payload.formula_cost import approx_formula_visible_text


# Typst 侧同名常量（render/output/typst/block_config.py）。两边必须一致，
# 否则这里算的可用空间和 Typst 当初用的不是同一个。
MIN_BLOCK_SIZE_PT = 8.0
MIN_FIT_FONT_SIZE_PT = 1.0
MIN_FIT_LEADING_EM = 0.1

# 相邻两行基线的距离 ÷ 字号。
#
# 实测:跨 9 本书 111 个块，译文 PDF 里这个比值的中位数是 1.289（10–90 分位
# 1.235–1.408，9 本里有 7 本的中位数完全相同）。
#
# 不能用 `1 + leading_em` 代替:那样中位会是 1.560，**系统性高 21%**。Typst 的
# `par(leading:)` 是行盒之间的间隙，行盒本身由字体的 top-edge/bottom-edge 决定，
# 不是 1em，所以「行高 = 字号 ×(1+leading)」这个换算从一开始就不成立。
LINE_STEP_RATIO = 1.289

# 量宽度用的是 DEFAULT_FONT_PATH（Source Han Serif SC），也就是 PDF 和阅读器 HTML
# 图层用的同一个字体。Word 文档必须**声明同一个字体**，否则它按别的字体折行，这里
# 算出来的字号就失去依据——中文两边都是 1em 等宽、影响不大，拉丁字母差得明显。
#
# 装不到这个字体的机器上 Word 会自己做字体替换，效果和以前声明 SimSun 时相当；
# 字体文件就在仓库的 resources/fonts 下，需要精确还原的话装上即可。
MEASURED_FONT_FAMILY = "Source Han Serif SC"

_CJK_RE = re.compile(r"[　-〿㐀-䶿一-鿿豈-﫿＀-￯]")
_MATH_RE = re.compile(r"\$[^$]*\$")


@lru_cache(maxsize=1)
def _font():
    return fitz.Font(fontfile=str(DEFAULT_FONT_PATH))


def renderable_text(plain_text: str, math_map: list[dict] | None) -> str:
    """把公式的 LaTeX 源码换成它渲染出来大致长什么样。

    坑 ②:`plain_text` 里存的是源码。`$\\mathbf{2a}$` 有 13 个字符，排出来只有 2 个
    字形；带公式的块直接量宽度会被严重高估（实测有块因此多算出 4 行）。排版层自己
    有一套近似（`approx_formula_visible_text`），这里复用它而不是另造一个。
    """
    lookup = {
        str(entry.get("placeholder", "")): str(entry.get("formula_text", ""))
        for entry in (math_map or [])
    }

    def substitute(match: re.Match[str]) -> str:
        token = match.group(0)
        body = lookup.get(token, token.strip("$"))
        return approx_formula_visible_text(body) or re.sub(r"\s+", "", body)

    text = _MATH_RE.sub(substitute, plain_text or "")
    for placeholder, body in lookup.items():
        if placeholder and placeholder in text:
            text = text.replace(placeholder, approx_formula_visible_text(body) or body)
    return text


def wrap_lines(text: str, font_size_pt: float, available_width_pt: float) -> list[float]:
    """贪心折行，返回每行的宽度。CJK 逐字可断、拉丁按空格断，和浏览器默认规则一致。"""
    font = _font()
    tokens: list[str] = []
    buffer = ""
    for char in text or "":
        if char == "\n":
            if buffer:
                tokens.append(buffer)
                buffer = ""
            tokens.append("\n")
        elif _CJK_RE.match(char):
            if buffer:
                tokens.append(buffer)
                buffer = ""
            tokens.append(char)
        elif char == " ":
            buffer += char
            tokens.append(buffer)
            buffer = ""
        else:
            buffer += char
    if buffer:
        tokens.append(buffer)

    widths: list[float] = []
    current = 0.0
    started = False
    for token in tokens:
        if token == "\n":
            widths.append(current)
            current, started = 0.0, False
            continue
        width = font.text_length(token, fontsize=font_size_pt)
        if started and current + width > available_width_pt + 0.5:
            widths.append(current)
            current, started = 0.0, False
            if token == " ":
                continue
        current += width
        started = True
    if started or not widths:
        widths.append(current)
    return widths


def measure(text: str, font_size_pt: float, available_width_pt: float) -> tuple[float, float]:
    widths = wrap_lines(text, font_size_pt, available_width_pt)
    return max(widths, default=0.0), len(widths) * font_size_pt * LINE_STEP_RATIO


def compute_fit(
    measure_fn,
    available_width_pt: float,
    available_height_pt: float,
    min_pt: float,
    max_pt: float,
    requested_pt: float,
    exact: bool,
) -> float:
    """逐行对应前端的 `computeLiveTranslationFit`（LiveTranslationOverlay.tsx）。

    改这里之前先看那边:两边跑的必须是同一套判定，否则阅读器里看到的排版和导出的
    Word 会对不上,而这正是这次要消除的差异。
    """
    probed: dict[float, bool] = {}

    def fits(size: float) -> bool:
        if size in probed:
            return probed[size]
        width, height = measure_fn(size)
        probed[size] = (
            width <= available_width_pt + 0.5 and height <= available_height_pt + 0.5
        )
        return probed[size]

    low, high = min_pt, max_pt
    fitted = min(requested_pt, high)
    if not fits(fitted):
        high, fitted = fitted, low
        for _ in range(8):
            if not high > low:
                break
            candidate = (low + high) / 2
            if fits(candidate):
                fitted = low = candidate
            else:
                high = candidate
    elif not exact:
        low = fitted
        for _ in range(6):
            if not high > low:
                break
            candidate = (low + high) / 2
            if fits(candidate):
                fitted = low = candidate
            else:
                high = candidate
    return max(min_pt, fitted)


def fitted_typography(block) -> tuple[float, float]:
    """这个块该用的字号和行距(pt)。"""
    # fit_to_box 为假时排版层压根不收敛——Typst 直接按上界排、`clip: false` 允许溢出。
    # 这些块的框高常常连一行都装不下（见过框高 8pt 而一行需要 12.5pt 的），所以绝不能
    # 拿框高去二分。
    #
    # 说明:这一支今天是**冗余**的。全仓 1475 个块查过，fit_to_box 为假时
    # fit_min_font_size_pt 一定是 0，下面的 min_font 会塌成等于 font_size_pt，二分本来
    # 就空转。留着是因为那个不变量没有任何地方写明，而一旦它不成立，这里会把正常字号
    # 砸到下界。想删的话先去 emit.py / page_collision.py 确认。
    if not block.fit_to_box:
        return block.font_size_pt, block.font_size_pt * LINE_STEP_RATIO

    x0, y0, x1, y1 = block.content_rect
    available_width = max(MIN_BLOCK_SIZE_PT, x1 - x0)
    box_height = max(MIN_BLOCK_SIZE_PT, y1 - y0)
    # 和 Typst 的 `allowed-height = min(size.height, fit_height)` 对齐。
    available_height = max(
        MIN_BLOCK_SIZE_PT, min(box_height, block.fit_max_height_pt or box_height)
    )
    # 坑 ①:下界要和 Typst 的 `fit_dimensions` 一致——排版层没给下界时用**字号本身**，
    # 不是阅读器那个 `|| 5.5`。阅读器那个默认值是给没有排版数据的块兜底的；照搬过来，
    # 真实数据里三成没有下界的块会被一路砸到 5.5pt。
    min_font = max(
        MIN_FIT_FONT_SIZE_PT,
        min(block.fit_min_font_size_pt or block.font_size_pt, block.font_size_pt),
    )
    text = renderable_text(block.plain_text, list(getattr(block, "math_map", None) or []))

    fitted = compute_fit(
        lambda size: measure(text, size, available_width),
        available_width,
        available_height,
        min_font,
        block.font_size_pt,
        block.font_size_pt,
        exact=True,
    )
    return fitted, fitted * LINE_STEP_RATIO
