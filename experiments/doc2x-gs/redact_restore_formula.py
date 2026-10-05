from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import fitz


def _expand(rect: fitz.Rect, dx: float = 2.0, dy: float = 2.0) -> fitz.Rect:
    return fitz.Rect(rect.x0 - dx, rect.y0 - dy, rect.x1 + dx, rect.y1 + dy)


def _detect_formula_regions(page: fitz.Page) -> list[fitz.Rect]:
    """Sample-only formula detector.

    Backend integration should consume PaddleOCR display_formula bboxes instead.
    This detector exists only to keep the experiment runnable without OCR.
    """
    regions: list[fitz.Rect] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        spans = [
            span
            for line in block.get("lines", [])
            for span in line.get("spans", [])
            if str(span.get("text", "")).strip()
        ]
        if not spans:
            continue
        text = " ".join(str(span.get("text", "")) for span in spans)
        fonts = {str(span.get("font", "")) for span in spans}
        sizes = {round(float(span.get("size", 0.0)), 1) for span in spans}
        bbox = fitz.Rect(block["bbox"])

        has_math_font = any("Math" in font or "P4C4E" in font for font in fonts)
        has_mixed_sizes = len(sizes) >= 2
        has_formula_symbols = bool(re.search(r"¼|þ|\x01|\x02|\x03|\x04|\x05|\x06", text))
        paragraph_like = bbox.x0 < 65 and bbox.width > page.rect.width * 0.55 and len(text) > 80
        if (has_math_font or has_mixed_sizes or has_formula_symbols) and not paragraph_like:
            regions.append(_expand(bbox, dx=4.0, dy=4.0))

    merged: list[fitz.Rect] = []
    for rect in sorted(regions, key=lambda item: (item.y0, item.x0)):
        if merged and abs(((merged[-1].y0 + merged[-1].y1) - (rect.y0 + rect.y1)) / 2.0) < 18:
            merged[-1] |= rect
        else:
            merged.append(fitz.Rect(rect))
    return merged


def _default_redaction_regions(page: fitz.Page) -> list[fitz.Rect]:
    """Aggressive test regions that intentionally cover formulas.

    This simulates our translated paragraph boxes spanning across display formulas:
    first redact broad text bands, then restore formula clips from the original PDF.
    """
    return [
        fitz.Rect(40, 55, page.rect.width - 35, 315),
        fitz.Rect(40, 315, page.rect.width - 35, 510),
        fitz.Rect(40, 510, page.rect.width - 35, 595),
    ]


def _overlap_area(left: fitz.Rect, right: fitz.Rect) -> float:
    overlap = left & right
    if overlap.is_empty:
        return 0.0
    return max(0.0, overlap.width) * max(0.0, overlap.height)


def _rect_area(rect: fitz.Rect) -> float:
    return max(0.0, rect.width) * max(0.0, rect.height)


def _intersects_any(rect: fitz.Rect, candidates: list[fitz.Rect]) -> bool:
    return any(not (rect & candidate).is_empty for candidate in candidates)


def _auto_text_redaction_regions(page: fitz.Page, formula_regions: list[fitz.Rect]) -> list[fitz.Rect]:
    regions: list[fitz.Rect] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        text = " ".join(
            str(span.get("text", ""))
            for line in block.get("lines", [])
            for span in line.get("spans", [])
        ).strip()
        if not text:
            continue
        rect = fitz.Rect(block["bbox"])
        area = max(1.0, _rect_area(rect))
        if any(_overlap_area(rect, formula) / area >= 0.55 for formula in formula_regions):
            continue
        regions.append(_expand(rect, dx=1.2, dy=1.2))
    return regions


def _render_preview(pdf_path: Path, preview_path: Path, *, page_index: int = 0, zoom: float = 2.0) -> None:
    doc = fitz.open(pdf_path)
    pixmap = doc[page_index].get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    pixmap.save(preview_path)


def redact_then_restore_formulas(
    input_pdf: Path,
    output_pdf: Path,
    diagnostics_json: Path,
    *,
    pages: list[int],
    redaction_mode: str,
) -> None:
    src = fitz.open(input_pdf)
    dst = fitz.open(input_pdf)
    diagnostics: dict = {
        "input_pdf": str(input_pdf),
        "output_pdf": str(output_pdf),
        "pages": pages,
        "page_details": [],
    }

    for page_number in pages:
        if page_number < 1 or page_number > dst.page_count:
            raise ValueError(f"page out of range: {page_number}; total={dst.page_count}")
        page = dst[page_number - 1]
        all_formula_regions = _detect_formula_regions(src[page_number - 1])
        if redaction_mode == "text-blocks":
            redaction_regions = _auto_text_redaction_regions(page, all_formula_regions)
        else:
            redaction_regions = _default_redaction_regions(page)
        formula_regions = [rect for rect in all_formula_regions if _intersects_any(rect, redaction_regions)]

        for rect in redaction_regions:
            page.add_redact_annot(rect, fill=False)
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_NONE,
            graphics=fitz.PDF_REDACT_LINE_ART_NONE,
        )

        for rect in formula_regions:
            # show_pdf_page places the original formula clip back as vector Form XObject.
            page.show_pdf_page(rect, src, page_number - 1, clip=rect)

        diagnostics["page_details"].append(
            {
                "page": page_number,
                "redaction_mode": redaction_mode,
                "redaction_regions": [[rect.x0, rect.y0, rect.x1, rect.y1] for rect in redaction_regions],
                "formula_regions": [[rect.x0, rect.y0, rect.x1, rect.y1] for rect in formula_regions],
            }
        )

    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    dst.save(output_pdf, garbage=4, deflate=True)
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
    parser = argparse.ArgumentParser(description="POC: redact broad text bands, then restore formula clips.")
    parser.add_argument("--input", type=Path, default=Path("电子结构方法-第四章-高斯基组.pdf"))
    parser.add_argument("--output", type=Path, default=Path("work/redact-restore-formula.pdf"))
    parser.add_argument("--diagnostics", type=Path, default=Path("work/redact-restore-formula-diagnostics.json"))
    parser.add_argument("--preview", type=Path, default=Path("work/redact-restore-formula-page1.png"))
    parser.add_argument("--pages", default="1")
    parser.add_argument("--redaction-mode", choices=["bands", "text-blocks"], default="bands")
    args = parser.parse_args()

    doc = fitz.open(args.input)
    pages = _parse_pages(args.pages, doc.page_count)
    doc.close()
    redact_then_restore_formulas(args.input, args.output, args.diagnostics, pages=pages, redaction_mode=args.redaction_mode)
    if args.preview and pages:
        _render_preview(args.output, args.preview, page_index=pages[0] - 1)
    print(f"wrote {args.output}")
    print(f"wrote {args.diagnostics}")
    if args.preview:
        print(f"wrote {args.preview}")


if __name__ == "__main__":
    main()
