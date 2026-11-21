import io
import json
from pathlib import Path

import fitz
import pikepdf
import pytest
from PIL import Image


from retainpdf_pipeline.render.tools.merge_translated_pdf import (  # noqa: E402
    MergePlanError,
    PageSource,
    load_plan,
    merge_translated_pdf,
)

A4 = (595, 842)


def _png(seed: int) -> bytes:
    # 噪声图：压不小，去重与否体积差别一目了然。
    import random

    rng = random.Random(seed)
    image = Image.new("RGB", (200, 200))
    image.putdata([(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(200 * 200)])
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


SHARED_IMAGE = _png(1)


def make_pdf(path: Path, texts: list[str], *, size=A4, image: bytes | None = None, toc=False, labels=False, rotate=0):
    doc = fitz.open()
    for text in texts:
        page = doc.new_page(width=size[0], height=size[1])
        page.insert_text((72, 100), text, fontsize=24)
        if image is not None:
            page.insert_image(fitz.Rect(72, 200, 272, 400), stream=image)
        if rotate:
            page.set_rotation(rotate)
    if toc:
        doc.set_toc([[1, f"Chapter {i + 1}", i + 1] for i in range(len(texts))])
    if labels:
        doc.set_page_labels([{"startpage": 0, "prefix": "", "style": "r", "firstpagenum": 1}])
    doc.save(path)
    doc.close()


def add_named_destination(path: Path, name: str, target_index: int, link_from_index: int) -> None:
    """命名目标 + 一个指向它的内部链接：真实书籍（Elsevier、beamer）的内部链接全是这种。"""
    with pikepdf.Pdf.open(path, allow_overwriting_input=True) as pdf:
        target = pdf.pages[target_index].obj
        dests = pikepdf.Array([pikepdf.String(name), pikepdf.Array([target, pikepdf.Name.Fit])])
        pdf.Root.Names = pikepdf.Dictionary(Dests=pdf.make_indirect(pikepdf.Dictionary(Names=dests)))
        link = pdf.make_indirect(
            pikepdf.Dictionary(
                Type=pikepdf.Name.Annot,
                Subtype=pikepdf.Name.Link,
                Rect=[72, 72, 200, 90],
                Dest=pikepdf.String(name),
            )
        )
        pdf.pages[link_from_index].obj.Annots = pikepdf.Array([link])
        pdf.save(path)


def page_texts(path: Path) -> list[str]:
    with fitz.open(path) as doc:
        return [page.get_text().strip() for page in doc]


def plan_of(*entries):
    return [None if entry is None else PageSource(entry[0], entry[1]) for entry in entries]


@pytest.fixture
def book(tmp_path):
    source = tmp_path / "source.pdf"
    make_pdf(source, [f"SRC {i}" for i in range(1, 7)], image=SHARED_IMAGE, toc=True, labels=True)
    add_named_destination(source, "sec.4", target_index=3, link_from_index=0)
    return source


def test_output_is_full_length_and_each_page_comes_from_the_plan(tmp_path, book):
    # 两个范围任务：第 2-3 页、第 5 页。其余是原文。
    first = tmp_path / "first.pdf"
    second = tmp_path / "second.pdf"
    make_pdf(first, ["ZH 2", "ZH 3"], image=SHARED_IMAGE)
    make_pdf(second, ["ZH 5"], image=SHARED_IMAGE)
    out = tmp_path / "merged.pdf"
    merge_translated_pdf(
        book,
        plan_of(None, (first, 0), (first, 1), None, (second, 0), None),
        out,
    )
    assert page_texts(out) == ["SRC 1", "ZH 2", "ZH 3", "SRC 4", "ZH 5", "SRC 6"]


def test_bookmarks_named_destinations_and_page_labels_survive(tmp_path, book):
    # 从空文档开始拼会把这三样全丢掉；移植必须原样保住。
    rendered = tmp_path / "r.pdf"
    make_pdf(rendered, ["ZH 1", "ZH 4"])
    out = tmp_path / "merged.pdf"
    # 被替换的恰好是链接所在页（第 1 页）和链接目标页（第 4 页）。
    merge_translated_pdf(book, plan_of((rendered, 0), None, None, (rendered, 1), None, None), out)

    with fitz.open(out) as doc:
        toc = doc.get_toc()
        assert [entry[2] for entry in toc] == [1, 2, 3, 4, 5, 6], f"书签指向错了: {toc}"
        assert [doc[i].get_label() for i in range(3)] == ["i", "ii", "iii"], "页标签丢了"

    with pikepdf.Pdf.open(out) as pdf:
        names = pdf.Root.Names.Dests.Names
        assert str(names[0]) == "sec.4"
        target = names[1][0]
        page_ids = [page.obj.objgen for page in pdf.pages]
        assert target.objgen in page_ids, "命名目标悬空了"
        assert page_ids.index(target.objgen) == 3, "命名目标不再指向第 4 页"
        annots = pdf.pages[0].obj.get("/Annots")
        assert annots is not None and str(annots[0].Dest) == "sec.4", "被替换页上的内部链接丢了"


def test_untranslated_plan_reproduces_the_source(tmp_path, book):
    out = tmp_path / "merged.pdf"
    merge_translated_pdf(book, [None] * 6, out)
    assert page_texts(out) == page_texts(book)


def test_plan_length_must_equal_source_page_count(tmp_path, book):
    with pytest.raises(MergePlanError, match="plan has 5 pages but source pdf has 6"):
        merge_translated_pdf(book, [None] * 5, tmp_path / "x.pdf")


def test_out_of_range_rendered_index_is_rejected(tmp_path, book):
    rendered = tmp_path / "r.pdf"
    make_pdf(rendered, ["ZH 1"])
    with pytest.raises(MergePlanError, match="index 1 is out of range"):
        merge_translated_pdf(book, plan_of((rendered, 1), None, None, None, None, None), tmp_path / "x.pdf")


def test_page_size_mismatch_fails_closed(tmp_path, book):
    rendered = tmp_path / "letter.pdf"
    make_pdf(rendered, ["ZH 1"], size=(612, 792))
    with pytest.raises(MergePlanError, match="MediaBox differs"):
        merge_translated_pdf(book, plan_of((rendered, 0), None, None, None, None, None), tmp_path / "x.pdf")


def test_rotation_mismatch_fails_closed(tmp_path, book):
    rendered = tmp_path / "rotated.pdf"
    make_pdf(rendered, ["ZH 1"], rotate=90)
    with pytest.raises(MergePlanError, match="Rotate differs"):
        merge_translated_pdf(book, plan_of((rendered, 0), None, None, None, None, None), tmp_path / "x.pdf")


def test_identical_source_images_from_several_jobs_are_stored_once(tmp_path, book):
    # overlay 模式的译文页带着源页原封不动的图片。三个任务各拷一份，不去重就存四份。
    jobs = []
    for i in (2, 4, 6):
        path = tmp_path / f"job{i}.pdf"
        make_pdf(path, [f"ZH {i}"], image=SHARED_IMAGE)
        jobs.append(path)
    out = tmp_path / "merged.pdf"
    merge_translated_pdf(book, plan_of(None, (jobs[0], 0), None, (jobs[1], 0), None, (jobs[2], 0)), out)
    with pikepdf.Pdf.open(out) as pdf:
        images = {
            xobject.objgen
            for page in pdf.pages
            for xobject in page.obj.Resources.get("/XObject", {}).values()
            if xobject.get("/Subtype") == "/Image"
        }
    assert len(images) == 1, f"同一张图存了 {len(images)} 份"


def test_stale_structure_tree_is_dropped(tmp_path, book):
    with pikepdf.Pdf.open(book, allow_overwriting_input=True) as pdf:
        pdf.Root.StructTreeRoot = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.StructTreeRoot))
        pdf.Root.MarkInfo = pikepdf.Dictionary(Marked=True)
        pdf.pages[0].obj.StructParents = 0
        pdf.save(book)
    rendered = tmp_path / "r.pdf"
    make_pdf(rendered, ["ZH 1"])
    out = tmp_path / "merged.pdf"
    merge_translated_pdf(book, plan_of((rendered, 0), None, None, None, None, None), out)
    with pikepdf.Pdf.open(out) as pdf:
        assert "/StructTreeRoot" not in pdf.Root
        assert "/MarkInfo" not in pdf.Root
        assert "/StructParents" not in pdf.pages[0].obj


def test_load_plan_accepts_null_and_rejects_garbage(tmp_path):
    good = tmp_path / "plan.json"
    good.write_text(json.dumps({"pages": [None, {"pdf": "/a.pdf", "index": 2}]}))
    assert load_plan(good) == [None, PageSource(Path("/a.pdf"), 2)]
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"pages": [{"pdf": "/a.pdf"}]}))
    with pytest.raises(MergePlanError, match="plan page 1"):
        load_plan(bad)
