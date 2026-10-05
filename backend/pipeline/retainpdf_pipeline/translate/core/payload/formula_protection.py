from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

from retainpdf_pipeline.translate.core.payload.token_protection import (
    INLINE_MATH_RE,
    LEGACY_ALIAS_PLACEHOLDER_RE,
    LEGACY_FORMULA_PLACEHOLDER_RE,
    ProtectedToken,
    TOKEN_TYPE_PREFIX,
    TYPED_TOKEN_RE,
    Span as _Span,
    checksum as _checksum,
    formula_map_from_protected_map,
    next_token_indexes as _next_token_indexes,
    overlaps_any as _overlaps_any,
    protected_map_from_formula_map,
    restore_protected_tokens,
    restore_tokens_by_type,
    token_tag as _token_tag,
    wrap_formula_inline_math,
)
# 术语保护搬去 term_protection.py:它在 direct_typst 路径上是活的,而本文件只服务
# placeholder 模式。此处转出仅为兼容既有 import 点。
# PROTECTED_TOKEN_RE 此前经本文件转出给 payload/__init__,保留这条转出避免
# 无关模块跟着改 import 路径。
from retainpdf_pipeline.translate.core.placeholder_tokens import PROTECTED_TOKEN_RE


PROSE_BOUNDARY_RE = re.compile(r"([}\]])([A-Za-z][a-z]{2,})")
LATEX_FORMULA_RE = re.compile(
    r"""
    (
        (?:
            \\[A-Za-z]+
            | [A-Za-z]
        )
        (?:
            \s*
            (?:
                _\s*\{[^{}]*\}
                | \^\s*\{[^{}]*\}
                | _\s*[A-Za-z0-9]
                | \^\s*[A-Za-z0-9]
                | \{[^{}]*\}
                | \([^()]*\)
                | \[[^\[\]]*\]
                | [=+\-−*/<>.,]
                | [A-Za-z0-9]
                | \\[A-Za-z]+
            )
        )+
    )
    """,
    re.VERBOSE,
)
GREEK_RUN_RE = re.compile(
    r"""
    (
        (?:\\[A-Za-z]+|[α-ωΑ-Ωωγβμφαζη∂])
        (?:
            \s*
            (?:
                _\s*\{[^{}]*\}
                | \^\s*\{[^{}]*\}
                | [A-Za-z0-9]
                | \\[A-Za-z]+
            )
        )*
    )
    """,
    re.VERBOSE,
)
GREEK_COMMA_PAIR_RE = re.compile(
    r"""
    ^
    (?:\\alpha|α)
    \s*
    (?:\{\s*,\s*\}|,)
    \s*
    (?:\\beta|β)
    (?:\s*-\s*[A-Za-z]+)?
    $
    """,
    re.VERBOSE,
)
SIMPLE_DISPLAY_COMMAND_RE = re.compile(r"\\(?:mathrm|mathit|mathbf|mathcal|text)\s*\{\s*([^{}]+?)\s*\}")
STANDALONE_GREEK_RE = re.compile(r"^(?:\\[A-Za-z]+|[α-ωΑ-Ωωγβμφαζη∂])$")
SHORT_BOND_LIKE_RE = re.compile(r"^[A-Za-z]{1,3}-[A-Za-z]{1,3}$")
CITATIONISH_PSEUDO_FORMULA_RE = re.compile(r"^(?:\d+\s*[A-Za-z]|[A-Za-z])(?:\s*,\s*(?:\d+\s*[A-Za-z]|[A-Za-z])){2,}$")
PROSE_HEAVY_WORD_RE = re.compile(r"[A-Za-z]{3,}")
REFERENCE_TOKEN_RE = re.compile(r"^(?:\d+\s*[A-Za-z](?:\s*-\s*[A-Za-z])?|[A-Za-z](?:\s*-\s*[A-Za-z])?)$")
FORMULA_NEIGHBOR_ALLOWED_RE = re.compile(r"^[A-Za-z0-9(){}\[\]_^\-+*/=~.,%\\:;]+$")
FORMULA_NEIGHBOR_PUNCT_RE = re.compile(r"^[,.;:)\]}]+$")


@dataclass(frozen=True)
class SegmentRecord:
    index: int
    segment_type: str
    content: str
    start: int
    end: int


def prepare_text(text: str) -> str:
    return PROSE_BOUNDARY_RE.sub(r"\1 \2", text)


def _iter_formula_matches(text: str) -> Iterable[tuple[int, int, str]]:
    for pattern in (LATEX_FORMULA_RE, GREEK_RUN_RE):
        for match in pattern.finditer(text):
            value = match.group(0).strip()
            if GREEK_COMMA_PAIR_RE.match(value):
                continue
            if _should_skip_formula_candidate(value):
                continue
            if any(marker in value for marker in ("\\", "_", "^", "{", "}", "α", "β", "γ", "μ", "φ", "ζ", "η", "∂")):
                yield match.start(), match.end(), value


def _unwrap_display_commands(value: str) -> str:
    previous = value
    while True:
        replaced = SIMPLE_DISPLAY_COMMAND_RE.sub(r"\1", previous)
        if replaced == previous:
            return replaced
        previous = replaced


