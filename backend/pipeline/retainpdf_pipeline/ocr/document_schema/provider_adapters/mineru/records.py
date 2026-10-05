from __future__ import annotations

"""MinerU raw blocks -> normalized block records."""

from retainpdf_pipeline.ocr.document_schema.provider_adapters.mineru.assets import (
    build_mineru_asset_metadata,
)
from retainpdf_pipeline.ocr.document_schema.provider_adapters.mineru.geometry import (
    clamp_descendant_bboxes,
    split_orphan_line_runs,
    valid_bbox,
)
from retainpdf_pipeline.ocr.document_schema.provider_adapters.mineru.projection import (
    MinerUBlockProjection,
    project_mineru_block,
)
from retainpdf_pipeline.ocr.document_schema.provider_adapters.mineru.text import (
    extract_text_structure,
    iter_descendant_lines,
    iter_spans,
    join_line_texts,
)
from retainpdf_pipeline.ocr.document_schema.providers import PROVIDER_MINERU


def make_raw_path(page_idx: int, raw_path_parts: list[str | int]) -> str:
    return "/".join([f"/pdf_info/{page_idx}", *(str(part) for part in raw_path_parts)])


def default_derived() -> dict:
    return {"role": "", "by": "", "confidence": 0.0}


def derived_for_projection(projection: MinerUBlockProjection) -> dict:
    if projection.layout_role == "caption":
        return {"role": "caption", "by": "provider_rule", "confidence": 0.98}
    if projection.semantic_role == "abstract":
        return {"role": "abstract", "by": "provider_rule", "confidence": 0.98}
    if projection.semantic_role == "reference":
        return {"role": "reference_entry", "by": "provider_rule", "confidence": 0.98}
    return default_derived()


def provider_payload_metadata(block: dict) -> dict:
    image_paths: list[str] = []
    table_html_values: list[str] = []
    for line in iter_descendant_lines(block):
        for span in iter_spans(line.get("spans", [])):
            image_path = str(span.get("image_path", "") or "").strip()
            if image_path and image_path not in image_paths:
                image_paths.append(image_path)
            table_html = str(span.get("html", "") or "").strip()
            if table_html and table_html not in table_html_values:
                table_html_values.append(table_html)
    metadata: dict[str, object] = {}
    if image_paths:
        metadata["provider_image_paths"] = image_paths
        metadata.update(build_mineru_asset_metadata(image_paths))
    if table_html_values:
        metadata["provider_table_html_available"] = True
        metadata["provider_table_html_count"] = len(table_html_values)
        metadata["content_format"] = "html_table"
    return metadata


def first_provider_table_html(block: dict) -> str:
    for line in iter_descendant_lines(block):
        for span in iter_spans(line.get("spans", [])):
            table_html = str(span.get("html", "") or "").strip()
            if table_html:
                return table_html
    return ""


def effective_block_bbox(
    block: dict, *, aggregate_children: bool
) -> list[float] | list:
    raw_bbox = valid_bbox(block.get("bbox"))
    if not aggregate_children:
        return raw_bbox or block.get("bbox", [])
    candidates = [raw_bbox] if raw_bbox is not None else []
    for line in iter_descendant_lines(block):
        line_bbox = valid_bbox(line.get("bbox"))
        if line_bbox is not None:
            candidates.append(line_bbox)
    if not candidates:
        return block.get("bbox", [])
    return [
        min(bbox[0] for bbox in candidates),
        min(bbox[1] for bbox in candidates),
        max(bbox[2] for bbox in candidates),
        max(bbox[3] for bbox in candidates),
    ]


