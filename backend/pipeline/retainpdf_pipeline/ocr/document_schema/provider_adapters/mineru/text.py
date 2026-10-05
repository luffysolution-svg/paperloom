from __future__ import annotations

"""Raw MinerU block traversal, text extraction and text assembly."""

import re
from collections.abc import Iterable

from retainpdf_pipeline.ocr.document_schema.provider_adapters.mineru.geometry import (
    valid_bbox,
)

_MATH_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def iter_layout_pages(layout_payload: dict) -> list[dict]:
    pages = layout_payload.get("pdf_info", []) or []
    return pages if isinstance(pages, list) else []


def iter_child_blocks(block: dict) -> list[dict]:
    children = block.get("blocks", []) or []
    return (
        [child for child in children if isinstance(child, dict)]
        if isinstance(children, list)
        else []
    )


def repair_math_control_chars(text: str, next_text: str = "") -> str:
    """Keep the existing narrow repair for legacy MinerU math control bytes."""

    if not text or not _MATH_CONTROL_CHAR_RE.search(text):
        return text
    chars = list(text)
    for match in list(_MATH_CONTROL_CHAR_RE.finditer(text)):
        start, end = match.span()
        before = text[max(0, start - 48) : start].lower()
        after = (text[end : min(len(text), end + 48)] + " " + next_text[:48]).lower()
        if re.search(
            r"(fixing|rotation angle|torsion angle|dihedral angle|angle|angles|function of)\s*$",
            before,
        ) or re.search(
            r"^\s*(as a dihedral angle|of the methyl group|varying|represents|=|and|or|\))",
            after,
        ):
            chars[start] = r"\theta"
        else:
            chars[start] = " "
    return "".join(chars)


def normalize_text(
    raw_text: str, next_text: str = "", *, preserve_lines: bool = False
) -> str:
    repaired = repair_math_control_chars(raw_text, next_text=next_text)
    if preserve_lines:
        return repaired.strip()
    return " ".join(repaired.split())


def iter_direct_lines(block: dict) -> Iterable[dict]:
    lines = block.get("lines", []) or []
    if isinstance(lines, list):
        yield from (line for line in lines if isinstance(line, dict))


def iter_descendant_lines(block: dict) -> Iterable[dict]:
    yield from iter_direct_lines(block)
    for child in iter_child_blocks(block):
        yield from iter_descendant_lines(child)


def iter_spans(raw_spans: object) -> Iterable[dict]:
    if not isinstance(raw_spans, list):
        return
    for span in raw_spans:
        if not isinstance(span, dict):
            continue
        children = span.get("children")
        if str(
            span.get("type", "") or ""
        ).strip().lower() == "hyperlink" and isinstance(children, list):
            yield from iter_spans(children)
            continue
        yield span


def normalized_line_and_segments(
    line: dict,
    *,
    preserve_lines: bool,
) -> tuple[dict | None, list[dict]]:
    spans = list(iter_spans(line.get("spans", [])))
    spans_out: list[dict] = []
    for index, span in enumerate(spans):
        content = span.get("content", "")
        if content is None or not str(content).strip():
            continue
        next_content = (
            spans[index + 1].get("content", "") if index + 1 < len(spans) else ""
        )
        span_type = str(span.get("type", "text") or "text").strip().lower()
        normalized_span = {
            "type": (
                "inline_formula"
                if span_type == "inline_equation"
                else (
                    "formula"
                    if span_type in {"interline_equation", "equation"}
                    else "text"
                )
            ),
            "raw_type": span_type,
            "text": normalize_text(
                str(content),
                str(next_content or ""),
                preserve_lines=preserve_lines,
            ),
            "bbox": span.get("bbox", []),
            "score": span.get("score"),
        }
        if valid_bbox(span.get("bbox")) is not None:
            normalized_span["bbox_precision"] = "provider_layout"
        spans_out.append(normalized_span)
    if not spans_out:
        return None, []
    normalized_line = {"bbox": line.get("bbox", []), "spans": spans_out}
    if valid_bbox(line.get("bbox")) is not None:
        normalized_line["bbox_precision"] = "provider_layout"
    return normalized_line, spans_out


def extract_text_structure(
    block: dict, *, aggregate_children: bool
) -> tuple[list[dict], list[dict], str]:
    raw_type = str(block.get("type", "") or "").strip().lower()
    preserve_lines = raw_type in {"code", "code_body", "algorithm"}
    raw_lines = (
        iter_descendant_lines(block)
        if aggregate_children
        else iter_direct_lines(block)
    )
    lines_out: list[dict] = []
    segments: list[dict] = []
    for line in raw_lines:
        normalized_line, line_segments = normalized_line_and_segments(
            line,
            preserve_lines=preserve_lines,
        )
        if normalized_line is not None:
            lines_out.append(normalized_line)
            segments.extend(line_segments)
    separator = "\n" if preserve_lines else " "
    text = separator.join(
        segment["text"] for segment in segments if segment.get("text")
    ).strip()
    return lines_out, segments, text


def join_line_texts(lines: list[dict], *, preserve_lines: bool) -> str:
    separator = "\n" if preserve_lines else " "
    return separator.join(
        str(span.get("text", "") or "")
        for line in lines
        if isinstance(line, dict)
        for span in (line.get("spans", []) or [])
        if isinstance(span, dict) and span.get("text")
    ).strip()

__all__ = [
    "extract_text_structure",
    "iter_child_blocks",
    "iter_descendant_lines",
    "iter_direct_lines",
    "iter_layout_pages",
    "iter_spans",
    "join_line_texts",
    "normalize_text",
    "normalized_line_and_segments",
    "repair_math_control_chars",
]
