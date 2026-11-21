from __future__ import annotations

from pathlib import Path

from retainpdf_pipeline.ocr.document_schema.providers import (
    PROVIDER_GENERIC_FLAT_OCR,
    PROVIDER_MINERU,
    PROVIDER_MINERU_CONTENT_LIST_V2,
    PROVIDER_PADDLE,
)

REPO_ROOT = Path(__file__).resolve().parents[6]
DOCUMENT_SCHEMA_FIXTURES_ROOT = REPO_ROOT / "backend" / "pipeline" / "devtools" / "tests" / "document_schema" / "fixtures"
PADDLE_FIXTURES_ROOT = REPO_ROOT / "backend" / "packages" / "retainpdf-data" / "src" / "ocr_provider" / "paddle"
# Paddle 适配器那一族测试共用的三份样本。以前每个 test_paddle_*.py 顶上各抄一遍，
# 有一份还停在改名前的 rust_api/ 路径上没人发现（它只被当作标签传进去，不读文件）。
PADDLE_FIXTURE_JSON = PADDLE_FIXTURES_ROOT / "json_full.json"
PADDLE_SCI_FIXTURE_JSON = PADDLE_FIXTURES_ROOT / "json_sci.json"
PADDLE_FIXTURE_PDF = PADDLE_FIXTURES_ROOT / "paddle_ocr_json_split.pdf"


# Single source of truth for provider fixtures consumed by regression_check.py.
PROVIDER_FIXTURES = [
    {
        "name": "raw_layout",
        "provider": PROVIDER_MINERU,
        "document_id": "regression-raw-layout",
        "path": DOCUMENT_SCHEMA_FIXTURES_ROOT / "mineru_middle_v3.golden.json",
    },
    {
        "name": "content_list_v2",
        "provider": PROVIDER_MINERU_CONTENT_LIST_V2,
        "document_id": "regression-content-v2",
        "path": DOCUMENT_SCHEMA_FIXTURES_ROOT / "mineru_content_list_v2.golden.json",
    },
    {
        "name": "generic_fixture",
        "provider": PROVIDER_GENERIC_FLAT_OCR,
        "document_id": "regression-generic",
        "path": DOCUMENT_SCHEMA_FIXTURES_ROOT / "generic_flat_ocr.minimal.json",
    },
    {
        "name": "paddle_fixture",
        "provider": PROVIDER_PADDLE,
        "document_id": "regression-paddle",
        "path": PADDLE_FIXTURES_ROOT / "json_full.json",
    },
    {
        "name": "paddle_sci_fixture",
        "provider": PROVIDER_PADDLE,
        "document_id": "regression-paddle-sci",
        "path": PADDLE_FIXTURES_ROOT / "json_sci.json",
    },
]


def expected_fixture_providers() -> set[str]:
    return {str(item["provider"]) for item in PROVIDER_FIXTURES}


def fixture_names() -> list[str]:
    return [str(item["name"]) for item in PROVIDER_FIXTURES]
