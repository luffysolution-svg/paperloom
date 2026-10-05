from __future__ import annotations

import re

from retainpdf_pipeline.render.layout.inline_content.fallback.latex_normalizer import aggressively_simplify_formula_for_latex_math
from retainpdf_pipeline.render.layout.model.render_text import get_render_protected_text
from retainpdf_pipeline.render.layout.text_analysis import RAW_MATH_TOKEN_KINDS
from retainpdf_pipeline.render.layout.text_analysis import analyze_text
from retainpdf_pipeline.render.layout.text_analysis import is_formula_token
from retainpdf_pipeline.render.layout.text_analysis import math_token_body


STYLE_ONLY_LATEX_COMMAND_RE = re.compile(
    r"\\(?:left|right|mathrm|mathbf|mathit|mathsf|mathtt|text|operatorname|displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b"
)
GENERIC_LATEX_COMMAND_RE = re.compile(r"\\[A-Za-z]+")


def approx_formula_visible_text(formula_text: str) -> str:
    expr = aggressively_simplify_formula_for_latex_math(formula_text or "")
    if not expr:
        return ""
    expr = STYLE_ONLY_LATEX_COMMAND_RE.sub("", expr)
    expr = GENERIC_LATEX_COMMAND_RE.sub("x", expr)
    expr = re.sub(r"[{}]", "", expr)
    expr = expr.replace("~", "")
    expr = re.sub(r"\s+", "", expr)
    return expr


def token_units(token: str, formula_lookup: dict[str, str]) -> float:
    if not token:
        return 0.0
    if token.isspace():
        return max(0.2, len(token) * 0.25)
    if is_formula_token(token):
        formula_text = formula_lookup.get(token, token.strip("$"))
        normalized = approx_formula_visible_text(formula_text)
        if not normalized:
            normalized = re.sub(r"\s+", "", formula_text)
        return max(1.35, len(normalized) * 0.42)
    if re.fullmatch(r"[\u4e00-\u9fff]", token):
        return 1.0
    if re.fullmatch(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*", token):
        return max(1.0, len(token) * 0.55)
    return 0.45


_CJK_MATH_COMMAND_RE = re.compile(r"\\[\u4e00-\u9fff]")
_UNICODE_MATH_COMMAND_RE = re.compile(r"\\unicode\b")


def _math_token_bodies(item: dict) -> list[str]:
    try:
        tokens = analyze_text(get_render_protected_text(item)).tokens
    except Exception:
        return []
    return [math_token_body(token) for token in tokens if token.kind in RAW_MATH_TOKEN_KINDS]


def item_has_cjk_math_command(item: dict) -> bool:
    return any(_CJK_MATH_COMMAND_RE.search(body) for body in _math_token_bodies(item))


def item_has_unicode_math_command(item: dict) -> bool:
    return any(_UNICODE_MATH_COMMAND_RE.search(body) for body in _math_token_bodies(item))


def _plain_math_token_text(expr: str) -> str:
    text = approx_formula_visible_text(expr)
    if text:
        return text
    return " ".join(str(expr or "").split())


def _replace_math_tokens_with_plain_text(text: str) -> str:
    chunks: list[str] = []
    for token in analyze_text(text or "").tokens:
        if token.kind in RAW_MATH_TOKEN_KINDS:
            chunks.append(_plain_math_token_text(math_token_body(token)))
        else:
            chunks.append(token.value)
    return "".join(chunks)


def replace_item_math_tokens_with_plain_text(item: dict) -> dict:
    text = get_render_protected_text(item)
    plain_math_text = _replace_math_tokens_with_plain_text(text)
    cloned = dict(item)
    for field in (
        "render_protected_text",
        "translation_unit_protected_translated_text",
        "protected_translated_text",
        "translated_text",
        "group_protected_translated_text",
        "group_translated_text",
    ):
        if field in cloned:
            cloned[field] = plain_math_text
    if not any(field in cloned for field in ("render_protected_text", "protected_translated_text", "translated_text")):
        cloned["render_protected_text"] = plain_math_text
    cloned["_typst_math_token_plain_text"] = True
    cloned.pop("_force_plain_line", None)
    return cloned


def prescreen_cjk_math_items(
    translated_pages: dict[int, list[dict]],
) -> tuple[dict[int, list[dict]], int]:
    prescreened = 0
    result: dict[int, list[dict]] = {}
    for page_idx, items in translated_pages.items():
        next_items: list[dict] = []
        for item in items:
            if item_has_cjk_math_command(item) or item_has_unicode_math_command(item):
                next_items.append(replace_item_math_tokens_with_plain_text(item))
                prescreened += 1
            else:
                next_items.append(item)
        result[page_idx] = next_items
    return result, prescreened
