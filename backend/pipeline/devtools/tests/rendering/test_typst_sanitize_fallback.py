from pathlib import Path
from unittest import mock


from retainpdf_pipeline.render.output.typst.compiler import TypstCompileError
from retainpdf_pipeline.render.output.typst.sanitize import sanitize_items_for_typst_compile
from retainpdf_pipeline.render.output.typst.overlay_ops import _extract_failed_overlay_indices


def test_sanitize_items_collects_compile_diagnostics() -> None:
    item = {"item_id": "b1", "bbox": [0, 0, 40, 20], "translated_text": "x", "protected_translated_text": "x"}

    def _fake_compile(*args, **kwargs):
        stem = kwargs.get("stem", "")
        if stem.endswith("-plain"):
            return Path("/tmp/plain.pdf")
        raise TypstCompileError(
            phase="overlay_page",
            stem=stem,
            typ_path=Path(f"/tmp/{stem}.typ"),
            pdf_path=Path(f"/tmp/{stem}.pdf"),
            command=["typst", "compile"],
            return_code=1,
            stdout="",
            stderr="bad formula",
            work_dir=Path("/tmp"),
        )

    diagnostics: dict = {}
    with mock.patch("retainpdf_pipeline.render.output.typst.sanitize.compile_typst_overlay_pdf", side_effect=_fake_compile), mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize_steps.compile_typst_overlay_pdf",
        side_effect=_fake_compile,
    ):
        sanitized = sanitize_items_for_typst_compile(
            200.0,
            300.0,
            [item],
            stem="page-000",
            diagnostics=diagnostics,
        )

    assert sanitized[0]["_force_plain_line"] is True
    assert diagnostics["final_mode"] == "selective_plain_text"
    assert diagnostics["bad_item_indices"] == [0]
    assert diagnostics["initial_compile_error"]["phase"] == "overlay_page"
    assert diagnostics["probe_failures"][0]["item_id"] == "b1"


def test_sanitize_items_uses_llm_repair_before_plain_fallback() -> None:
    item = {"item_id": "b1", "bbox": [0, 0, 40, 20], "translated_text": "x", "protected_translated_text": "x"}

    def _fake_compile(*args, **kwargs):
        stem = kwargs.get("stem", "")
        if stem.endswith("-selective-llm"):
            return Path("/tmp/llm.pdf")
        raise TypstCompileError(
            phase="overlay_page",
            stem=stem,
            typ_path=Path(f"/tmp/{stem}.typ"),
            pdf_path=Path(f"/tmp/{stem}.pdf"),
            command=["typst", "compile"],
            return_code=1,
            stdout="",
            stderr="bad formula",
            work_dir=Path("/tmp"),
        )

    with mock.patch("retainpdf_pipeline.render.output.typst.sanitize.compile_typst_overlay_pdf", side_effect=_fake_compile), mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize_steps.compile_typst_overlay_pdf",
        side_effect=_fake_compile,
    ), mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize_steps.repair_items_with_llm_for_typst",
        return_value=[{**item, "protected_translated_text": "llm repaired"}],
    ) as repair_mock:
        diagnostics: dict = {}
        sanitized = sanitize_items_for_typst_compile(
            200.0,
            300.0,
            [item],
            stem="page-000",
            diagnostics=diagnostics,
            request_chat_content_fn=lambda *_args, **_kwargs: "",
        )

    repair_mock.assert_called_once()
    assert sanitized[0]["protected_translated_text"] == "llm repaired"
    assert diagnostics["final_mode"] == "selective_llm_repair"
    assert "selective_plain_text_error" not in diagnostics


