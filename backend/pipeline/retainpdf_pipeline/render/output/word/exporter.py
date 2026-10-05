"""保留排版的 Word 导出：算出排版规格，交给 retainpdf2doc 生成文档。

这边只负责**排版**——页面尺寸、每个块的位置、收敛后的字号和基线间距、背景图。文档
本身（OOXML 打包、绝对定位文本框、原生公式）由 `backend/packages/retainpdf2doc` 这个
Node 包生成。

为什么分成两边:公式。这边曾经用 python-docx 自己写 OMML，转换器带一张 **47 条**的
符号表，不在表里的命令直接剥掉反斜杠当字母印出去。实测全仓 1933 个带命令的公式里
**625 个（32.3%）**中招:`\\mathbf{2a}` 显示成 `mathbf2a`（369 次）、`\\chi` 成 `chi`、
`\\left(` 被 `\\le` 匹配成 `≤ft(`。retainpdf2doc 走的是 MathJax → MathML → OMML，
整个 TeX 解析器都在，没有「表里没有」这回事。

排版规格算不动也不该搬到 Node 去（`build_render_page_specs` 那几千行），所以缝就在
「排版规格 → 文档」这里，规格的形状见 retainpdf2doc/src/spec.mjs。
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

from retainpdf_pipeline.render.output.word.backgrounds import render_page_backgrounds
from retainpdf_pipeline.render.output.word.html_fit import fitted_typography
from retainpdf_pipeline.render.output.word.html_fit import MEASURED_FONT_FAMILY
from retainpdf_pipeline.render.output.word.job_io import single_pdf
from retainpdf_pipeline.render.output.word.job_io import translated_pages
from retainpdf_pipeline.render.output.word.typography_readback import converged_typography
from retainpdf_pipeline.render.output.word.typography_readback import open_translated_document
from retainpdf_pipeline.render.output.word.typography_readback import read_page_lines
from retainpdf_pipeline.render.layout.page_specs import build_render_page_specs


SPEC_VERSION = 1
# Word 的默认数学字体。换掉它公式会掉字形，除非目标机器装了替代品。
MATH_FONT_FAMILY = "Cambria Math"

# word/ → output/ → render/ → retainpdf_pipeline/ → pipeline/ → backend/ → 仓库根
_REPO_ROOT = Path(__file__).resolve().parents[6]
_PACKAGE_DIR = _REPO_ROOT / "backend" / "packages" / "retainpdf2doc"
_CLI_ENTRY = _PACKAGE_DIR / "dist" / "cli.mjs"

# 上面那个相对路径只在**仓库检出**里成立。装进桌面应用或 Docker 镜像之后，这个包
# 是从 site-packages 里跑的，往上数六层会数到 python 运行时目录里去，`dist/cli.mjs`
# 当然不存在——v4.2.5 的 Mac 应用就是这么导不出 Word 的。
#
# 所以打包方必须通过这两个环境变量把真实位置告诉我们:
#   RETAINPDF2DOC_CLI  —— dist/cli.mjs 的绝对路径
#   RETAINPDF_NODE_BIN —— node 可执行文件（桌面应用可以指向 Electron 自己，
#                         配合 ELECTRON_RUN_AS_NODE=1）
_CLI_ENV_VAR = "RETAINPDF2DOC_CLI"
_NODE_ENV_VAR = "RETAINPDF_NODE_BIN"


class LayoutDocxToolchainError(RuntimeError):
    """retainpdf2doc 没装好/没构建。单独一个类型，方便上游区分「环境问题」和「数据问题」。"""


def _resolve_node() -> str:
    configured = os.environ.get(_NODE_ENV_VAR, "").strip()
    if configured:
        if not Path(configured).is_file():
            raise LayoutDocxToolchainError(
                f"{_NODE_ENV_VAR} 指向的文件不存在：{configured}",
            )
        return configured
    node = shutil.which("node")
    if not node:
        raise LayoutDocxToolchainError(
            "找不到 node。Word 导出由 retainpdf2doc（Node >= 20）生成。"
            f"打包环境请用 {_NODE_ENV_VAR} 指定 node 可执行文件"
            "（桌面应用可指向 Electron 自身并设 ELECTRON_RUN_AS_NODE=1）。",
        )
    return node


def _resolve_cli() -> Path:
    configured = os.environ.get(_CLI_ENV_VAR, "").strip()
    if configured:
        path = Path(configured)
        if not path.is_file():
            raise LayoutDocxToolchainError(
                f"{_CLI_ENV_VAR} 指向的文件不存在：{configured}",
            )
        return path
    if not _CLI_ENTRY.is_file():
        # 这条信息要能自己说清楚怎么修——排查一个路径问题只能对着
        # "failed to build layout-docx" 猜，那种体验不能再来一次。
        raise LayoutDocxToolchainError(
            f"找不到 retainpdf2doc 的 CLI（试过 {_CLI_ENTRY}）。"
            f"仓库里跑：npm run build --workspace retainpdf2doc；"
            f"打包环境请用 {_CLI_ENV_VAR} 指定 dist/cli.mjs 的位置。",
        )
    return _CLI_ENTRY


def build_layout_spec(
    *,
    job_root: Path,
    dpi: int,
    max_pages: int = 0,
    font_family: str = MEASURED_FONT_FAMILY,
    source_pdf: Path | None = None,
    translated_pdf: Path | None = None,
) -> tuple[dict, Path]:
    """算出排版规格，并把背景图渲染到磁盘。返回 (规格, 规格里相对路径的基准目录)。"""
    # 源 PDF 不一定在 `job_root/source/` 下。translate-only 的任务复用上游 OCR 任务的
    # 产物，它自己的 source/ 是空的。调用方解析好了就直接用。
    source_pdf_path = source_pdf or single_pdf(job_root / "source")
    page_specs = build_render_page_specs(
        source_pdf_path=source_pdf_path, translated_pages=translated_pages(job_root),
    )
    if max_pages > 0:
        page_specs = page_specs[:max_pages]

    rendered_dir = job_root / "rendered" / "docx"
    # 背景图目录带上 DPI：同一个 job 的两次不同清晰度导出可以并发，共用目录的话两边
    # 写的是同一批文件名，先跑的那个会读到后跑的那个覆盖进去的图。
    background_dir = rendered_dir / f"background-pages-{int(dpi)}"
    bg_paths = render_page_backgrounds(source_pdf_path, background_dir, dpi=dpi)

    translated_document = open_translated_document(job_root, translated_pdf)
    pages = []
    try:
        for spec in page_specs:
            rendered_lines = (
                read_page_lines(translated_document, spec.page_index)
                if translated_document is not None else []
            )
            blocks = []
            for block in spec.blocks:
                text = block.plain_text.strip()
                if not text:
                    continue
                # 拿得到译文 PDF 就读回真值（最准）；读不到就走阅读器那套字号收敛。
                # 绝不退回 spec 的上界——实测照上界排有 44.6% 的字符会顶出框外。
                observed = converged_typography(rendered_lines, block.content_rect, len(text))
                if observed:
                    font_size_pt, line_step_pt = observed.font_size_pt, observed.line_step_pt
                if not observed or line_step_pt <= 0:
                    fitted_size, fitted_step = fitted_typography(block)
                    if not observed:
                        font_size_pt = fitted_size
                    line_step_pt = fitted_step
                x0, y0, x1, y1 = block.content_rect
                blocks.append({
                    "id": block.block_id,
                    "rect": [x0, y0, x1, y1],
                    "text": block.content_text,
                    "fontSizePt": round(font_size_pt, 3),
                    "lineStepPt": round(line_step_pt, 3),
                    "bold": str(block.font_weight or "").strip().lower() == "bold",
                    "justify": bool(block.justify_text),
                    "firstLineIndentPt": round(block.first_line_indent_pt or 0.0, 3),
                })
            background = bg_paths[spec.page_index] if spec.page_index < len(bg_paths) else None
            pages.append({
                "pageIndex": spec.page_index,
                "widthPt": spec.page_width_pt,
                "heightPt": spec.page_height_pt,
                "background": (
                    {"path": str(Path(background).relative_to(rendered_dir))}
                    if background else None
                ),
                "blocks": blocks,
            })
    finally:
        if translated_document is not None:
            translated_document.close()

    spec_payload = {
        "version": SPEC_VERSION,
        "job": {"id": job_root.name, "title": source_pdf_path.stem},
        "font": {"family": font_family, "mathFamily": MATH_FONT_FAMILY},
        "pages": pages,
    }
    return spec_payload, rendered_dir


def export_layout_docx(
    *,
    job_root: Path,
    output_path: Path,
    dpi: int,
    max_pages: int = 0,
    font_family: str = MEASURED_FONT_FAMILY,
    source_pdf: Path | None = None,
    translated_pdf: Path | None = None,
) -> Path:
    node = _resolve_node()
    cli = _resolve_cli()
    spec, base_dir = build_layout_spec(
        job_root=job_root,
        dpi=dpi,
        max_pages=max_pages,
        font_family=font_family,
        source_pdf=source_pdf,
        translated_pdf=translated_pdf,
    )
    # 规格落在背景图旁边:规格里的图片路径是相对这个目录的。
    spec_path = base_dir / "layout-spec.json"
    spec_path.write_text(json.dumps(spec, ensure_ascii=False), encoding="utf-8")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    # 桌面应用会把 node 指向 Electron 本体，必须带上这个它才以 Node 模式启动。
    if os.environ.get(_NODE_ENV_VAR, "").strip():
        env.setdefault("ELECTRON_RUN_AS_NODE", "1")
    result = subprocess.run(
        [node, str(cli), str(spec_path), str(output_path)],
        capture_output=True, text=True, timeout=1800, env=env,
    )
    if result.returncode != 0:
        # 把子进程的 stderr 带上。上游只会看到这一条，吞掉它就等于让人对着
        # "failed to build layout-docx" 猜。
        raise RuntimeError(
            f"retainpdf2doc 生成文档失败（退出码 {result.returncode}）：{result.stderr.strip()[-2000:]}",
        )
    if result.stderr.strip():
        # 公式降级之类的警告不影响产出，但要让它可见。
        print(result.stderr.strip())
    return output_path
