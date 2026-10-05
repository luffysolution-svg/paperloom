import hashlib
import sys
from pathlib import Path
from unittest import mock

import pytest


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from retainpdf_pipeline.foundation.config import fonts
from retainpdf_pipeline.render.output.typst import overlay_source_cache


BOOK_SPECS = [(200.0, 120.0, [])]


def _resolve(root: Path | None, *, font_family: str, prebuilt_source_path: Path | None = None):
    return overlay_source_cache.resolve_prebuilt_overlay_source(
        prebuilt_source_path=prebuilt_source_path,
        temp_root=root,
        stem="book-overlay",
        book_specs=BOOK_SPECS,
        font_family=font_family,
    )[0]


def test_changed_font_rebuilds_cached_overlay_source(tmp_path: Path) -> None:
    path = _resolve(tmp_path, font_family="Noto Serif CJK SC")
    assert path is not None
    original_source = path.read_text(encoding="utf-8")
    assert 'font: "Noto Serif CJK SC"' in original_source

    assert _resolve(tmp_path, font_family="Arial") == path
    rebuilt_source = path.read_text(encoding="utf-8")
    assert 'font: "Arial"' in rebuilt_source
    assert 'font: "Noto Serif CJK SC"' not in rebuilt_source
    assert rebuilt_source != original_source


def test_same_font_reuses_cached_overlay_source_without_rewriting(tmp_path: Path) -> None:
    path = _resolve(tmp_path, font_family="Arial")
    assert path is not None
    original_source = path.read_bytes()
    original_mtime = path.stat().st_mtime_ns

    with mock.patch.object(
        overlay_source_cache,
        "build_typst_book_overlay_source",
        side_effect=AssertionError("same-font source should be reused"),
    ):
        assert _resolve(tmp_path, font_family="Arial") == path

    assert path.read_bytes() == original_source
    assert path.stat().st_mtime_ns == original_mtime


@pytest.mark.parametrize("include_cover_rect", [False, True])
def test_prebuilt_source_producer_and_consumer_share_font_identity(
    tmp_path: Path, include_cover_rect: bool,
) -> None:
    path = tmp_path / "prewarmed.typ.prebuilt"
    resolved, _ = overlay_source_cache.resolve_prebuilt_overlay_source(
        prebuilt_source_path=path,
        temp_root=tmp_path,
        stem="unused",
        book_specs=BOOK_SPECS,
        font_family="Arial",
        include_cover_rect=include_cover_rect,
    )
    assert resolved == path
    assert overlay_source_cache.prebuilt_source_fingerprint(path) == (
        overlay_source_cache.overlay_source_fingerprint(
            BOOK_SPECS,
            font_family="Arial",
            include_cover_rect=include_cover_rect,
        )
    )
    with mock.patch.object(
        overlay_source_cache,
        "build_typst_book_overlay_source",
        side_effect=AssertionError("prewarmed source should be reused"),
    ):
        reused, _ = overlay_source_cache.resolve_prebuilt_overlay_source(
            prebuilt_source_path=path,
            temp_root=None,
            stem="unused",
            book_specs=BOOK_SPECS,
            font_family="Arial",
            include_cover_rect=include_cover_rect,
        )
    assert reused == path


def test_font_mismatch_without_work_dir_declines_cache_without_overwriting(tmp_path: Path) -> None:
    path = _resolve(tmp_path, font_family="Noto Serif CJK SC")
    assert path is not None
    original_source = path.read_bytes()

    assert _resolve(None, font_family="Arial", prebuilt_source_path=path) is None
    assert path.read_bytes() == original_source


@pytest.mark.parametrize(
    "header",
    [
        "",
        "// overlay_cover_fill_title_color_v13_abstract_bbox\n",
        f"// {overlay_source_cache.PREBUILT_SOURCE_RENDER_VERSION}\n",
        (
            f"// {overlay_source_cache.PREBUILT_SOURCE_RENDER_VERSION}\n"
            f"{overlay_source_cache.SOURCE_FINGERPRINT_PREFIX}\n"
        ),
    ],
)
def test_page_size_only_cache_cannot_bypass_font_validation(tmp_path: Path, header: str) -> None:
    path = tmp_path / "legacy.typ.prebuilt"
    path.write_text(
        header
        + '#set text(font: "Noto Serif CJK SC", size: 10pt)\n'
        + '#set page(width: 200pt, height: 120pt, margin: 0pt, fill: none)\n',
        encoding="utf-8",
    )

    assert not overlay_source_cache.prebuilt_source_matches_page_specs(
        path, BOOK_SPECS, font_family="Arial",
    )
    assert _resolve(tmp_path, font_family="Arial", prebuilt_source_path=path) == path
    assert 'font: "Arial"' in path.read_text(encoding="utf-8")


def test_legacy_fingerprint_without_font_is_not_reused(tmp_path: Path) -> None:
    # Reproduce the previous digest, which had no font input.
    old_version = "overlay_cover_fill_title_color_v13_abstract_bbox"
    old_fingerprint = hashlib.sha256(f"{old_version}\n200.000,120.000\n".encode()).hexdigest()
    path = tmp_path / "legacy.typ.prebuilt"
    path.write_text(
        f"// {old_version}\n"
        f"{overlay_source_cache.SOURCE_FINGERPRINT_PREFIX}{old_fingerprint}\n"
        '#set text(font: "Noto Serif CJK SC", size: 10pt)\n'
        '#set page(width: 200pt, height: 120pt, margin: 0pt, fill: none)\n',
        encoding="utf-8",
    )

    assert not overlay_source_cache.prebuilt_source_matches_page_specs(path, BOOK_SPECS)


def test_fingerprint_uses_effective_font_and_preserves_default_identity() -> None:
    fingerprint = overlay_source_cache.overlay_source_fingerprint
    assert fingerprint(BOOK_SPECS, font_family="Arial") != fingerprint(
        BOOK_SPECS, font_family="Noto Serif CJK SC",
    )
    assert fingerprint(BOOK_SPECS) == fingerprint(
        BOOK_SPECS, font_family=fonts.TYPST_DEFAULT_FONT_FAMILY,
    )
