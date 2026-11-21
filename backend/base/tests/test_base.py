from __future__ import annotations

import ast
from pathlib import Path

import pytest

from retainpdf_base import local_env
from retainpdf_base.credentials import resolve_credential_ref
from retainpdf_base.events import emit_stage_progress
from retainpdf_base.io import load_json
from retainpdf_base.io import save_json_atomic

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "retainpdf_base"


def test_base_only_depends_on_the_standard_library() -> None:
    for path in PACKAGE_ROOT.rglob("*.py"):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            modules = []
            if isinstance(node, ast.Import):
                modules = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                modules = [node.module]
            for module in modules:
                assert not module.startswith("retainpdf_") or module.startswith("retainpdf_base"), (
                    f"{path.name} imports {module}; 底座包不许依赖流水线或翻译"
                )


def test_credential_ref_reads_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RETAIN_BASE_TEST_KEY", " secret ")
    assert resolve_credential_ref("env:RETAIN_BASE_TEST_KEY") == "secret"
    assert resolve_credential_ref("") == ""
    with pytest.raises(RuntimeError):
        resolve_credential_ref("env:")
    with pytest.raises(RuntimeError):
        resolve_credential_ref("vault:x")


def test_default_env_dir_is_the_pipeline_env_dir(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(local_env.PIPELINE_ENV_DIR_ENV, raising=False)
    # 搬进底座包之前就是 backend/pipeline/.env，.gitignore、文档和前端脚本都写的这个位置。
    # 按模块自己的位置算，不按测试文件：worktree 里跑测试时 venv 装的可能是另一个检出的 retainpdf_base。
    backend_root = Path(local_env.__file__).resolve().parents[2]
    assert backend_root.name == "backend" and (backend_root / "pipeline").is_dir()
    assert local_env._env_dir() == backend_root / "pipeline" / ".env"


def test_events_without_active_writer_are_dropped() -> None:
    assert emit_stage_progress(stage="translating", message="x", progress_current=1, progress_total=2) is None


def test_atomic_json_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "a" / "b.json"
    save_json_atomic(path, {"中文": [1, 2]})
    assert load_json(path) == {"中文": [1, 2]}