def test_sanitize_items_can_disable_llm_repair(monkeypatch) -> None:
    monkeypatch.setenv("RETAIN_RENDER_TYPST_LLM_REPAIR", "0")
    item = {"item_id": "b1", "bbox": [0, 0, 40, 20], "translated_text": "x", "protected_translated_text": "x"}

    def _fake_compile(*args, **kwargs):
        stem = kwargs.get("stem", "")
        if stem.endswith("-plain"):
            return Path("/tmp/plain.pdf")
        raise TypstCompileError(
            phase="overlay_page",
            stem=stem,
            typ_path=Path(f"/tmp/{stem}.typ"),
            pdf_path=Path(f"/tmp/{stem}.pdf"),
            command=["typst", "compile"],
            return_code=1,
            stdout="",
            stderr="bad formula",
            work_dir=Path("/tmp"),
        )

    with mock.patch("retainpdf_pipeline.render.output.typst.sanitize.compile_typst_overlay_pdf", side_effect=_fake_compile), mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize_steps.compile_typst_overlay_pdf",
        side_effect=_fake_compile,
    ), mock.patch("retainpdf_pipeline.render.output.typst.sanitize_steps.repair_items_with_llm_for_typst") as repair_mock:
        diagnostics: dict = {}
        sanitize_items_for_typst_compile(
            200.0,
            300.0,
            [item],
            stem="page-000",
            diagnostics=diagnostics,
            request_chat_content_fn=lambda *_args, **_kwargs: "",
        )

    repair_mock.assert_not_called()
    assert diagnostics["final_mode"] == "selective_plain_text"


def test_sanitize_items_uses_math_token_fallback_for_math_blocks(monkeypatch) -> None:
    monkeypatch.setenv("RETAIN_RENDER_TYPST_LLM_REPAIR", "0")
    item = {
        "item_id": "b1",
        "bbox": [0, 0, 120, 40],
        "protected_translated_text": r"矩阵元 $ \broken{A} $ 导致编译失败。",
    }

    def _fake_compile(*args, **kwargs):
        stem = kwargs.get("stem", "")
        items = args[2]
        if stem.endswith("-math-token-plain"):
            assert items[0].get("_typst_math_token_plain_text") is True
            assert items[0].get("_force_plain_line") is not True
            assert "$" not in items[0]["protected_translated_text"]
            return Path("/tmp/math-token-plain.pdf")
        raise TypstCompileError(
            phase="overlay_page",
            stem=stem,
            typ_path=Path(f"/tmp/{stem}.typ"),
            pdf_path=Path(f"/tmp/{stem}.pdf"),
            command=["typst", "compile"],
            return_code=1,
            stdout="",
            stderr="bad formula",
            work_dir=Path("/tmp"),
        )

    with mock.patch("retainpdf_pipeline.render.output.typst.sanitize.compile_typst_overlay_pdf", side_effect=_fake_compile), mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize_steps.compile_typst_overlay_pdf",
        side_effect=_fake_compile,
    ):
        diagnostics: dict = {}
        sanitized = sanitize_items_for_typst_compile(
            200.0,
            300.0,
            [item],
            stem="page-000",
            diagnostics=diagnostics,
        )

    assert sanitized[0].get("_force_plain_line") is not True
    assert sanitized[0].get("_typst_math_token_plain_text") is True
    assert diagnostics["final_mode"] == "selective_math_token_plain_text"
    assert diagnostics["selective_llm_repair_skipped"] == "disabled_by_env"


def test_extract_failed_overlay_indices_from_typst_error() -> None:
    page_specs = [
        (page_idx, 200.0, 300.0, [{"item_id": f"p{page_idx + 1:03d}-b001"}], f"book-overlay-{page_idx:03d}")
        for page_idx in range(20)
    ]
    exc = TypstCompileError(
        phase="overlay_book",
        stem="book-overlay",
        typ_path=Path("/tmp/book-overlay.typ"),
        pdf_path=Path("/tmp/book-overlay.pdf"),
        command=["typst", "compile"],
        return_code=1,
        stdout="",
        stderr=(
            "error: plugin errored\n"
            "help: error occurred in this call\n"
            "610 │ #let p14_item_0_0_body = block(...)[cmarker.render(p14_item_0_0_md, math: mitex)]\n"
            "typst selective fallback: book-overlay-014 block_indices=[0]"
        ),
    )

    assert _extract_failed_overlay_indices(exc, page_specs) == {14}


