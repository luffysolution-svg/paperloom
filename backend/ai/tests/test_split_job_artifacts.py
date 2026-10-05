"""文档的内容可以分在两个 job 目录里。

上传之后先跑 OCR、再跑翻译复用它的产物,于是:

    <翻译 job>/  ocr/ 空    md/ 空     translated/ 有译文     ← 这是 active job
    <OCR  job>/  ocr/ ✓    md/ ✓      translated/ 空

而「有没有可问答产物」只看 active job,于是整本书被判成
`AI_DOCUMENT_CONTENT_UNAVAILABLE`,提问直接 409、界面上空空如也。实测复现过。

回退的依据是流水线自己写的 `artifacts/pipeline_summary.json`——里面记着源 PDF 与源
document.v1 的绝对路径,路径里带着来源 job id。**不**用
`GET /api/v1/jobs?document_id=` 反查:实测那个过滤被静默忽略,传一个不存在的
document_id 照样返回全部 42 条。

另一半同样重要:译文仍然要从 active job 读。把 root 整个重定向到 OCR job 的话,
用户用中文提问会拿回一堆英文原文,而且没有任何提示——这种静默降级比 409 更糟。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.config import Settings  # noqa: E402
from retainpdf_ai.tools import build_default_registry  # noqa: E402

DOCUMENT_ID = "doc-split"
TRANSLATE_JOB = "20260918070141-be37aa"
OCR_JOB = "20260918070108-3f4bec"


def _write(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False),
        encoding="utf-8",
    )


@pytest.fixture()
def split_jobs(tmp_path: Path) -> Settings:
    jobs = tmp_path / "jobs"
    ocr_root = jobs / OCR_JOB
    translate_root = jobs / TRANSLATE_JOB

    _write(
        ocr_root / "ocr" / "normalized" / "document.v1.json",
        {
            "schema": "document.v1",
            "document_id": DOCUMENT_ID,
            "page_count": 1,
            "pages": [
                {
                    "page_index": 0,
                    "blocks": [
                        {
                            "block_id": "p001-b0000",
                            "page_index": 0,
                            "order": 0,
                            "type": "text",
                            "text": "Conical intersections govern nonadiabatic dynamics.",
                        }
                    ],
                }
            ],
        },
    )
    _write(ocr_root / "md" / "full.md", "# Title\n\nConical intersections.\n")
    # 翻译 job 只有译文，以及一份指回 OCR job 的溯源记录。
    _write(
        translate_root / "translated" / "page-001-deepseek.json",
        [
            {
                "item_id": "p001-b000",
                "page_idx": 0,
                "block_idx": 0,
                "translated_text": "锥形交叉支配非绝热动力学。",
            }
        ],
    )
    _write(
        translate_root / "artifacts" / "pipeline_summary.json",
        {"source_pdf": str(ocr_root / "source" / "book.pdf")},
    )
    return Settings(data_root=tmp_path)


class _Rust:
    def get_document(self, document_id: str) -> dict:
        return {"document_id": document_id, "active_job_id": TRANSLATE_JOB}

    def get_document_by_job(self, job_id: str) -> dict:
        return {"document_id": DOCUMENT_ID, "active_job_id": job_id}


def test_content_source_follows_provenance_to_the_ocr_job(split_jobs: Settings) -> None:
    registry = build_default_registry(split_jobs, _Rust())
    assert registry.content_source(DOCUMENT_ID, TRANSLATE_JOB) == "structured", (
        "active job 没有产物就判成 none，提问会直接 409"
    )


def test_read_blocks_returns_source_and_translation_from_both_jobs(
    split_jobs: Settings,
) -> None:
    registry = build_default_registry(split_jobs, _Rust())
    result = registry.invoke(
        "read_blocks",
        {"document_id": DOCUMENT_ID, "job_id": TRANSLATE_JOB, "page_idx": 0},
    )

    blocks = result.get("blocks") or []
    assert blocks, f"一个块都没读到：{result}"
    block = blocks[0]
    assert "Conical intersections" in block["source_text"], "原文没有从 OCR job 读到"
    assert "锥形交叉" in block["translated_text"], (
        "译文丢了——root 被整个重定向到 OCR job 了"
    )


@pytest.mark.parametrize("summary_key", ["source_pdf", "source_json_used"])
@pytest.mark.parametrize(
    "source_path",
    [
        rf"C:\Users\Administrator\AppData\Roaming\PaperLoom\data\jobs\{OCR_JOB}\source\文献.pdf",
        rf"\\?\C:\Users\Administrator\AppData\Roaming\PaperLoom\data\jobs\{OCR_JOB}\ocr\normalized\document.v1.json",
        rf"\\server\share\PaperLoom\data\jobs\{OCR_JOB}\source\文献.pdf",
    ],
)
def test_windows_provenance_keeps_recovered_document_readable_and_translated(
    split_jobs: Settings, summary_key: str, source_path: str,
) -> None:
    _write(
        split_jobs.data_root / "jobs" / TRANSLATE_JOB / "artifacts" / "pipeline_summary.json",
        {summary_key: source_path},
    )
    registry = build_default_registry(split_jobs, _Rust())
    assert registry.content_source(DOCUMENT_ID) == "structured"
    result = registry.invoke("read_blocks", {"document_id": DOCUMENT_ID, "page_idx": 0})
    assert result["blocks"][0]["source_text"] == "Conical intersections govern nonadiabatic dynamics."
    assert result["blocks"][0]["translated_text"] == "锥形交叉支配非绝热动力学。"


def test_a_self_contained_job_is_untouched(tmp_path: Path) -> None:
    """老布局里 active job 自带产物，不该走回退。"""
    jobs = tmp_path / "jobs"
    root = jobs / "20260917081455-9c7d3b"
    _write(
        root / "ocr" / "normalized" / "document.v1.json",
        {
            "schema": "document.v1",
            "document_id": DOCUMENT_ID,
            "page_count": 1,
            "pages": [
                {
                    "page_index": 0,
                    "blocks": [
                        {"block_id": "p001-b0000", "page_index": 0, "order": 0, "type": "text", "text": "A"}
                    ],
                }
            ],
        },
    )
    _write(
        root / "translated" / "page-001-deepseek.json",
        [{"item_id": "p001-b000", "page_idx": 0, "block_idx": 0, "translated_text": "甲"}],
    )
    settings = Settings(data_root=tmp_path)

    class _SelfContained(_Rust):
        def get_document(self, document_id: str) -> dict:
            return {"document_id": document_id, "active_job_id": "20260917081455-9c7d3b"}

    registry = build_default_registry(settings, _SelfContained())
    assert registry.content_source(DOCUMENT_ID, "20260917081455-9c7d3b") == "structured"


def test_a_job_with_no_provenance_stays_unavailable(tmp_path: Path) -> None:
    """没有产物也没有溯源记录时，仍然如实报告「没有可问答的数据」。"""
    jobs = tmp_path / "jobs"
    _write(jobs / "20260918999999-empty" / "translated" / "page-001-deepseek.json", [])
    settings = Settings(data_root=tmp_path)

    class _Empty(_Rust):
        def get_document(self, document_id: str) -> dict:
            return {"document_id": document_id, "active_job_id": "20260918999999-empty"}

    registry = build_default_registry(settings, _Empty())
    assert registry.content_source(DOCUMENT_ID, "20260918999999-empty") == "none"
