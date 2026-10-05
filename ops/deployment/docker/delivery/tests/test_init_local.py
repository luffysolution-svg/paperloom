from __future__ import annotations

import importlib.util
from pathlib import Path
import re
import stat


SCRIPT = Path(__file__).resolve().parents[1] / "init-local.py"


def _module():
    spec = importlib.util.spec_from_file_location("init_local", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_initialization_creates_private_random_key_without_printing_it(tmp_path, capsys):
    _module().initialize(tmp_path)
    text = (tmp_path / ".env").read_text(encoding="utf-8")
    key = re.search(r"^PAPERLOOM_API_KEY=([0-9a-f]{64})$", text, re.MULTILINE)
    assert key
    assert key.group(1) not in capsys.readouterr().out
    if __import__("os").name != "nt":
        assert stat.S_IMODE((tmp_path / ".env").stat().st_mode) == 0o600


def test_reinitialization_preserves_existing_configuration(tmp_path):
    existing = b"PAPERLOOM_API_KEY=operator-owned-key\nWEB_PORT=45002\n"
    (tmp_path / ".env").write_bytes(existing)
    _module().initialize(tmp_path)
    assert (tmp_path / ".env").read_bytes() == existing


def test_separate_deployments_receive_different_keys(tmp_path):
    first, second = tmp_path / "a", tmp_path / "b"
    first.mkdir()
    second.mkdir()
    _module().initialize(first)
    _module().initialize(second)
    assert (first / ".env").read_bytes() != (second / ".env").read_bytes()
