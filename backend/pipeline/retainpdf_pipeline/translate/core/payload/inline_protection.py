"""公式与术语的合并保护。

formula_protection 只产出公式跨度，term_protection 只产出术语跨度，两个模块互不
认识。合并发生在这里，因为重叠取舍必须一次做完：各自打各自的 token，重叠处会互相
覆盖。

这样拆的好处是删得动：placeholder 模式退场时，formula_protection 和本文件一起走，
term_protection 留在原地继续服务 direct_typst。
"""

from __future__ import annotations

from retainpdf_pipeline.translate.core.payload.formula_protection import GREEK_COMMA_PAIR_RE
from retainpdf_pipeline.translate.core.payload.formula_protection import SegmentRecord
from retainpdf_pipeline.translate.core.payload.formula_protection import collect_formula_spans
from retainpdf_pipeline.translate.core.payload.formula_protection import (
    formula_map_from_protected_map_entries,
)
from retainpdf_pipeline.translate.core.payload.formula_protection import (
    looks_like_formula_neighbor_fragment,
)
from retainpdf_pipeline.translate.core.payload.formula_protection import prepare_text
from retainpdf_pipeline.translate.core.payload.formula_protection import (
    should_protect_segment_formula_candidate,
)
from retainpdf_pipeline.translate.core.payload.term_protection import collect_term_spans
from retainpdf_pipeline.translate.core.payload.token_protection import Span
from retainpdf_pipeline.translate.core.payload.token_protection import protect_spans
from retainpdf_pipeline.translate.core.terms.glossary import GlossaryEntry


def protect_inline_formulas(
    text: str,
    *,
    glossary_entries: list[GlossaryEntry] | None = None,
) -> tuple[str, list[dict]]:
    protected_text, protected_map = protect_inline_content(text, glossary_entries=glossary_entries)
    return protected_text, formula_map_from_protected_map_entries(protected_map)



def protect_inline_content(
    text: str,
    *,
    glossary_entries: list[GlossaryEntry] | None = None,
) -> tuple[str, list[dict]]:
    prepared = prepare_text(text)
    spans = collect_formula_spans(prepared)
    spans.extend(collect_term_spans(prepared, glossary_entries))
    return protect_spans(prepared, spans)



def protect_inline_formulas_in_segments(
    segments: list[dict],
    *,
    glossary_entries: list[GlossaryEntry] | None = None,
) -> tuple[str, list[dict], list[dict]]:
    chunks: list[str] = []
    records: list[SegmentRecord] = []
    cursor = 0
    for index, segment in enumerate(segments):
        content = segment.get("content", "").strip()
        if not content:
            continue
        if chunks:
            chunks.append(" ")
            cursor += 1
        start = cursor
        chunks.append(content)
        cursor += len(content)
        records.append(
            SegmentRecord(
                index=index,
                segment_type=str(segment.get("type", "") or ""),
                content=content,
                start=start,
                end=cursor,
            )
        )
    text = prepare_text("".join(chunks))
    formula_spans: list[Span] = []
    consumed_indexes: set[int] = set()
    for position, record in enumerate(records):
        if record.index in consumed_indexes:
            continue
        if record.segment_type != "inline_equation":
            continue
        if GREEK_COMMA_PAIR_RE.match(record.content):
            continue
        start_record = record
        end_record = record
        merged_left_fragment = False
        if position > 0:
            left = records[position - 1]
            if (
                left.index not in consumed_indexes
                and left.segment_type == "text"
                and looks_like_formula_neighbor_fragment(left.content)
            ):
                start_record = left
                consumed_indexes.add(left.index)
                merged_left_fragment = True
        merged_content = text[start_record.start:end_record.end]
        if not should_protect_segment_formula_candidate(
            merged_content,
            merged_left_fragment=merged_left_fragment,
        ):
            continue
        consumed_indexes.add(record.index)
        formula_spans.append(Span(start_record.start, end_record.end, "formula", merged_content, merged_content))
    spans = formula_spans + collect_term_spans(text, glossary_entries)
    protected_text, protected_map = protect_spans(text, spans)
    return protected_text, formula_map_from_protected_map_entries(protected_map), protected_map


__all__ = [
    "protect_inline_content",
    "protect_inline_formulas",
    "protect_inline_formulas_in_segments",
]
