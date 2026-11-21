import json
from pathlib import Path

import pytest


from retainpdf_pipeline.render.tools.merge_translated_artifacts import (  # noqa: E402
    ArtifactPlan,
    JobInputs,
    MergeArtifactsError,
    load_plan,
    merge_translated_artifacts,
)


def item(local_page: int, block: int, *, status="translated", text="", refs=()):
    return {
        "item_id": f"p{local_page:03d}-b{block:03d}",
        "page_idx": local_page - 1,
        "translated_text": text,
        "final_status": status,
        "translation_unit_member_ids": list(refs) or [f"p{local_page:03d}-b{block:03d}"],
        # 流水线读取译文时要求的严格字段（render/source/translation_manifest.py）。
        "block_kind": "text", "layout_role": "paragraph", "semantic_role": "body",
        "structure_role": "body", "policy_translate": True, "asset_id": "", "reading_order": block,
        "raw_block_type": "text", "normalized_sub_type": "body",
    }


def make_job(root: Path, name: str, ocr_pages: list[int], items_by_local_page: dict[int, list[dict]],
             *, images: dict[int, list[str]] | None = None, dead_letters=()) -> JobInputs:
    """一个子集 OCR 任务的产物：页号全是本地的，和流水线真实产出一致。"""
    job = root / name
    translated = job / "translated"
    translated.mkdir(parents=True)
    pages = []
    for local_page, items in items_by_local_page.items():
        path = f"page-{local_page:03d}-deepseek.json"
        (translated / path).write_text(json.dumps(items))
        pages.append({"page_index": local_page - 1, "page_number": local_page, "path": path})
    (translated / "translation-manifest.json").write_text(json.dumps({
        "schema": "translation_manifest_v1", "schema_version": 1, "status": "complete",
        "pages": pages, "status_summary": {"translated": 999}, "review_issue_count": 7,
        "dead_letter_items": list(dead_letters), "dead_letter_count": len(dead_letters),
    }))
    document = {
        "schema": "normalized_document_v1", "document_id": name, "page_count": len(ocr_pages),
        "pages": [
            {"page_index": i, "page": i + 1, "width": 100, "height": 200, "unit": "pt",
             "blocks": [{"block_id": f"p{i + 1:03d}-b0000", "page_index": i, "text": f"{name} ocr {i + 1}"}],
             "metadata": {}}
            for i in range(len(ocr_pages))
        ],
        "assets": {f"page-{p}/{f}": {"uri": f"md/images/page-{p}/{f}"} for p, files in (images or {}).items() for f in files},
        "markers": {"x": 1},
    }
    (job / "ocr/normalized").mkdir(parents=True)
    (job / "ocr/normalized/document.v1.json").write_text(json.dumps(document))
    for local_page, files in (images or {}).items():
        page_dir = job / "md/images" / f"page-{local_page}"
        page_dir.mkdir(parents=True)
        for f in files:
            (page_dir / f).write_text(f"{name}:{f}")
            (job / "md/images" / f).write_text(f"{name}:{f}")
    return JobInputs(translated, job / "ocr/normalized/document.v1.json",
                     job / "md/images" if images else None, tuple(ocr_pages))


def read(out: Path, rel: str):
    return json.loads((out / rel).read_text())