def _normalize_formula_candidate(value: str) -> str:
    text = _unwrap_display_commands(str(value or "").strip())
    text = text.replace("{", "").replace("}", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _looks_like_standalone_greek_symbol(value: str) -> bool:
    normalized = _normalize_formula_candidate(value)
    if any(marker in normalized for marker in ("_", "^", "(", ")", "[", "]", "+", "=", "/")):
        return False
    return bool(STANDALONE_GREEK_RE.fullmatch(normalized))


def _looks_like_short_bond_token(value: str) -> bool:
    normalized = _normalize_formula_candidate(value).replace(" ", "")
    if any(marker in normalized for marker in ("_", "^", "+", "=", "/", "*")):
        return False
    return bool(SHORT_BOND_LIKE_RE.fullmatch(normalized))


def _looks_like_citationish_pseudo_formula(value: str) -> bool:
    normalized = _normalize_formula_candidate(value)
    if any(marker in normalized for marker in ("_", "^", "(", ")", "[", "]", "+", "=", "/")):
        return False
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if CITATIONISH_PSEUDO_FORMULA_RE.fullmatch(normalized):
        return True
    parts = [part.strip() for part in normalized.split(",") if part.strip()]
    if len(parts) < 4:
        return False
    return all(REFERENCE_TOKEN_RE.fullmatch(part) for part in parts)


def _looks_like_prose_heavy_formula_candidate(value: str) -> bool:
    command_stripped = re.sub(r"\\[A-Za-z]+", " ", str(value or ""))
    normalized = _normalize_formula_candidate(command_stripped)
    words = PROSE_HEAVY_WORD_RE.findall(normalized)
    if len(words) < 4:
        return False
    lowercase_words = sum(1 for word in words if any(ch.islower() for ch in word))
    return lowercase_words >= 3


def _should_skip_formula_candidate(value: str) -> bool:
    return (
        _looks_like_prose_heavy_formula_candidate(value)
        or _looks_like_citationish_pseudo_formula(value)
        or _looks_like_standalone_greek_symbol(value)
        or _looks_like_short_bond_token(value)
    )


def looks_like_formula_neighbor_fragment(text: str) -> bool:
    normalized = " ".join((text or "").split()).strip()
    if not normalized or len(normalized) > 24:
        return False
    words = re.findall(r"[A-Za-z]+", normalized)
    if " " in normalized:
        if len(words) >= 2:
            return False
        if len(words) == 1 and len(normalized) > 8:
            return False
    compact = normalized.replace(" ", "")
    if not compact:
        return False
    if compact.lower() in {"and", "or", "to", "of", "by", "with", "from", "for", "in", "at"}:
        return False
    if FORMULA_NEIGHBOR_PUNCT_RE.fullmatch(compact):
        return False
    if not FORMULA_NEIGHBOR_ALLOWED_RE.fullmatch(compact):
        return False
    if any(ch in compact for ch in "()[]{}_^-+*/=~.,%\\"):
        return True
    return bool(re.search(r"[A-Za-z]+\d|\d+[A-Za-z]|[A-Z][a-z]?[A-Z]", compact))


def should_protect_segment_formula_candidate(value: str, *, merged_left_fragment: bool = False) -> bool:
    if merged_left_fragment:
        return False
    if "\ufffd" in value or "��" in value:
        return False
    return not _should_skip_formula_candidate(value)


def collect_formula_spans(text: str) -> list[_Span]:
    raw_matches = sorted(_iter_formula_matches(text), key=lambda item: (item[0], -(item[1] - item[0])))
    selected: list[_Span] = []
    cursor = 0
    for start, end, value in raw_matches:
        if end <= cursor or start < cursor:
            continue
        selected.append(_Span(start, end, "formula", value, value))
        cursor = end
    return selected


def formula_map_from_protected_map_entries(protected_map: list[dict]) -> list[dict]:
    return [
        {
            "placeholder": str(entry.get("token_tag", "") or ""),
            "formula_text": str(entry.get("restore_text", "") or entry.get("original_text", "") or ""),
        }
        for entry in protected_map
        if str(entry.get("token_type", "") or "") == "formula"
    ]


def restore_inline_formulas(text: str, formula_map: list[dict]) -> str:
    if formula_map and any("token_tag" in item for item in formula_map):
        return restore_protected_tokens(text, formula_map)
    restored = text
    for item in formula_map or []:
        placeholder = str(item.get("placeholder", "") or "")
        formula_text = wrap_formula_inline_math(str(item.get("formula_text", "") or ""))
        if placeholder:
            restored = restored.replace(placeholder, formula_text)
    return restored


def re_protect_restored_formulas(text: str, formula_map: list[dict]) -> str:
    def _can_replace_raw_formula(formula_text: str) -> bool:
        text = str(formula_text or "").strip()
        if not text:
            return False
        if len(text) <= 1:
            return False
        if re.fullmatch(r"[A-Za-z0-9]+", text):
            return False
        return any(
            marker in text
            for marker in ("\\", "_", "^", "{", "}", "(", ")", "[", "]", "+", "-", "=", "/", "*")
        )

    protected = text or ""
    if not protected or not formula_map:
        return protected

    parts = PROTECTED_TOKEN_RE.split(protected)
    delimiters = PROTECTED_TOKEN_RE.findall(protected)

    for item in sorted(formula_map or [], key=lambda entry: len(str(entry.get("formula_text", ""))), reverse=True):
        formula_text = str(item.get("formula_text", "") or "")
        placeholder = str(item.get("placeholder", "") or "")
        if not formula_text or not placeholder:
            continue
        wrapped_formula = wrap_formula_inline_math(formula_text)
        updated_parts: list[str] = []
        for chunk in parts:
            next_chunk = chunk.replace(wrapped_formula, placeholder)
            if _can_replace_raw_formula(formula_text):
                next_chunk = next_chunk.replace(formula_text, placeholder)
            updated_parts.append(next_chunk)
        parts = updated_parts

    rebuilt: list[str] = []
    for index, chunk in enumerate(parts):
        rebuilt.append(chunk)
        if index < len(delimiters):
            rebuilt.append(delimiters[index])
    return "".join(rebuilt)
