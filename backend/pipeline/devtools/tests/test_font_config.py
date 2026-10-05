from retainpdf_pipeline.foundation.config import fonts


def test_default_font_uses_first_existing_bundled_fallback(tmp_path, monkeypatch):
    missing = tmp_path / "custom"
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    expected = bundled / "SourceHanSerifSC-Regular.otf"
    expected.touch()
    monkeypatch.delenv("RETAIN_PDF_FONT_PATH", raising=False)
    monkeypatch.setattr(fonts, "BACKEND_FONTS_DIRS", [missing, bundled])
    assert fonts._default_font_path() == expected


def test_explicit_default_font_is_not_silently_replaced(tmp_path, monkeypatch):
    override = tmp_path / "operator-selected.ttf"
    monkeypatch.setenv("RETAIN_PDF_FONT_PATH", str(override))
    assert fonts._default_font_path() == override