def test_sanitize_book_overlay_can_limit_to_candidate_pages() -> None:
    from retainpdf_pipeline.render.output.typst.sanitize import sanitize_page_specs_for_typst_book_overlay

    page_specs = [
        (0, 200.0, 300.0, [{"item_id": "p001-b001", "protected_translated_text": "page 1"}], "book-overlay-000"),
        (1, 200.0, 300.0, [{"item_id": "p002-b001", "protected_translated_text": "page 2"}], "book-overlay-001"),
        (2, 200.0, 300.0, [{"item_id": "p003-b001", "protected_translated_text": "page 3"}], "book-overlay-002"),
    ]

    def _fake_sanitize(_width, _height, items, *, stem, **_kwargs):
        return [{**item, "protected_translated_text": f"sanitized {stem}"} for item in items]

    with mock.patch(
        "retainpdf_pipeline.render.output.typst.sanitize.sanitize_items_for_typst_compile",
        side_effect=_fake_sanitize,
    ) as sanitize_mock:
        sanitized_specs = sanitize_page_specs_for_typst_book_overlay(page_specs, overlay_indices={1})

    assert sanitize_mock.call_count == 1
    assert sanitize_mock.call_args.kwargs["stem"] == "book-overlay-001"
    assert sanitized_specs[0][3][0]["protected_translated_text"] == "page 1"
    assert sanitized_specs[1][3][0]["protected_translated_text"] == "sanitized book-overlay-001"
    assert sanitized_specs[2][3][0]["protected_translated_text"] == "page 3"


def test_cjk_math_command_detector_only_matches_backslash_cjk_in_math() -> None:
    from retainpdf_pipeline.render.layout.payload.formula_cost import item_has_cjk_math_command

    assert item_has_cjk_math_command(
        {"item_id": "bad", "protected_translated_text": "闭包上 $ L $ 和 $ H_*\\二十一 $ 不"}
    ) is True
    assert item_has_cjk_math_command(
        {"item_id": "good", "protected_translated_text": "方向为 $(1,0)$，系数 $\\alpha$"}
    ) is False
    assert item_has_cjk_math_command(
        {"item_id": "plain", "protected_translated_text": "中文没有公式"}
    ) is False


def test_prescreen_cjk_math_items_matches_ladder_plain_text_transform() -> None:
    from retainpdf_pipeline.render.layout.payload.formula_cost import prescreen_cjk_math_items

    bad = {"item_id": "bad", "protected_translated_text": "闭包上 $ L $ 和 $ H_*\\二十一 $ 不"}
    good = {"item_id": "good", "protected_translated_text": "方向为 $(1,0)$"}

    pages, count = prescreen_cjk_math_items({0: [bad, good]})

    assert count == 1
    assert pages[0][1] is good
    assert pages[0][0]["protected_translated_text"] == "闭包上 L 和 H_*\\二十一 不"
    assert "$" not in pages[0][0]["protected_translated_text"]


def test_unicode_math_command_detector_matches_llm_escaped_dash_in_math() -> None:
    from retainpdf_pipeline.render.layout.payload.formula_cost import item_has_unicode_math_command

    assert item_has_unicode_math_command(
        {"item_id": "bad", "protected_translated_text": "范围 $20\\unicode{x2013}30\\ \\mathrm{nm}$ 内"}
    ) is True
    assert item_has_unicode_math_command(
        {"item_id": "good", "protected_translated_text": "系数 $\\alpha$ 和 $(1,0)$"}
    ) is False


def test_prescreen_catches_unicode_math_command() -> None:
    from retainpdf_pipeline.render.layout.payload.formula_cost import prescreen_cjk_math_items

    bad = {"item_id": "bad", "protected_translated_text": "范围 $20\\unicode{x2013}30\\ \\mathrm{nm}$ 内"}
    good = {"item_id": "good", "protected_translated_text": "系数 $\\alpha$"}

    pages, count = prescreen_cjk_math_items({0: [bad, good]})

    assert count == 1
    assert pages[0][1] is good
    assert pages[0][0]["protected_translated_text"] == "范围 20x201330\\nm 内"
    assert "$" not in pages[0][0]["protected_translated_text"]
