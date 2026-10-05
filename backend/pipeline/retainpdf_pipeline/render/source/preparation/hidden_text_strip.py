from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import fitz
import pikepdf
from pikepdf import Name

from retainpdf_pipeline.render.source.document_ops import page_is_pseudo_editable_scan


TEXT_SHOW_OPERATORS = {"Tj", "TJ", "'", '"'}


@dataclass(frozen=True)
class HiddenTextStripResult:
    changed: bool
    output_pdf_path: Path | None = None
    pages_changed: int = 0
    text_objects_removed: int = 0


def _page_hidden_text_scan_candidate(page: fitz.Page) -> bool:
    return page_is_pseudo_editable_scan(page)


def _collect_hidden_text_scan_pages(
    pdf_path: Path,
    *,
    start_page: int = 0,
    end_page: int = -1,
) -> set[int]:
    doc = fitz.open(pdf_path)
    try:
        if not doc:
            return set()
        start = max(0, start_page)
        stop = len(doc) - 1 if end_page < 0 else min(end_page, len(doc) - 1)
        if start > stop:
            return set()
        return {
            page_idx
            for page_idx in range(start, stop + 1)
            if _page_hidden_text_scan_candidate(doc[page_idx])
        }
    finally:
        doc.close()


def _resolve_gs_fill_opacity(operands: list, extgstates) -> float | None:
    if not operands or extgstates is None:
        return None
    try:
        raw_name = operands[0]
        key = raw_name if isinstance(raw_name, Name) else Name(str(raw_name))
        gs = extgstates.get(key)
        if gs is None:
            return None
        ca = gs.get(Name("/ca"))
        if ca is None:
            return None
        return float(ca)
    except Exception:
        return None


def _analyze_text_object_visibility(
    text_ops: list[tuple],
    *,
    initial_render_mode: int = 0,
    effective_opacity: float = 1.0,
) -> tuple[bool, int]:
    render_mode = initial_render_mode
    saw_text_show = False
    all_text_show_is_hidden = True
    for index in range(len(text_ops)):
        operands = text_ops[index][0]
        operator = text_ops[index][1]
        op = str(operator)
        if op == "Tr" and operands:
            try:
                render_mode = int(operands[0])
            except Exception:
                render_mode = 0
        if op in TEXT_SHOW_OPERATORS:
            saw_text_show = True
            if render_mode != 3:
                all_text_show_is_hidden = False
    try:
        fully_transparent = float(effective_opacity) <= 0.0
    except Exception:
        fully_transparent = False
    return saw_text_show and (all_text_show_is_hidden or fully_transparent), render_mode


def _text_object_is_hidden(text_ops: list[tuple]) -> bool:
    hidden, _final_render_mode = _analyze_text_object_visibility(text_ops)
    return hidden


def _strip_hidden_text_objects_from_page(page: pikepdf.Page) -> tuple[bytes | None, int]:
    instructions = list(pikepdf.parse_content_stream(page))
    if not instructions:
        return None, 0

    try:
        extgstates = page.Resources.get(Name("/ExtGState"))
    except Exception:
        extgstates = None
    if extgstates is not None and not hasattr(extgstates, "get"):
        extgstates = None

    output_instructions: list[tuple] = []
    removed = 0
    index = 0
    render_mode = 0
    render_mode_stack: list[int] = []
    opacity = 1.0
    opacity_stack: list[float] = []
    while index < len(instructions):
        operands = instructions[index][0]
        operator = instructions[index][1]
        op = str(operator)
        if op == "q":
            render_mode_stack.append(render_mode)
            opacity_stack.append(opacity)
            output_instructions.append((operands, operator))
            index += 1
            continue
        if op == "Q":
            render_mode = render_mode_stack.pop() if render_mode_stack else 0
            opacity = opacity_stack.pop() if opacity_stack else 1.0
            output_instructions.append((operands, operator))
            index += 1
            continue
        if op == "gs" and operands:
            resolved = _resolve_gs_fill_opacity(list(operands), extgstates)
            if resolved is not None:
                opacity = resolved
            output_instructions.append((operands, operator))
            index += 1
            continue
        if op == "Tr" and operands:
            try:
                render_mode = int(operands[0])
            except Exception:
                render_mode = 0
            output_instructions.append((operands, operator))
            index += 1
            continue
        if op != "BT":
            output_instructions.append((operands, operator))
            index += 1
            continue

        text_object = [(operands, operator)]
        index += 1
        while index < len(instructions):
            text_object.append(instructions[index])
            inner_operands = instructions[index][0]
            inner_operator = instructions[index][1]
            if str(inner_operator) == "gs" and inner_operands:
                resolved = _resolve_gs_fill_opacity(list(inner_operands), extgstates)
                if resolved is not None:
                    opacity = resolved
            if str(inner_operator) == "ET":
                index += 1
                break
            index += 1

        hidden, render_mode = _analyze_text_object_visibility(
            text_object,
            initial_render_mode=render_mode,
            effective_opacity=opacity,
        )
        if hidden:
            removed += 1
            continue
        output_instructions.extend(text_object)
    if removed <= 0:
        return None, 0
    return pikepdf.unparse_content_stream(output_instructions), removed


def build_hidden_text_stripped_pdf_copy(
    source_pdf_path: Path,
    output_pdf_path: Path,
    *,
    start_page: int = 0,
    end_page: int = -1,
) -> HiddenTextStripResult:
    candidate_pages = _collect_hidden_text_scan_pages(
        source_pdf_path,
        start_page=start_page,
        end_page=end_page,
    )
    if not candidate_pages:
        return HiddenTextStripResult(changed=False)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    pages_changed = 0
    text_objects_removed = 0
    with pikepdf.Pdf.open(source_pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            if page_idx not in candidate_pages:
                continue
            content_stream, removed = _strip_hidden_text_objects_from_page(page)
            if not content_stream or removed <= 0:
                continue
            page.obj[Name("/Contents")] = pdf.make_stream(content_stream)
            pages_changed += 1
            text_objects_removed += removed

        if pages_changed <= 0:
            return HiddenTextStripResult(changed=False)

        pdf.save(
            output_pdf_path,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
            compress_streams=True,
            recompress_flate=True,
        )

    print(
        f"hidden text strip: pages={pages_changed} text_objects={text_objects_removed} "
        f"output={output_pdf_path}",
        flush=True,
    )
    return HiddenTextStripResult(
        changed=True,
        output_pdf_path=output_pdf_path,
        pages_changed=pages_changed,
        text_objects_removed=text_objects_removed,
    )
