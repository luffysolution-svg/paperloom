from __future__ import annotations

import hashlib
import json
from pathlib import Path

from retainpdf_pipeline.foundation.config import fonts
from retainpdf_pipeline.render.output.typst.source_builder import build_typst_book_overlay_source


PREBUILT_SOURCE_RENDER_VERSION = "overlay_cover_fill_title_color_v14_font_identity"
PAGE_SIZE_TOLERANCE_PT = 0.5
SOURCE_FINGERPRINT_PREFIX = "// overlay_source_fingerprint="


def prebuilt_source_matches_page_specs(
    prebuilt_source_path: Path,
    book_specs: list[tuple[float, float, list[dict]]],
    *,
    font_family: str = fonts.TYPST_DEFAULT_FONT_FAMILY,
    include_cover_rect: bool = False,
) -> bool:
    expected_fingerprint = overlay_source_fingerprint(
        book_specs,
        font_family=font_family,
        include_cover_rect=include_cover_rect,
    )
    header_fingerprint = prebuilt_source_fingerprint(prebuilt_source_path)
    # Legacy page-size-only sources cannot prove either content or font identity.
    # A missing/old fingerprint is a cache miss and is rebuilt on normal demand.
    return header_fingerprint == expected_fingerprint


def resolve_prebuilt_overlay_source(
    *,
    prebuilt_source_path: Path | None,
    temp_root: Path | None,
    stem: str,
    book_specs: list[tuple[float, float, list[dict]]],
    font_family: str = fonts.TYPST_DEFAULT_FONT_FAMILY,
    include_cover_rect: bool = False,
) -> tuple[Path | None, float]:
    import time

    started = time.perf_counter()
    active_path = Path(prebuilt_source_path) if prebuilt_source_path is not None else None
    if active_path is None and temp_root is not None:
        active_path = temp_root / "book-overlay-sources" / f"{stem}.typ.prebuilt"
    if (
        active_path is not None
        and active_path.exists()
        and prebuilt_source_matches_page_specs(
            active_path,
            book_specs,
            font_family=font_family,
            include_cover_rect=include_cover_rect,
        )
    ):
        print(f"typst book overlay source prewarm: hit {active_path}", flush=True)
        return active_path, time.perf_counter() - started
    if temp_root is None:
        return None, time.perf_counter() - started
    source_work_dir = active_path.parent if active_path is not None else temp_root / "book-overlay-sources"
    source_work_dir.mkdir(parents=True, exist_ok=True)
    active_path = active_path or source_work_dir / f"{stem}.typ.prebuilt"
    fingerprint = overlay_source_fingerprint(
        book_specs,
        font_family=font_family,
        include_cover_rect=include_cover_rect,
    )
    active_path.write_text(
        f"// {_source_version_marker(include_cover_rect=include_cover_rect)}\n"
        f"{SOURCE_FINGERPRINT_PREFIX}{fingerprint}\n"
        + build_typst_book_overlay_source(
            book_specs,
            font_family=font_family,
            include_cover_rect=include_cover_rect,
        ),
        encoding="utf-8",
    )
    return active_path, time.perf_counter() - started


def _source_version_marker(*, include_cover_rect: bool) -> str:
    suffix = "_cover_fill" if include_cover_rect else ""
    return f"{PREBUILT_SOURCE_RENDER_VERSION}{suffix}"


def prebuilt_source_fingerprint(path: Path) -> str:
    try:
        with Path(path).open("r", encoding="utf-8") as handle:
            for _line_index in range(8):
                line = handle.readline()
                if not line:
                    break
                if line.startswith(SOURCE_FINGERPRINT_PREFIX):
                    return line[len(SOURCE_FINGERPRINT_PREFIX):].strip()
    except OSError:
        return ""
    return ""


def overlay_source_fingerprint(
    book_specs: list[tuple[float, float, list[dict]]],
    *,
    font_family: str = fonts.TYPST_DEFAULT_FONT_FAMILY,
    include_cover_rect: bool = False,
) -> str:
    digest = hashlib.sha256()
    digest.update(_source_version_marker(include_cover_rect=include_cover_rect).encode("utf-8"))
    digest.update(b"\n")
    digest.update(json.dumps(font_family, ensure_ascii=False).encode("utf-8"))
    digest.update(b"\n")
    for page_width, page_height, items in book_specs:
        digest.update(f"{float(page_width):.3f},{float(page_height):.3f}\n".encode("utf-8"))
        for item in items:
            digest.update(
                json.dumps(
                    _overlay_item_fingerprint_payload(item),
                    sort_keys=True,
                    separators=(",", ":"),
                    ensure_ascii=False,
                ).encode("utf-8")
            )
            digest.update(b"\n")
    return digest.hexdigest()


def _overlay_item_fingerprint_payload(item: dict) -> dict[str, object]:
    return {
        "item_id": str(item.get("item_id") or ""),
        "bbox": _rounded_list(item.get("bbox")),
        "inner_bbox": _rounded_list(item.get("_render_inner_bbox")),
        "text": str(item.get("render_protected_text") or item.get("protected_translated_text") or ""),
        "source_text": str(item.get("render_source_text") or item.get("protected_source_text") or item.get("source_text") or ""),
        "formula_map": item.get("render_formula_map") or item.get("formula_map") or [],
        "block_kind": str(item.get("block_kind") or ""),
        "block_type": str(item.get("block_type") or ""),
        "layout_role": str(item.get("layout_role") or ""),
        "font_size": _rounded_float(item.get("_render_font_size_pt") or item.get("font_size_pt")),
        "leading": _rounded_float(item.get("_render_leading_em") or item.get("leading_em")),
        "first_line_indent": _rounded_float(item.get("_render_first_line_indent_pt")),
        "cover_fill": _rounded_list(item.get("_render_cover_fill")),
        "text_color": _rounded_list(item.get("_render_text_color")),
    }


def _rounded_list(value: object) -> list[float]:
    if not isinstance(value, (list, tuple)):
        return []
    result: list[float] = []
    for item in value[:4]:
        rounded = _rounded_float(item)
        if rounded is not None:
            result.append(rounded)
    return result


def _rounded_float(value: object) -> float | None:
    try:
        return round(float(value), 4)
    except Exception:
        return None


__all__ = [
    "PAGE_SIZE_TOLERANCE_PT",
    "PREBUILT_SOURCE_RENDER_VERSION",
    "overlay_source_fingerprint",
    "prebuilt_source_fingerprint",
    "prebuilt_source_matches_page_specs",
    "resolve_prebuilt_overlay_source",
]
