"""本地 OCR 要执行的命令只认服务器配置（审计 A2，2026-10-22）。

Rust 建任务时已经拒绝请求里的 `ocr.options.command` / `raw_provider`，写 stage spec 时也不让请求覆盖；
这里是 Python 这一侧的兜底：stage spec 的 `ocr.options` 里就算带着 `command`，流水线也不拿它执行，
命令只从 `ocr_providers.json` 的默认值和环境变量 `RETAIN_LOCAL_OCR_COMMAND` 来。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from retainpdf_pipeline.foundation.shared.job_dirs import ensure_job_dirs
from retainpdf_pipeline.foundation.shared.job_dirs import resolve_job_dirs
from retainpdf_pipeline.foundation.shared.stage_specs import PROVIDER_STAGE_SCHEMA_VERSION
from retainpdf_pipeline.foundation.shared.stage_specs import ProviderStageSpec
from retainpdf_pipeline.ocr.ocr_provider import drivers
from retainpdf_pipeline.ocr.ocr_provider import provider_pipeline
from retainpdf_pipeline.ocr.ocr_provider.local_command_driver import LOCAL_OCR_COMMAND_ENV
from retainpdf_pipeline.ocr.ocr_provider.local_command_driver import LOCAL_OCR_RAW_PROVIDER_ENV
from retainpdf_pipeline.ocr.ocr_provider_config import OCR_PROVIDER_CONFIG_ENV
from devtools.tests.pdf_fixtures import write_pdf

_RAW_OCR_SCRIPT = """
import json
import os
import sys
from pathlib import Path

target = Path(os.environ["RETAIN_OCR_RAW_PAYLOAD_JSON"])
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({
    "pages": [{
        "width": 320,
        "height": 480,
        "blocks": [{"type": "text", "bbox": [72.0, 60.0, 220.0, 90.0], "text": sys.argv[1]}]
    }]
}, ensure_ascii=False), encoding="utf-8")
""".strip()


def _write_spec(job_root: Path, source_pdf: Path, provider: str, options: dict) -> Path:
    spec_path = job_root / "specs" / "provider.spec.json"
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(
        json.dumps(
            {
                "schema_version": PROVIDER_STAGE_SCHEMA_VERSION,
                "stage": "provider",
                "job": {"job_id": job_root.name, "job_root": str(job_root), "workflow": "ocr"},
                "source": {"file_url": "", "file_path": str(source_pdf)},
                "ocr": {"provider": provider, "credential_ref": "", "options": options},
                "translation": {"credential_ref": "", "glossary_entries": []},
                "render": {},
            }
        ),
        encoding="utf-8",
    )
    return spec_path


def _prepare(tmp_path: Path, name: str) -> tuple[Path, Path, Path, Path]:
    job_root = tmp_path / name
    job_dirs = resolve_job_dirs(job_root)
    ensure_job_dirs(job_dirs)
    source_pdf = job_dirs.source_dir / "book.pdf"
    write_pdf(source_pdf, width=320, height=480, text="server owned command", at=(72, 72))
    script = tmp_path / "ocr.py"
    script.write_text(_RAW_OCR_SCRIPT, encoding="utf-8")
    marker = tmp_path / "pwned"
    evil = tmp_path / "evil.py"
    evil.write_text(f"from pathlib import Path\nPath({str(marker)!r}).write_text('x')\n", encoding="utf-8")
    return job_root, source_pdf, script, evil


def _run(spec_path: Path):
    spec = ProviderStageSpec.load(spec_path)
    args = provider_pipeline._args_from_spec(spec)
    return args, drivers.run_registered_ocr_provider(
        spec.ocr.provider,
        args,
        paddle_driver=lambda _args: (_ for _ in ()).throw(AssertionError("not paddle")),
    )


def test_spec_options_command_is_never_executed(tmp_path: Path, monkeypatch) -> None:
    job_root, source_pdf, script, evil = _prepare(tmp_path, "20261022-server-owned-env")
    monkeypatch.setenv(LOCAL_OCR_COMMAND_ENV, f"{sys.executable} {script} from-env")
    monkeypatch.setenv(LOCAL_OCR_RAW_PROVIDER_ENV, "generic_flat_ocr")
    spec_path = _write_spec(
        job_root,
        source_pdf,
        "local",
        {"command": f"{sys.executable} {evil}", "raw_provider": "attacker_adapter"},
    )

    args, result = _run(spec_path)

    assert not (tmp_path / "pwned").exists(), "stage spec 里的 command 被执行了"
    assert "command" not in args.ocr_provider_options
    assert "raw_provider" not in args.ocr_provider_options
    normalized = json.loads(result.normalized_json_path.read_text(encoding="utf-8"))
    assert normalized["source"]["provider"] == "generic_flat_ocr"
    assert normalized["pages"][0]["blocks"][0]["text"] == "from-env"


def test_local_command_falls_back_to_provider_config_default(tmp_path: Path, monkeypatch) -> None:
    job_root, source_pdf, script, evil = _prepare(tmp_path, "20261022-server-owned-config")
    config_path = tmp_path / "ocr_providers.json"
    config_path.write_text(
        json.dumps(
            {
                "providers": {
                    "local": {
                        "display_name": "Local OCR",
                        "kind": "local_command",
                        "credential": None,
                        "options": {
                            "command": {
                                "type": "string",
                                "env": LOCAL_OCR_COMMAND_ENV,
                                "default": f"{sys.executable} {script} from-config",
                            },
                            "raw_provider": {
                                "type": "string",
                                "env": LOCAL_OCR_RAW_PROVIDER_ENV,
                                "default": "generic_flat_ocr",
                            },
                        },
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv(OCR_PROVIDER_CONFIG_ENV, str(config_path))
    monkeypatch.delenv(LOCAL_OCR_COMMAND_ENV, raising=False)
    monkeypatch.delenv(LOCAL_OCR_RAW_PROVIDER_ENV, raising=False)
    spec_path = _write_spec(job_root, source_pdf, "local", {"command": f"{sys.executable} {evil}"})

    _args, result = _run(spec_path)

    assert not (tmp_path / "pwned").exists(), "stage spec 里的 command 被执行了"
    normalized = json.loads(result.normalized_json_path.read_text(encoding="utf-8"))
    assert normalized["pages"][0]["blocks"][0]["text"] == "from-config"
