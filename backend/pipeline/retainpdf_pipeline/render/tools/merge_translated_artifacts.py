"""把同一本书多个范围任务的译文数据合并成一个「长得和普通任务一样」的目录。

合并 PDF（`merge_translated_pdf.py`）只顶得住看 PDF 的出口。阅读器选区与「看另一栏」、
Word 导出、AI 问答、agent 工作区、全文搜索读的都是**每页译文 JSON + manifest + OCR
规范化文档**。这里把它们合成一份，下游照读普通任务的方式读就行：

    <out>/translated/translation-manifest.json
    <out>/translated/page-NNN.json            每个文档页最多一个文件
    <out>/ocr/normalized/document.v1.json     整本长度，没覆盖的页 blocks 为空
    <out>/md/images/page-N/…                  图片按文档页重新归档
    <out>/md/full.md                          OCR 原文 Markdown（见 `_merged_markdown`）

# 页号改写

流水线从头到尾用**任务本地**页号：`page_idx`、`item_id`（`p003-b002`）、`block_id`、
跨页引用（`continuation_candidate_prev_id`、`translation_unit_member_ids`…）、图片路径
（`page-3/…`）全是本地的。两个任务各自的「第 1 页」都叫 `p001`，合在一起就撞了。

规则只有一条：**任务 J 的 OCR 本地页 L 就是文档第 `ocr_page_numbers[L]` 页**。每一页
整页取自一个任务，这页里所有页号相关的东西都按这个任务的表改写 —— 字符串里的
`pNNN-` 前缀和 `page-N/`，整数字段 `page_idx`、`page_index`、`page`。

因为每页整页来自一个任务、按同一张表改写，OCR 块和译文条目的 id 始终对得上 —— 不同
页来自不同的 OCR 也没关系。跨任务边界的引用（第 5 页的续段指向第 4 页，而第 4 页取自
另一个任务）会悬空；读这些字段的地方本来就要容忍找不到。

不写 checkpoint：下游读到没有 checkpoint 的 manifest 按历史独立 manifest 处理，照样能读。
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import shutil
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


class MergeArtifactsError(RuntimeError):
    pass


@dataclass(frozen=True)
class JobInputs:
    translations_dir: Path
    normalized_document: Path | None
    markdown_images_dir: Path | None
    ocr_page_numbers: tuple[int, ...]

    def local_index_of(self, document_page: int) -> int:
        try:
            return self.ocr_page_numbers.index(document_page)
        except ValueError:
            raise MergeArtifactsError(
                f"{self.translations_dir}: document page {document_page} is not in this job's OCR coverage"
            ) from None

    def global_index(self, local_index: int) -> int | None:
        if 0 <= local_index < len(self.ocr_page_numbers):
            return self.ocr_page_numbers[local_index] - 1
        return None


@dataclass(frozen=True)
class ArtifactPlan:
    document_page_count: int
    page_sizes: list[tuple[float, float]] | None
    jobs: dict[str, JobInputs]
    pages: list[str | None]  # 第 k 个 = 文档第 k+1 页取自哪个任务


def _optional_path(value) -> Path | None:
    return Path(value) if isinstance(value, str) and value else None


def source_page_sizes(source_pdf: Path) -> list[tuple[float, float]]:
    """没被任何任务覆盖的页，OCR 文档里也要有一页（整本长度），尺寸取源 PDF 的可见区域。"""
    import pikepdf

    with pikepdf.Pdf.open(source_pdf) as pdf:
        sizes = []
        for page in pdf.pages:
            x0, y0, x1, y1 = (float(v) for v in page.cropbox)
            sizes.append((abs(x1 - x0), abs(y1 - y0)))
        return sizes


def load_plan(plan_path: Path) -> ArtifactPlan:
    raw = json.loads(plan_path.read_text(encoding="utf-8"))
    try:
        count = int(raw["document_page_count"])
        jobs = {
            job_id: JobInputs(
                translations_dir=Path(spec["translations_dir"]),
                normalized_document=_optional_path(spec.get("normalized_document")),
                markdown_images_dir=_optional_path(spec.get("markdown_images_dir")),
                ocr_page_numbers=tuple(int(n) for n in spec["ocr_page_numbers"]),
            )
            for job_id, spec in raw["jobs"].items()
        }
        pages = [None if entry is None else str(entry["job"]) for entry in raw["pages"]]
        sizes = raw.get("page_sizes")
        if sizes is None and raw.get("source_pdf"):
            sizes = source_page_sizes(Path(raw["source_pdf"]))
        page_sizes = None if sizes is None else [(float(w), float(h)) for w, h in sizes]
    except (KeyError, TypeError, ValueError) as exc:
        raise MergeArtifactsError(f"invalid artifact merge plan: {exc}") from exc
    if len(pages) != count:
        raise MergeArtifactsError(f"plan has {len(pages)} pages but document_page_count is {count}")
    if page_sizes is not None and len(page_sizes) != count:
        raise MergeArtifactsError(f"plan has {len(page_sizes)} page sizes for {count} pages")
    for position, job_id in enumerate(pages):
        if job_id is not None and job_id not in jobs:
            raise MergeArtifactsError(f"plan page {position + 1} references unknown job {job_id}")
    return ArtifactPlan(count, page_sizes, jobs, pages)


# ── 页号改写 ────────────────────────────────────────────────────────────────

# id 只认**字符串开头**的 `pNNN-`：真实数据 17050 处 id 全是整个字符串（前面只有引号），
# 锚定开头就不会误改正文里碰巧长这样的字；悬空标记 `detached:…` 也天然不会被再改一次。
_ITEM_PREFIX = re.compile(r"^p(\d{3,})-(?=[a-z])")
_PAGE_DIR = re.compile(r"(?<![A-Za-z0-9_])page-(\d+)/")
_INDEX_KEYS = frozenset({"page_idx", "page_index"})


class PageRewriter:
    """把一个任务的本地页号改写成文档页号。

    `owns(文档页下标)` 说这一页在合并结果里是不是取自本任务。引用了**别的任务提供的页**
    的 id 不能照改：两次 OCR 的块编号不同，任务 B 第 5 页的翻译单元引用 `p004-b020`，
    而第 4 页取自任务 A —— 改成全局号就会悄悄指向 A 的另一段文字。这种 id 改成
    `detached:<job>:<原 id>`，宁可悬空也不能指错。
    """

    def __init__(self, job: JobInputs, *, job_id: str = "", owns=lambda _index: True) -> None:
        self.job = job
        self.job_id = job_id
        self.owns = owns

    def _item(self, value: str) -> str:
        match = _ITEM_PREFIX.match(value)
        if match is None:
            return value
        digits = match.group(1)
        target = self.job.global_index(int(digits) - 1)
        if target is None or not self.owns(target):
            return f"detached:{self.job_id}:{value}"
        return f"p{target + 1:0{max(3, len(digits))}d}-" + value[match.end():]

    def _dir(self, match: re.Match) -> str:
        target = self.job.global_index(int(match.group(1)) - 1)
        return match.group(0) if target is None else f"page-{target + 1}/"

    def text(self, value: str) -> str:
        return _PAGE_DIR.sub(self._dir, self._item(value))

    def value(self, value, key: str | None = None):
        if isinstance(value, dict):
            return {self.text(k): self.value(v, k) for k, v in value.items()}
        if isinstance(value, list):
            return [self.value(item) for item in value]
        if isinstance(value, str):
            return self.text(value)
        if isinstance(value, int) and not isinstance(value, bool):
            if key in _INDEX_KEYS:
                target = self.job.global_index(value)
                return value if target is None else target
            if key == "page":
                target = self.job.global_index(value - 1)
                return value if target is None else target + 1
        return value


# ── 合并 ────────────────────────────────────────────────────────────────────


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def _manifest_page_paths(job: JobInputs) -> tuple[dict, dict[int, Path]]:
    manifest_path = job.translations_dir / "translation-manifest.json"
    if not manifest_path.is_file():
        raise MergeArtifactsError(f"translation manifest not found: {manifest_path}")
    manifest = _read_json(manifest_path)
    paths: dict[int, Path] = {}
    for entry in manifest.get("pages") or []:
        paths[int(entry["page_index"])] = job.translations_dir / entry["path"]
    return manifest, paths


def merge_translated_artifacts(plan: ArtifactPlan, output_dir: Path) -> None:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise MergeArtifactsError(f"output directory is not empty: {output_dir}")
    rewriters = {
        job_id: PageRewriter(
            job, job_id=job_id, owns=lambda index, job_id=job_id: plan.pages[index] == job_id
        )
        for job_id, job in plan.jobs.items()
    }
    manifests: dict[str, tuple[dict, dict[int, Path]]] = {}
    documents: dict[str, dict | None] = {}
    contributing: list[str] = []

    def manifest_of(job_id: str):
        if job_id not in manifests:
            manifests[job_id] = _manifest_page_paths(plan.jobs[job_id])
        return manifests[job_id]

    def document_of(job_id: str):
        if job_id not in documents:
            path = plan.jobs[job_id].normalized_document
            documents[job_id] = _read_json(path) if path is not None and path.is_file() else None
        return documents[job_id]

    manifest_pages: list[dict] = []
    status_counts: Counter[str] = Counter()
    taken_item_prefixes: dict[str, set[int]] = {}
    document_pages: list[dict] = []
    assets: dict = {}

    for position, job_id in enumerate(plan.pages):
        page_number = position + 1
        doc_page: dict | None = None
        if job_id is not None:
            job = plan.jobs[job_id]
            rewriter = rewriters[job_id]
            local = job.local_index_of(page_number)
            if job_id not in contributing:
                contributing.append(job_id)
            taken_item_prefixes.setdefault(job_id, set()).add(local)

            # 译文
            _, page_paths = manifest_of(job_id)
            translation_path = page_paths.get(local)
            if translation_path is not None:
                if not translation_path.is_file():
                    raise MergeArtifactsError(f"manifest entry points to missing file: {translation_path}")
                items = rewriter.value(_read_json(translation_path))
                name = f"page-{page_number:03d}.json"
                _write_json(output_dir / "translated" / name, items)
                manifest_pages.append({"page_index": position, "page_number": page_number, "path": name})
                status_counts.update(
                    str(item.get("final_status")) for item in items if isinstance(item, dict) and item.get("final_status")
                )

            # OCR 页
            document = document_of(job_id)
            if document is not None:
                source_page = next(
                    (p for p in document.get("pages") or [] if p.get("page_index") == local), None
                )
                if source_page is not None:
                    doc_page = rewriter.value(copy.deepcopy(source_page))
                for key, asset in (document.get("assets") or {}).items():
                    match = _PAGE_DIR.match(key)
                    if match and int(match.group(1)) - 1 == local:
                        assets[rewriter.text(key)] = rewriter.value(asset)

            # 图片
            images = job.markdown_images_dir
            source_dir = images / f"page-{local + 1}" if images is not None else None
            if source_dir is not None and source_dir.is_dir():
                target_images = output_dir / "md" / "images"
                shutil.copytree(source_dir, target_images / f"page-{page_number}")
                # `md/images/` 根下还有一份平铺的同名副本，是给 full.md 引用的（文件名是内容
                # 哈希，不会撞）。页元数据里的 markdown.images 也按平铺名索引。
                for image in source_dir.iterdir():
                    flat = images / image.name
                    if image.is_file() and flat.is_file():
                        shutil.copy2(flat, target_images / image.name)

        if doc_page is None:
            width, height = plan.page_sizes[position] if plan.page_sizes else (0.0, 0.0)
            doc_page = {
                "page_index": position,
                "page": page_number,
                "width": width,
                "height": height,
                "unit": "pt",
                "blocks": [],
                "metadata": {},
            }
        document_pages.append(doc_page)

    if not contributing:
        raise MergeArtifactsError("plan does not take any page from a job; nothing to merge")

    _write_merged_markdown(plan, contributing, output_dir)

    _write_json(output_dir / "translated" / "translation-manifest.json",
                _merged_manifest(contributing, manifests, rewriters, taken_item_prefixes, manifest_pages, status_counts))
    base_document = next((documents[j] for j in contributing if documents.get(j) is not None), None)
    if base_document is not None:
        merged_document = {k: v for k, v in base_document.items() if k not in {"pages", "assets", "markers"}}
        merged_document.update(
            document_id="merged",
            doc_id="merged",
            page_count=plan.document_page_count,
            pages=document_pages,
            assets=assets,
            markers={},
            merged_from=contributing,
        )
        _write_json(output_dir / "ocr" / "normalized" / "document.v1.json", merged_document)


def _is_item_list(value) -> bool:
    return isinstance(value, list) and all(isinstance(item, dict) and "item_id" in item for item in value)


_MARKDOWN_IMAGE = re.compile(r"\]\((?:\./)?images/([^)\s/]+)\)")


def _write_merged_markdown(plan: ArtifactPlan, contributing: list[str], output_dir: Path) -> None:
    """合并书的 `md/full.md`：阅读器 Markdown 视图和 AI 问答读的 **OCR 原文**。

    MinerU 的 `full.md` 没有分页标记，没法按页拆开再拼。好在它是原文，和用了哪次翻译无关，
    所以按 OCR 来源取：

    - 有一次 OCR 覆盖了整本：只用它。
    - 否则按各 OCR 来源的起始页把它们的 `full.md` 依次拼起来，同一份 OCR 只用一次。来源之间
      有重叠时，重叠部分会出现两遍 —— 宁可重复，不能缺页。

    引用到的图片（`images/<内容哈希>.jpg`，平铺）一起复制过来。
    """
    sources: dict[Path, tuple[int, ...]] = {}
    for job_id in contributing:
        job = plan.jobs[job_id]
        if job.markdown_images_dir is None:
            continue
        markdown = job.markdown_images_dir.parent / "full.md"
        if markdown.is_file():
            sources.setdefault(markdown, job.ocr_page_numbers)
    if not sources:
        return
    whole = set(range(1, plan.document_page_count + 1))
    covering = [path for path, pages in sources.items() if whole <= set(pages)]
    chosen = covering[:1] or sorted(sources, key=lambda path: (min(sources[path] or (0,)), str(path)))
    parts = [path.read_text(encoding="utf-8").strip() for path in chosen]
    target = output_dir / "md"
    (target / "images").mkdir(parents=True, exist_ok=True)
    (target / "full.md").write_text("\n\n".join(part for part in parts if part) + "\n", encoding="utf-8")
    for path, text in zip(chosen, parts):
        for name in set(_MARKDOWN_IMAGE.findall(text)):
            image = path.parent / "images" / name
            if image.is_file() and not (target / "images" / name).exists():
                shutil.copy2(image, target / "images" / name)


def _merged_manifest(contributing, manifests, rewriters, taken, pages, status_counts) -> dict:
    newest = manifests[contributing[-1]][0]
    manifest = {
        key: value
        for key, value in newest.items()
        # 这些是单个任务的统计，跨任务没法相加（被盖掉的页会重复计数），不带过来。
        if not key.startswith("review_") and key not in {"slow_items", "route_summary", "error_summary"}
    }
    # 按条目带 item_id 的列表（死信、未解决）：只收真正被采用的那些页，并改写页号。
    #
    # 必须是**新建的**空列表。曾经直接沿用最新任务 manifest 里的列表对象再往里追加，
    # 结果别的任务的条目被追加进去后，轮到这个任务时又被当成它自己的条目、按它的页号表
    # 再改写一遍（a 的 p001-b002 变成了 b 的 p002-b002）。
    item_list_keys = {
        key
        for job_id in contributing
        for key, value in manifests[job_id][0].items()
        if key != "pages" and isinstance(value, list) and value and _is_item_list(value)
    }
    for key in item_list_keys:
        manifest[key] = []
    for job_id in contributing:
        for key in item_list_keys:
            value = manifests[job_id][0].get(key)
            if not isinstance(value, list) or not _is_item_list(value):
                continue
            manifest[key].extend(
                rewriters[job_id].value(item)
                for item in value
                if (match := _ITEM_PREFIX.match(str(item["item_id"])))
                and int(match.group(1)) - 1 in taken[job_id]
            )
    if "dead_letter_items" in manifest:
        manifest["dead_letter_count"] = len(manifest["dead_letter_items"])
    if "unresolved_items" in manifest:
        manifest["unresolved_translation_count"] = len(manifest["unresolved_items"])
    manifest.update(
        status="complete",
        pages=pages,
        status_summary={
            "translated": status_counts.get("translated", 0),
            "partially_translated": status_counts.get("partially_translated", 0),
            "kept_origin": status_counts.get("kept_origin", 0),
            "failed": status_counts.get("failed", 0),
        },
        merged_from=list(contributing),
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge per-range translation artifacts into one job-shaped directory.")
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    merge_translated_artifacts(load_plan(args.plan), args.output_dir)


if __name__ == "__main__":
    main()