def build_block_record(
    *,
    block: dict,
    page_idx: int,
    page_block_index: int,
    raw_path_parts: list[str | int],
    aggregate_children: bool,
    parent_group: dict | None,
) -> list[dict]:
    raw_type = str(block.get("type", "") or "").strip().lower()
    raw_sub_type = str(block.get("sub_type", "") or "").strip().lower()
    lines, segments, text = extract_text_structure(
        block, aggregate_children=aggregate_children
    )
    projection = project_mineru_block(
        raw_type, raw_sub_type=raw_sub_type, has_text=bool(text)
    )
    block_id = f"p{page_idx + 1:03d}-b{page_block_index:04d}"
    normalized_bbox = effective_block_bbox(block, aggregate_children=aggregate_children)
    # MinerU's own hierarchy is occasionally off by rounding noise (e.g. a
    # line bottom 1pt below its block). Clamp descendants into the block so
    # the document validator's containment invariant holds; disjoint boxes
    # are left untouched and still fail loudly downstream.
    clamp_descendant_bboxes(lines, normalized_bbox)
    metadata: dict[str, object] = {
        "raw_index": block.get("index"),
        "raw_angle": block.get("angle"),
        "raw_sub_type": raw_sub_type,
        "parent_block_id": "",
        **provider_payload_metadata(block),
        **block.get("_retainpdf_cross_page_recovery", {}),
    }
    if parent_group:
        metadata.update(parent_group)
    preserve_lines = raw_type in {"code", "code_body", "algorithm"}
    main_lines, orphan_runs = split_orphan_line_runs(lines, normalized_bbox)
    # Table content belongs to the first record that actually holds lines;
    # an emptied parent shell must not keep it and win group linkage.
    # Exception: table html lives in raw spans, independent of normalized
    # lines, so a lineless table keeps its content (pre-split behavior).
    main_has_content = bool(main_lines) or (
        projection.content_kind == "table" and bool(first_provider_table_html(block))
    )
    records = [
        block_record_from_lines(
            block=block,
            page_idx=page_idx,
            page_block_index=page_block_index,
            raw_path_parts=raw_path_parts,
            parent_group=parent_group,
            projection=projection,
            raw_type=raw_type,
            raw_sub_type=raw_sub_type,
            metadata=metadata,
            block_bbox=normalized_bbox,
            lines=main_lines,
            preserve_lines=preserve_lines,
            include_table_content=main_has_content,
        )
    ]
    for position, orphan_lines in enumerate(orphan_runs, start=1):
        orphan_bbox: list[float] = [
            min(float(line["bbox"][0]) for line in orphan_lines),
            min(float(line["bbox"][1]) for line in orphan_lines),
            max(float(line["bbox"][2]) for line in orphan_lines),
            max(float(line["bbox"][3]) for line in orphan_lines),
        ]
        records.append(
            block_record_from_lines(
                block=block,
                page_idx=page_idx,
                page_block_index=page_block_index + position,
                raw_path_parts=raw_path_parts,
                parent_group=parent_group,
                projection=projection,
                raw_type=raw_type,
                raw_sub_type=raw_sub_type,
                metadata=metadata,
                block_bbox=orphan_bbox,
                lines=orphan_lines,
                preserve_lines=preserve_lines,
                include_table_content=not main_has_content and position == 1,
            )
        )
    return records


def block_record_from_lines(
    *,
    block: dict,
    page_idx: int,
    page_block_index: int,
    raw_path_parts: list[str | int],
    parent_group: dict | None,
    projection,
    raw_type: str,
    raw_sub_type: str,
    metadata: dict[str, object],
    block_bbox,
    lines: list[dict],
    preserve_lines: bool,
    include_table_content: bool,
) -> dict:
    block_id = f"p{page_idx + 1:03d}-b{page_block_index:04d}"
    block_text = join_line_texts(lines, preserve_lines=preserve_lines)
    # Copies, not aliases: downstream passes (rescale, inherit) mutate lines
    # and segments independently; shared dicts would be scaled twice.
    block_segments = [
        dict(span)
        for line in lines
        if isinstance(line, dict)
        for span in (line.get("spans", []) or [])
        if isinstance(span, dict)
    ]
    record = {
        "block_id": block_id,
        "page_index": page_idx,
        "order": page_block_index,
        "type": projection.content_kind,
        "sub_type": projection.sub_type,
        "bbox": block_bbox,
        "text": block_text,
        "lines": lines,
        "segments": block_segments,
        "tags": list(projection.tags),
        "derived": derived_for_projection(projection),
        "layout_role": projection.layout_role,
        "semantic_role": projection.semantic_role,
        "structure_role": projection.structure_role,
        "policy": {
            "translate": projection.translate,
            "translate_reason": projection.translate_reason,
        },
        "metadata": dict(metadata),
        "source": {
            "provider": PROVIDER_MINERU,
            "raw_page_index": page_idx,
            "raw_path": make_raw_path(page_idx, raw_path_parts),
            "raw_type": raw_type,
            "raw_sub_type": raw_sub_type,
            "raw_bbox": block.get("bbox", []),
            "raw_text_excerpt": block_text[:200],
            "raw_unit": "pt",
            "raw_origin": "top_left",
        },
    }
    table_html = first_provider_table_html(block)
    if include_table_content and projection.content_kind == "table" and table_html:
        record["content"] = {
            "kind": "table",
            "table_html": table_html,
        }
    return record


def ordered_page_roots(page: dict) -> list[tuple[dict, list[str | int]]]:
    roots: list[tuple[dict, list[str | int], int, int]] = []
    ordinal = 0
    for field in ("para_blocks", "discarded_blocks"):
        raw_blocks = page.get(field, []) or []
        if not isinstance(raw_blocks, list):
            continue
        for index, block in enumerate(raw_blocks):
            if not isinstance(block, dict):
                continue
            raw_index = block.get("index")
            sort_index = (
                raw_index if isinstance(raw_index, int) else 1_000_000 + ordinal
            )
            roots.append((block, [field, index], sort_index, ordinal))
            ordinal += 1
    roots.sort(key=lambda item: (item[2], item[3]))
    return [(block, path) for block, path, _index, _ordinal in roots]


__all__ = [
    "build_block_record",
    "effective_block_bbox",
    "make_raw_path",
    "ordered_page_roots",
]
