from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict
from dataclasses import dataclass
from pathlib import Path

import fitz


SHOW_OP_RE = re.compile(rb"\b(TJ|Tj)\b")


@dataclass
class RemovedTextOp:
    page: int
    kind: str
    reason: str
    text: str
    offset_start: int
    offset_end: int


def _find_operand_start(data: bytes, op_start: int, kind: bytes) -> int | None:
    i = op_start - 1
    while i >= 0 and data[i] in b" \t\r\n":
        i -= 1
    if i < 0:
        return None

    if kind == b"TJ":
        depth = 0
        in_string = False
        escaped = False
        for cursor in range(i, -1, -1):
            char = data[cursor]
            if in_string:
                if escaped:
                    escaped = False
                elif char == 0x5C:
                    escaped = True
                elif char == 0x28:
                    in_string = False
                continue
            if char == 0x29:
                in_string = True
                continue
            if char == 0x5D:
                depth += 1
            elif char == 0x5B:
                depth -= 1
                if depth == 0:
                    return cursor
        return None

    if data[i] == 0x29:
        escaped = False
        for cursor in range(i - 1, -1, -1):
            char = data[cursor]
            if escaped:
                escaped = False
            elif char == 0x5C:
                escaped = True
            elif char == 0x28:
                return cursor
        return None

    if data[i] == 0x3E:
        for cursor in range(i - 1, -1, -1):
            if data[cursor] == 0x3C:
                return cursor
    return None


def _decode_pdf_literal_escapes(text: str) -> str:
    text = text.replace(r"\(", "(").replace(r"\)", ")")
    return re.sub(r"\\([0-7]{1,3})", lambda match: chr(int(match.group(1), 8)), text)


def _operand_text(operand: bytes) -> str:
    text = operand.decode("latin1", "ignore")
    strings = re.findall(r"\((?:\\.|[^\\)])*\)", text, flags=re.S)
    if strings:
        return " ".join(_decode_pdf_literal_escapes(value[1:-1]) for value in strings)
    if text.strip().startswith("<"):
        return "<hex>"
    return text


def _compact_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _context_before(data: bytes, start: int, max_bytes: int = 280) -> str:
    return data[max(0, start - max_bytes) : start].decode("latin1", "ignore").replace("\n", " ")


def _should_remove_show_op(operand: bytes, kind: bytes, start: int, data: bytes) -> tuple[bool, str]:
    text = _compact_text(_operand_text(operand))
    if not text:
        return False, ""

    before = _context_before(data, start)

    if "Trindle/Electronic" in text or "Compositor" in text:
        return True, "printer_metadata"

    # This sample has chapter/page numbers as single Tj operations with distinctive fonts.
    if kind == b"Tj" and text == "4" and "/T1_0 1 Tf" in before[-140:]:
        return True, "chapter_number"
    if kind == b"Tj" and text == "61" and "/T1_1 1 Tf 8.9663" in before[-180:]:
        return True, "page_number"

    # Display formulas in this PDF contain small TJ fragments such as [(exp)-172(\()].
    if kind == b"TJ" and re.fullmatch(r".*\bexp\b\s*-?\d*\s*\(?\s*", text):
        return False, ""

    # The body/title text in this file is encoded as long TJ arrays.
    if kind == b"TJ" and re.search(r"[A-Za-z]{3,}", text):
        return True, "english_text_array"

    # A paragraph-inline variable left between two removed TJ arrays. This is intentionally
    # conservative and sample-scoped; the backend version should use real op bbox mapping.
    if kind == b"Tj" and text == "N" and "conve" in before and "that)]TJ" in before:
        return True, "paragraph_inline_variable"

    return False, ""


def _rewrite_page_content_stream(doc: fitz.Document, page: fitz.Page, page_number: int) -> list[RemovedTextOp]:
    contents = page.get_contents()
    if not contents:
        return []

    removed: list[RemovedTextOp] = []
    for xref in contents:
        data = doc.xref_stream(xref)
        if not data:
            continue

        removals: list[tuple[int, int, RemovedTextOp]] = []
        for match in SHOW_OP_RE.finditer(data):
            kind = match.group(1)
            start = _find_operand_start(data, match.start(), kind)
            if start is None:
                continue
            operand = data[start : match.start()].rstrip()
            should_remove, reason = _should_remove_show_op(operand, kind, start, data)
            if not should_remove:
                continue
            record = RemovedTextOp(
                page=page_number,
                kind=kind.decode("ascii"),
                reason=reason,
                text=_compact_text(_operand_text(operand))[:240],
                offset_start=start,
                offset_end=match.end(),
            )
            removals.append((start, match.end(), record))

        if not removals:
            continue
        rewritten = bytearray(data)
        for start, end, record in reversed(removals):
            rewritten[start:end] = b" "
            removed.append(record)
        doc.update_stream(xref, bytes(rewritten))

    return removed


def _render_preview(pdf_path: Path, preview_path: Path, *, page_index: int = 0, zoom: float = 2.0) -> None:
    doc = fitz.open(pdf_path)
    pixmap = doc[page_index].get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    pixmap.save(preview_path)


def run_strip(input_pdf: Path, output_pdf: Path, diagnostics_json: Path, *, pages: list[int]) -> None:
    doc = fitz.open(input_pdf)
    removed: list[RemovedTextOp] = []
    for page_number in pages:
        if page_number < 1 or page_number > doc.page_count:
            raise ValueError(f"page out of range: {page_number}; total={doc.page_count}")
        removed.extend(_rewrite_page_content_stream(doc, doc[page_number - 1], page_number))

    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_pdf, garbage=4, deflate=True)

    diagnostics = {
        "input_pdf": str(input_pdf),
        "output_pdf": str(output_pdf),
        "pages": pages,
        "removed_count": len(removed),
        "removed_ops": [asdict(item) for item in removed],
    }
    diagnostics_json.parent.mkdir(parents=True, exist_ok=True)
    diagnostics_json.write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2), encoding="utf-8")


def _parse_pages(raw: str, page_count: int) -> list[int]:
    value = str(raw or "").strip().lower()
    if value == "all":
        return list(range(1, page_count + 1))
    pages: set[int] = set()
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            left, right = part.split("-", 1)
            pages.update(range(int(left), int(right) + 1))
        else:
            pages.add(int(part))
    return sorted(pages)


def main() -> None:
    parser = argparse.ArgumentParser(description="POC: remove body text operations while preserving display formulas.")
    parser.add_argument("--input", type=Path, default=Path("电子结构方法-第四章-高斯基组.pdf"))
    parser.add_argument("--output", type=Path, default=Path("work/content-op-strip.pdf"))
    parser.add_argument("--diagnostics", type=Path, default=Path("work/content-op-strip-diagnostics.json"))
    parser.add_argument("--pages", default="1", help="1-based pages, ranges, or all. Example: 1,3-5")
    parser.add_argument("--preview", type=Path, default=Path("work/content-op-strip-page1.png"))
    args = parser.parse_args()

    doc = fitz.open(args.input)
    pages = _parse_pages(args.pages, doc.page_count)
    doc.close()

    run_strip(args.input, args.output, args.diagnostics, pages=pages)
    if args.preview and pages:
        _render_preview(args.output, args.preview, page_index=pages[0] - 1)
    print(f"wrote {args.output}")
    print(f"wrote {args.diagnostics}")
    if args.preview:
        print(f"wrote {args.preview}")


if __name__ == "__main__":
    main()
