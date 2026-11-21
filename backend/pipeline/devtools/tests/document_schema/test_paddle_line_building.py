from retainpdf_pipeline.ocr.document_schema.provider_adapters.paddle.content_extract import build_lines, build_segments


def test_paddle_build_lines_splits_tall_body_block_into_pseudo_lines() -> None:
    bbox = [53.48, 640.259, 292.39, 699.736]
    text = (
        "Theoretical studies of the effects of substituents on absorption and emission spectra have "
        "been performed, including studies on the indigo molecule and related compounds."
    )

    lines = build_lines(
        bbox=bbox,
        segments=[],
        text=text,
        raw_label="text",
        block_type="text",
        sub_type="body",
    )

    assert len(lines) >= 3
    assert all(len(line.get("bbox", [])) == 4 for line in lines)
    assert all(line["bbox_precision"] == "synthetic_wrap" for line in lines)
    assert all(line["spans"] for line in lines)
    assert "Theoretical studies" in lines[0]["spans"][0]["text"]


def test_paddle_build_lines_marks_explicit_newlines_as_synthetic_geometry() -> None:
    lines = build_lines(
        bbox=[10.0, 20.0, 210.0, 80.0],
        segments=[],
        text="First provider line\nSecond provider line",
        raw_label="text",
        block_type="text",
        sub_type="body",
    )

    assert [line["bbox_precision"] for line in lines] == [
        "synthetic_newline",
        "synthetic_newline",
    ]


def _body_lines(bbox: list[float], text: str) -> list[dict]:
    # 和 block_reader 一样带上整块的 segments：不拆时退回「整块一行」。
    return build_lines(
        bbox=bbox,
        segments=build_segments(text, "text"),
        text=text,
        raw_label="text",
        block_type="text",
        sub_type="body",
    )


def test_paddle_build_lines_splits_a_two_line_paragraph() -> None:
    # 真实的块（量子化学教材第 6 页）：高 24pt，正好两行。以前门槛是 2.2 倍最小行距（24.2pt），
    # 它被当成一行，rpr_fit 按「原文单行、不换行」排，译文缩到 4.8pt。
    bbox = [33.481, 147.93, 397.785, 171.92]
    text = (
        "Since $ \\hat{S}_1 = \\hat{\\sigma} $ and $ \\hat{S}_2 = \\hat{i} $, a molecule with either a plane "
        "or a center of symmetry is optically inactive. However, an $ S_n $ axis of any order rules out "
        "optical activity."
    )

    lines = _body_lines(bbox, text)

    assert len(lines) == 2
    assert [line["bbox_precision"] for line in lines] == ["synthetic_wrap", "synthetic_wrap"]
    assert lines[0]["bbox"][1] == bbox[1] and lines[-1]["bbox"][3] == bbox[3]


def test_paddle_build_lines_keeps_a_tall_single_line_whose_text_fits() -> None:
    # 两行高、但文字一行放得下：多半是字号大的单行，不能拆。
    bbox = [40.0, 100.0, 560.0, 122.0]
    text = "Chapter 12 Symmetry Operations and the Optical Activity of Chiral Molecules in Solution"

    lines = _body_lines(bbox, text)

    assert len(lines) == 1
    assert lines[0].get("bbox_precision") != "synthetic_wrap"


def test_paddle_build_lines_keeps_an_ordinary_single_line() -> None:
    bbox = [33.0, 200.0, 397.0, 213.0]
    text = "A molecule with an improper axis of symmetry is optically inactive because the mirror image matches."

    lines = _body_lines(bbox, text)

    assert len(lines) == 1
    assert lines[0].get("bbox_precision") != "synthetic_wrap"
