from __future__ import annotations

import ast
from importlib.util import resolve_name
from pathlib import Path

from devtools.architecture_checks.common import (
    PACKAGE_ROOT,
    REPO_ROOT,
    imported_modules,
    module_allowed,
    parse_python_file,
    scan_py_files,
)


AI_PACKAGE_ROOT = REPO_ROOT / "backend" / "ai" / "retainpdf_ai"
OPERATIONS_MODULE = "retainpdf_pipeline.document_operations"
PUBLIC_OPERATIONS = frozenset({
    "execute_page_program", "validate_page_program", "validate_page_program_visuals",
})


def _from_module(node: ast.ImportFrom, path: Path) -> str:
    if not node.level:
        return node.module or ""
    package = ".".join(("retainpdf_pipeline", *path.relative_to(PACKAGE_ROOT).parent.parts))
    try:
        return resolve_name("." * node.level + (node.module or ""), package)
    except ImportError:
        # Invalid beyond-root relative imports cannot load this package.
        return ""


def check_document_operation_boundaries(errors: list[str]) -> None:
    """Inspect lazy imports too: execution belongs to Pipeline, not the AI host."""
    operations_root = PACKAGE_ROOT / "document_operations"
    for path in scan_py_files(PACKAGE_ROOT):
        relative = path.relative_to(PACKAGE_ROOT)
        for module in imported_modules(path):
            if module_allowed(module, ("retainpdf_ai",)):
                errors.append(f"{relative}: Pipeline must not import the AI service package ({module})")
        if path.is_relative_to(operations_root):
            continue
        for node in ast.walk(parse_python_file(path)):
            if isinstance(node, ast.Import):
                invalid = any(module_allowed(alias.name, (OPERATIONS_MODULE,)) for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                module = _from_module(node, path)
                targets = [module, *(f"{module}.{alias.name}" for alias in node.names)]
                touches_operations = any(module_allowed(target, (OPERATIONS_MODULE,)) for target in targets)
                invalid = touches_operations and (
                    module != OPERATIONS_MODULE
                    or any(alias.name not in PUBLIC_OPERATIONS for alias in node.names)
                )
            else:
                continue
            if invalid:
                errors.append(f"{relative}: consumers must import explicit document_operations public functions, not implementation modules")
                break
    for path in scan_py_files(AI_PACKAGE_ROOT):
        for module in imported_modules(path):
            if module_allowed(module, ("retainpdf_pipeline",)):
                errors.append(f"ai/{path.relative_to(AI_PACKAGE_ROOT)}: AI must submit operations through the Rust API, not import Pipeline ({module})")
    legacy_root = AI_PACKAGE_ROOT / "document_operations"
    if scan_py_files(legacy_root):
        errors.append("ai/document_operations: PDF execution belongs in retainpdf_pipeline.document_operations; do not keep legacy implementations or shims")


__all__ = ["check_document_operation_boundaries"]