def test_two_jobs_whose_local_page_one_collides_get_distinct_document_ids(tmp_path):
    # 第 1-2 页和第 5-6 页各是一个子集 OCR 任务 —— 两边的第 1 页都叫 p001。
    a = make_job(tmp_path, "a", [1, 2], {1: [item(1, 1, text="A1")], 2: [item(2, 1, text="A2")]})
    b = make_job(tmp_path, "b", [5, 6], {1: [item(1, 1, text="B5")], 2: [item(2, 1, text="B6")]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(6, None, {"a": a, "b": b}, ["a", "a", None, None, "b", "b"]), out)

    manifest = read(out, "translated/translation-manifest.json")
    assert [(p["page_index"], p["path"]) for p in manifest["pages"]] == [
        (0, "page-001.json"), (1, "page-002.json"), (4, "page-005.json"), (5, "page-006.json")]
    page5 = read(out, "translated/page-005.json")
    assert page5[0]["item_id"] == "p005-b001", "任务 b 的本地第 1 页没有改成文档第 5 页"
    assert page5[0]["page_idx"] == 4
    assert page5[0]["translated_text"] == "B5"
    assert read(out, "translated/page-001.json")[0]["item_id"] == "p001-b001"


def test_ocr_document_is_full_length_and_ids_match_the_translations(tmp_path):
    b = make_job(tmp_path, "b", [3, 4], {1: [item(1, 1)]})
    out = tmp_path / "out"
    merge_translated_artifacts(
        ArtifactPlan(4, [(10, 20), (11, 21), (12, 22), (13, 23)], {"b": b}, [None, None, "b", "b"]), out)
    document = read(out, "ocr/normalized/document.v1.json")
    assert document["page_count"] == 4
    assert [p["page_index"] for p in document["pages"]] == [0, 1, 2, 3]
    assert [p["page"] for p in document["pages"]] == [1, 2, 3, 4]
    # 没覆盖的页：空 blocks，尺寸取计划里的源 PDF 页面尺寸。
    assert document["pages"][0]["blocks"] == []
    assert (document["pages"][1]["width"], document["pages"][1]["height"]) == (11, 21)
    # 覆盖的页：OCR 块 id 与译文条目改写到同一个文档页号。
    assert document["pages"][2]["blocks"][0]["block_id"] == "p003-b0000"
    assert document["pages"][2]["blocks"][0]["text"] == "b ocr 1"
    assert read(out, "translated/page-003.json")[0]["item_id"] == "p003-b001"
    assert document["markers"] == {}, "单个任务的 markers 不该带进合并文档"


def test_a_reference_to_a_page_supplied_by_another_job_is_detached_not_redirected(tmp_path):
    # 任务 b 第 2 页（文档第 4 页）的翻译单元引用了它自己的第 1 页（文档第 3 页）。
    # 文档第 3 页在合并里取自更新的任务 c —— 两次 OCR 的块编号不同，
    # 把引用改成 p003-b009 就会悄悄指向 c 的另一段文字。
    b = make_job(tmp_path, "b", [3, 4], {1: [item(1, 9)], 2: [item(2, 1, refs=["p001-b009", "p002-b001"])]})
    c = make_job(tmp_path, "c", [3], {1: [item(1, 1)]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(4, None, {"b": b, "c": c}, [None, None, "c", "b"]), out)
    refs = read(out, "translated/page-004.json")[0]["translation_unit_member_ids"]
    assert refs == ["detached:b:p001-b009", "p004-b001"]


def test_a_reference_within_pages_of_the_same_job_is_rewritten(tmp_path):
    b = make_job(tmp_path, "b", [3, 4], {1: [item(1, 9)], 2: [item(2, 1, refs=["p001-b009"])]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(4, None, {"b": b}, [None, None, "b", "b"]), out)
    assert read(out, "translated/page-004.json")[0]["translation_unit_member_ids"] == ["p003-b009"]


def test_prose_that_happens_to_look_like_an_id_is_left_alone(tmp_path):
    b = make_job(tmp_path, "b", [3], {1: [item(1, 1, text="see p001-b and fig p002-x")]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(3, None, {"b": b}, [None, None, "b"]), out)
    assert read(out, "translated/page-003.json")[0]["translated_text"] == "see p001-b and fig p002-x"


def test_images_and_assets_are_refiled_under_document_page_numbers(tmp_path):
    b = make_job(tmp_path, "b", [7, 8], {1: [item(1, 1)]}, images={1: ["h1.jpg"], 2: ["h2.jpg"]})
    out = tmp_path / "out"
    # 只采用了任务 b 的第 1 页（文档第 7 页）。
    merge_translated_artifacts(ArtifactPlan(8, None, {"b": b}, [None] * 6 + ["b", None]), out)
    assert (out / "md/images/page-7/h1.jpg").read_text() == "b:h1.jpg"
    assert (out / "md/images/h1.jpg").is_file(), "full.md 引用的平铺副本没带过来"
    assert not (out / "md/images/page-1").exists()
    assert not (out / "md/images/h2.jpg").exists(), "没被采用的页的图片不该带过来"
    assets = read(out, "ocr/normalized/document.v1.json")["assets"]
    assert assets == {"page-7/h1.jpg": {"uri": "md/images/page-7/h1.jpg"}}


def test_manifest_statistics_are_recomputed_from_the_pages_actually_used(tmp_path):
    # 各任务自带的统计不能相加：被盖掉的页会重复计数。
    a = make_job(tmp_path, "a", [1, 2], {
        1: [item(1, 1), item(1, 2, status="kept_origin")],
        2: [item(2, 1)]},
        dead_letters=[{"item_id": "p001-b002"}, {"item_id": "p002-b001"}])
    b = make_job(tmp_path, "b", [2], {1: [item(1, 1, status="failed")]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(2, None, {"a": a, "b": b}, ["a", "b"]), out)
    manifest = read(out, "translated/translation-manifest.json")
    assert manifest["status_summary"] == {"translated": 1, "partially_translated": 0, "kept_origin": 1, "failed": 1}
    # 文档第 2 页被 b 盖掉了，a 那页的死信不该留下。
    assert manifest["dead_letter_items"] == [{"item_id": "p001-b002"}]
    assert manifest["dead_letter_count"] == 1
    assert "review_issue_count" not in manifest
    assert manifest["merged_from"] == ["a", "b"]
    assert not (out / "translated/translation-checkpoint.v1.json").exists()


def test_each_document_page_has_at_most_one_translation_file(tmp_path):
    # 下游有的按 glob 读、有的按 manifest 读；多一份文件两边就读出不同结果。
    a = make_job(tmp_path, "a", [1, 2], {1: [item(1, 1)], 2: [item(2, 1)]})
    b = make_job(tmp_path, "b", [1, 2], {1: [item(1, 1)], 2: [item(2, 1)]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(2, None, {"a": a, "b": b}, ["b", "a"]), out)
    files = sorted(p.name for p in (out / "translated").glob("page-*.json"))
    assert files == ["page-001.json", "page-002.json"]


def test_the_merged_directory_is_readable_by_the_render_loader(tmp_path):
    # 合并目录没有 checkpoint —— 下游的标准读取函数必须照样认它。
    from retainpdf_pipeline.render.translation_loader import load_translated_pages

    b = make_job(tmp_path, "b", [3, 4], {1: [item(1, 1)], 2: [item(2, 1)]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(4, None, {"b": b}, [None, None, "b", "b"]), out)
    pages = load_translated_pages(out / "translated")
    assert sorted(pages) == [2, 3]
    assert pages[2][0]["item_id"] == "p003-b001"


def test_a_page_outside_the_job_ocr_coverage_is_rejected(tmp_path):
    b = make_job(tmp_path, "b", [3, 4], {1: [item(1, 1)]})
    with pytest.raises(MergeArtifactsError, match="document page 1 is not in this job's OCR coverage"):
        merge_translated_artifacts(ArtifactPlan(4, None, {"b": b}, ["b", None, None, None]), tmp_path / "out")


def test_a_non_empty_output_directory_is_refused(tmp_path):
    b = make_job(tmp_path, "b", [1], {1: [item(1, 1)]})
    out = tmp_path / "out"
    out.mkdir()
    (out / "stale").write_text("x")
    with pytest.raises(MergeArtifactsError, match="not empty"):
        merge_translated_artifacts(ArtifactPlan(1, None, {"b": b}, ["b"]), out)


def test_load_plan_validates_shape(tmp_path):
    plan = tmp_path / "plan.json"
    plan.write_text(json.dumps({
        "document_page_count": 2,
        "jobs": {"b": {"translations_dir": "/t", "ocr_page_numbers": [2]}},
        "pages": [None, {"job": "b"}],
    }))
    loaded = load_plan(plan)
    assert loaded.pages == [None, "b"] and loaded.jobs["b"].ocr_page_numbers == (2,)
    plan.write_text(json.dumps({"document_page_count": 2, "jobs": {}, "pages": [None, {"job": "ghost"}]}))
    with pytest.raises(MergeArtifactsError, match="unknown job ghost"):
        load_plan(plan)
    plan.write_text(json.dumps({"document_page_count": 3, "jobs": {}, "pages": [None]}))
    with pytest.raises(MergeArtifactsError, match="plan has 1 pages but document_page_count is 3"):
        load_plan(plan)


def test_load_plan_reads_uncovered_page_sizes_from_the_source_pdf(tmp_path):
    import fitz

    source = tmp_path / "source.pdf"
    doc = fitz.open()
    doc.new_page(width=300, height=400)
    doc.new_page(width=500, height=600)
    doc.save(source)
    plan = tmp_path / "plan.json"
    plan.write_text(json.dumps({
        "document_page_count": 2, "source_pdf": str(source),
        "jobs": {"b": {"translations_dir": "/t", "ocr_page_numbers": [2]}},
        "pages": [None, {"job": "b"}],
    }))
    assert load_plan(plan).page_sizes == [(300.0, 400.0), (500.0, 600.0)]


def with_markdown(job: JobInputs, text: str, images: tuple[str, ...] = ()) -> JobInputs:
    md = job.translations_dir.parent / "md"
    (md / "images").mkdir(parents=True, exist_ok=True)
    (md / "full.md").write_text(text)
    for name in images:
        (md / "images" / name).write_text(f"img:{name}")
    return JobInputs(job.translations_dir, job.normalized_document, md / "images", job.ocr_page_numbers)


def test_markdown_comes_from_an_ocr_that_covers_the_whole_book(tmp_path):
    # Markdown 视图是 OCR 原文，和用了哪次翻译无关：有整本的 OCR 就只用它，不重复。
    whole = with_markdown(make_job(tmp_path, "whole", [1, 2, 3], {1: [item(1, 1)]}), "# WHOLE BOOK")
    part = with_markdown(make_job(tmp_path, "part", [3], {1: [item(1, 1)]}), "# PART 3")
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(3, None, {"whole": whole, "part": part}, ["whole", "whole", "part"]), out)
    assert (out / "md/full.md").read_text().strip() == "# WHOLE BOOK"


def test_markdown_of_separate_ocr_ranges_is_joined_in_page_order(tmp_path):
    late = with_markdown(make_job(tmp_path, "late", [5, 6], {1: [item(1, 1)]}), "# PAGES 5-6\n\n![](images/late.jpg)", ("late.jpg",))
    early = with_markdown(make_job(tmp_path, "early", [1, 2], {1: [item(1, 1)]}), "# PAGES 1-2\n\n![](images/early.jpg)", ("early.jpg", "unused.jpg"))
    out = tmp_path / "out"
    plan = ArtifactPlan(6, None, {"late": late, "early": early}, ["early", None, None, None, "late", None])
    merge_translated_artifacts(plan, out)
    text = (out / "md/full.md").read_text()
    assert text.index("# PAGES 1-2") < text.index("# PAGES 5-6"), "没按起始页排"
    assert text.count("# PAGES 1-2") == 1
    assert (out / "md/images/early.jpg").read_text() == "img:early.jpg"
    assert (out / "md/images/late.jpg").is_file()
    assert not (out / "md/images/unused.jpg").exists(), "没被引用的图片不该带过来"


def test_no_markdown_anywhere_writes_no_markdown(tmp_path):
    b = make_job(tmp_path, "b", [1], {1: [item(1, 1)]})
    out = tmp_path / "out"
    merge_translated_artifacts(ArtifactPlan(1, None, {"b": b}, ["b"]), out)
    assert not (out / "md/full.md").exists()
