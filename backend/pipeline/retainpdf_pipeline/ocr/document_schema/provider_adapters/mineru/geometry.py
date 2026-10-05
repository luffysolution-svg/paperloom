from __future__ import annotations

"""Bounding-box arithmetic for MinerU's raw geometry."""


def valid_bbox(value: object) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    try:
        bbox = [float(item) for item in value]
    except (TypeError, ValueError):
        return None
    if bbox[2] < bbox[0] or bbox[3] < bbox[1]:
        return None
    return bbox


def intersect_bbox(inner: object, outer: object) -> list[float] | None:
    inner_box = valid_bbox(inner)
    outer_box = valid_bbox(outer)
    if inner_box is None or outer_box is None:
        return None
    clamped = [
        max(inner_box[0], outer_box[0]),
        max(inner_box[1], outer_box[1]),
        min(inner_box[2], outer_box[2]),
        min(inner_box[3], outer_box[3]),
    ]
    if clamped[2] < clamped[0] or clamped[3] < clamped[1]:
        return None
    return clamped


def clamp_descendant_bboxes(lines: list[dict], block_bbox: object) -> None:
    for line in lines:
        if not isinstance(line, dict):
            continue
        clamped_line = intersect_bbox(line.get("bbox"), block_bbox)
        if clamped_line is None:
            continue
        line["bbox"] = clamped_line
        for span in line.get("spans", []):
            if not isinstance(span, dict):
                continue
            clamped_span = intersect_bbox(span.get("bbox"), clamped_line)
            if clamped_span is not None:
                span["bbox"] = clamped_span


def split_orphan_line_runs(
    lines: list[dict], block_bbox: object
) -> tuple[list[dict], list[list[dict]]]:
    block_box = valid_bbox(block_bbox)
    if block_box is None:
        return lines, []
    main_lines: list[dict] = []
    orphan_groups: list[list[dict]] = []
    current_run: list[dict] = []
    for line in lines:
        line_box = valid_bbox(line.get("bbox")) if isinstance(line, dict) else None
        if line_box is not None and intersect_bbox(line_box, block_box) is None:
            current_run.append(line)
            continue
        if current_run:
            orphan_groups.append(current_run)
            current_run = []
        main_lines.append(line)
    if current_run:
        orphan_groups.append(current_run)
    return main_lines, orphan_groups

__all__ = [
    "clamp_descendant_bboxes",
    "intersect_bbox",
    "split_orphan_line_runs",
    "valid_bbox",
]
