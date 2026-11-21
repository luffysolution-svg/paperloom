"""翻译包自己的冒烟测试。翻译的行为测试在 pipeline/devtools/tests/translation（离不开 devtools 里的工具）。"""

from __future__ import annotations

import ast
import subprocess
import sys
import tomllib
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "retainpdf_translation"
PYPROJECT = Path(__file__).resolve().parents[1] / "pyproject.toml"


def _imported_modules(path: Path) -> list[str]:
    modules: list[str] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            modules.append(node.module)
    return modules


def test_package_does_not_import_the_pipeline() -> None:
    # 流水线依赖翻译包；翻译包再 import 流水线就成环。共享的东西在 retainpdf_base / retainpdf_math。
    offenders = [
        f"{path.relative_to(PACKAGE_ROOT)}: {module}"
        for path in sorted(PACKAGE_ROOT.rglob("*.py"))
        for module in _imported_modules(path)
        if module == "retainpdf_pipeline" or module.startswith("retainpdf_pipeline.")
    ]
    assert offenders == []


def test_public_facade_imports_without_the_pipeline() -> None:
    # 子进程里把 retainpdf_pipeline 设成不可导入，再按需取几个 public 导出。
    probe = (
        "import sys; sys.modules['retainpdf_pipeline'] = None\n"
        "from retainpdf_translation import public\n"
        "public.TranslationExecutionRequest; public.execute_translation_request; public.GlossaryEntry\n"
        "print('ok')\n"
    )
    result = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "ok"


def test_prompts_ship_as_package_data() -> None:
    from retainpdf_translation.prompt_loader import load_prompt

    prompts = sorted((PACKAGE_ROOT / "prompts").glob("*.txt"))
    assert prompts, "prompts 目录里没有 *.txt"
    for path in prompts:
        assert load_prompt(path.name)
    package_data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["tool"]["setuptools"]["package-data"]
    assert "*.txt" in package_data["retainpdf_translation.prompts"]
