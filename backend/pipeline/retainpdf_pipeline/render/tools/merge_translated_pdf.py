"""把同一本书的多个范围翻译任务拼成一本整本长度的译文 PDF。

# 为什么是「移植」而不是「拼接」

打开**源 PDF 当底本**，只把要换成译文的那几页的 `/Contents`、`/Resources`、`/Group`
换成渲染页的；页对象本身不动。

从空文档开始拼（`Pdf.new()` + `pages.extend`，或 fitz `insert_pdf`）会丢掉
`/Names`、`/Outlines`、`/PageLabels`。真实书籍的内部链接几乎全是命名目标（Elsevier、
beamer），所以拼出来的内部链接 100% 解析不了、书签和页标签全没了。移植时页数、页序、
页对象身份都和源 PDF 一样，书签、命名目标、链接、页标签指向的还是同一批对象，原样有效。

产物天然是**整本长度**：第 k 页就是文档第 k 页，没翻的页本来就是原文 —— 阅读器对照、
双栏对照、Word 字号回读都按页序号配对，靠的就是这一点。

# 计划从哪来

Rust 侧的 `document_pages::merge_plan` 算好每页取哪个任务的哪一页，写成 JSON 传进来：

    {"pages": [null, {"pdf": "/…/a.pdf", "index": 0}, …]}

长度必须等于源 PDF 页数。这里不做任何「取最新」之类的判断，只照计划执行，并在任何
对不上的地方直接失败 —— 拼错页比不拼更糟。
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import pikepdf
from pikepdf import Dictionary, Name, Pdf, Stream


class MergePlanError(RuntimeError):
    pass


@dataclass(frozen=True)
class PageSource:
    pdf: Path
    index: int


def load_plan(plan_path: Path) -> list[PageSource | None]:
    raw = json.loads(plan_path.read_text(encoding="utf-8"))
    pages = raw.get("pages") if isinstance(raw, dict) else None
    if not isinstance(pages, list):
        raise MergePlanError("plan must be an object with a 'pages' array")
    plan: list[PageSource | None] = []
    for position, entry in enumerate(pages):
        if entry is None:
            plan.append(None)
            continue
        if not isinstance(entry, dict) or not isinstance(entry.get("pdf"), str) or not isinstance(entry.get("index"), int):
            raise MergePlanError(f"plan page {position + 1}: expected null or {{pdf, index}}")
        plan.append(PageSource(Path(entry["pdf"]), entry["index"]))
    return plan


def merge_translated_pdf(source_pdf: Path, plan: list[PageSource | None], output_pdf: Path) -> None:
    with Pdf.open(source_pdf) as base:
        if len(plan) != len(base.pages):
            raise MergePlanError(
                f"plan has {len(plan)} pages but source pdf has {len(base.pages)}; refusing to stitch"
            )
        opened: dict[Path, Pdf] = {}
        try:
            for position, entry in enumerate(plan):
                if entry is None:
                    continue
                rendered = opened.get(entry.pdf)
                if rendered is None:
                    rendered = opened[entry.pdf] = Pdf.open(entry.pdf)
                if not 0 <= entry.index < len(rendered.pages):
                    raise MergePlanError(
                        f"page {position + 1}: {entry.pdf} has {len(rendered.pages)} pages, "
                        f"index {entry.index} is out of range"
                    )
                _transplant(base, position, rendered, entry.index, label=f"page {position + 1} ← {entry.pdf.name}#{entry.index}")
            _drop_stale_structure(base)
            _dedupe_shared_streams(base)
            output_pdf.parent.mkdir(parents=True, exist_ok=True)
            base.save(
                output_pdf,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                compress_streams=True,
                recompress_flate=False,
            )
        finally:
            for pdf in opened.values():
                pdf.close()


# ── 移植 ────────────────────────────────────────────────────────────────────

_GEOMETRY_TOLERANCE_PT = 0.5


def _transplant(base: Pdf, position: int, rendered: Pdf, index: int, *, label: str) -> None:
    target = base.pages[position]
    donor = rendered.pages[index]
    _require_same_geometry(target, donor, label=label)
    if Name.Resources not in donor.obj:
        # 继承自页树的 Resources：真实数据里没出现过，移植时拿不到完整的资源表。
        raise MergePlanError(f"{label}: rendered page inherits /Resources, cannot transplant")
    foreign = base.copy_foreign(donor.obj)
    target.obj[Name.Contents] = foreign[Name.Contents]
    target.obj[Name.Resources] = foreign[Name.Resources]
    if Name.Group in foreign:
        target.obj[Name.Group] = foreign[Name.Group]
    elif Name.Group in target.obj:
        del target.obj[Name.Group]
    # 源页的缩略图是英文的、PieceInfo 是编辑器私有数据，换了内容就都过期了。
    for stale in (Name.Thumb, Name.PieceInfo):
        if stale in target.obj:
            del target.obj[stale]


def _inherited(page: pikepdf.Page, key: Name):
    node = page.obj
    while node is not None:
        if key in node:
            return node[key]
        node = node.get(Name.Parent)
    return None


def _box(page: pikepdf.Page, key: Name) -> list[float] | None:
    value = _inherited(page, key)
    return None if value is None else [float(v) for v in value]


def _require_same_geometry(target: pikepdf.Page, donor: pikepdf.Page, *, label: str) -> None:
    target_media = _box(target, Name.MediaBox)
    donor_media = _box(donor, Name.MediaBox)
    checks = [
        ("MediaBox", target_media, donor_media),
        # 没写 CropBox 就等于 MediaBox。
        ("CropBox", _box(target, Name.CropBox) or target_media, _box(donor, Name.CropBox) or donor_media),
    ]
    for name, left, right in checks:
        if left is None or right is None or len(left) != len(right) or any(
            abs(a - b) > _GEOMETRY_TOLERANCE_PT for a, b in zip(left, right)
        ):
            raise MergePlanError(f"{label}: {name} differs (source {left}, rendered {right})")
    target_rotate = int(_inherited(target, Name.Rotate) or 0) % 360
    donor_rotate = int(_inherited(donor, Name.Rotate) or 0) % 360
    if target_rotate != donor_rotate:
        raise MergePlanError(f"{label}: Rotate differs (source {target_rotate}, rendered {donor_rotate})")


def _drop_stale_structure(base: Pdf) -> None:
    # 结构树的 MCID 指向的是源页的内容流，换过的页对不上了。留着比删掉更糟：
    # 屏幕阅读器会读出错位的标签。
    root = base.Root
    for key in (Name.StructTreeRoot, Name.MarkInfo):
        if key in root:
            del root[key]
    for page in base.pages:
        if Name.StructParents in page.obj:
            del page.obj[Name.StructParents]


# ── 去重 ────────────────────────────────────────────────────────────────────
#
# overlay 模式的译文页里带着源页原封不动的字体和图片。每个参与合并的任务各拷一份进来，
# 体积就涨几倍。按内容哈希把字节相同的字体程序和图片流指到同一个对象上。
# （各任务自己的思源宋体子集字形不同，去不掉 —— 那是每个任务固定多出的 60–240 KB。）

_FONT_FILE_KEYS = (Name.FontFile, Name.FontFile2, Name.FontFile3)


def _dedupe_shared_streams(base: Pdf) -> None:
    canonical: dict[str, Stream] = {}
    keys: dict[tuple[int, int], str] = {}
    visited: set[tuple[int, int]] = set()

    def stream_key(stream: Stream) -> str:
        objgen = stream.objgen
        cached = keys.get(objgen)
        if cached is not None:
            return cached
        # 按解码后的内容比，不按原始字节：源 PDF 和译文页出自不同的写入器，同一张图一边
        # 没压缩、一边 Flate 压过是常事（pikepdf 存盘就会压）。解不开的（DCT 等有损编码）
        # 退回原始字节 + 滤镜一起比。
        try:
            payload, ignored = stream.read_bytes(), {"/Length", "/Filter", "/DecodeParms"}
        except pikepdf.PdfError:
            payload, ignored = stream.read_raw_bytes(), {"/Length"}
        digest = hashlib.sha256(payload)
        digest.update(canon(Dictionary({k: v for k, v in stream.items() if k not in ignored})).encode())
        key = digest.hexdigest()
        if objgen != (0, 0):
            keys[objgen] = key
        return key

    def canon(value) -> str:
        # 按内容、不按对象编号写出一个值。字典里常嵌着别的流（ICC 色彩配置、SMask），
        # 不同任务拷进来的是不同对象、内容相同 —— `repr` 对嵌套流不稳定，必须递归展开。
        if isinstance(value, Stream):
            return f"stream:{stream_key(value)}"
        if isinstance(value, Dictionary):
            return "{" + ",".join(f"{k}:{canon(value[k])}" for k in sorted(value.keys())) + "}"
        if isinstance(value, pikepdf.Array):
            return "[" + ",".join(canon(item) for item in value) + "]"
        return str(value) if isinstance(value, (Name, pikepdf.String)) else repr(value)

    def unify(container, slot) -> None:
        value = container[slot]
        if not isinstance(value, Stream) or not value.is_indirect:
            return
        key = stream_key(value)
        first = canonical.setdefault(key, value)
        if first.objgen != value.objgen:
            container[slot] = first

    def walk_font(font) -> None:
        if not isinstance(font, Dictionary):
            return
        descriptor = font.get(Name.FontDescriptor)
        if isinstance(descriptor, Dictionary):
            for key in _FONT_FILE_KEYS:
                if key in descriptor:
                    unify(descriptor, key)
        for descendant in font.get(Name.DescendantFonts, []):
            walk_font(descendant)

    def walk_resources(resources) -> None:
        if not isinstance(resources, Dictionary):
            return
        if resources.is_indirect:
            if resources.objgen in visited:
                return
            visited.add(resources.objgen)
        fonts = resources.get(Name.Font)
        if isinstance(fonts, Dictionary):
            for name in list(fonts.keys()):
                walk_font(fonts[name])
        xobjects = resources.get(Name.XObject)
        if isinstance(xobjects, Dictionary):
            for name in list(xobjects.keys()):
                xobject = xobjects[name]
                if not isinstance(xobject, Stream):
                    continue
                subtype = xobject.get(Name.Subtype)
                if subtype == Name.Image:
                    unify(xobjects, name)
                elif subtype == Name.Form:
                    walk_resources(xobject.get(Name.Resources))

    for page in base.pages:
        walk_resources(page.obj.get(Name.Resources))


def main() -> None:
    parser = argparse.ArgumentParser(description="Stitch per-range translated PDFs into one full-length PDF.")
    parser.add_argument("--source-pdf", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True, help="JSON: {\"pages\": [null | {pdf, index}, ...]}")
    parser.add_argument("--output-pdf", type=Path, required=True)
    args = parser.parse_args()
    merge_translated_pdf(args.source_pdf, load_plan(args.plan), args.output_pdf)


if __name__ == "__main__":
    main()
