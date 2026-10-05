from __future__ import annotations

from copy import deepcopy
from dataclasses import replace
from pathlib import Path

from retainpdf_pipeline.render.visual_profile.io import read_document_visual_profile
from retainpdf_pipeline.render.visual_profile.io import write_document_visual_profile


def remap_selected_render_pages(
    pages: dict[int, list[dict]], *, start_page: int, end_page: int
) -> dict[int, list[dict]]:
    """Use local PDF indices without changing document-scoped item identities."""
    remapped = {}
    for page_idx, items in pages.items():
        if not start_page <= page_idx <= end_page:
            continue
        local_page_idx = page_idx - start_page
        local_items = deepcopy(items)
        for item in local_items:
            # Payload preparation indexes its page metrics using this field,
            # independently of the containing dictionary's page key.
            item["page_idx"] = local_page_idx
        remapped[local_page_idx] = local_items
    return remapped


def remap_selected_visual_profile(
    source_path: Path | None,
    output_path: Path,
    *,
    start_page: int,
    end_page: int,
) -> Path | None:
    if source_path is None:
        return None
    profile = read_document_visual_profile(source_path)
    if profile is None:
        # Preserve the runtime's existing missing/invalid-profile diagnostics.
        return source_path
    pages = {}
    for page_idx, page in profile.pages.items():
        if not start_page <= page_idx <= end_page:
            continue
        local_page_idx = page_idx - start_page
        pages[local_page_idx] = replace(
            page,
            page_index=local_page_idx,
            items={
                item_id: replace(item, page_index=local_page_idx)
                for item_id, item in page.items.items()
            },
        )
    write_document_visual_profile(output_path, replace(profile, pages=pages))
    return output_path
