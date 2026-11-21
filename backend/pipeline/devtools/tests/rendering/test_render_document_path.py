"""渲染读哪份 OCR 归一化文档（document.v1.json）。

以前只按「译文目录的上一级 ocr/normalized/document.v1.json」推算。重新渲染出的新任务把译文复制进自己的目录、
OCR 文档还在原任务里时，推算落到新任务下空的 ocr/：rpr_fit 找不到文档回退 Typst（本机 Typst 太旧就直接失败），
受保护的公式也静默拿到空表。现在 Rust 按任务记录把准确位置写进 render spec 的 inputs.source_json。
"""

from __future__ import annotations

import json
from pathlib import Path

from retainpdf_pipeline.foundation.shared.stage_specs import RenderStageSpec
from retainpdf_pipeline.render.render_inputs import resolve_render_inputs
from retainpdf_pipeline.render.workflow import executor
from retainpdf_pipeline.render.workflow.prepare_stage import document_path_for_render
from retainpdf_pipeline.render.workflow.render_only import _args_from_spec


def _layout(tmp_path: Path) -> tuple[Path, Path, Path]:
    """原任务有 OCR 文档；新任务只有复制过来的译文，ocr/ 是空的。"""
    source_job = tmp_path / "jobs" / "source-job"
    document = source_job / "ocr" / "normalized" / "document.v1.json"
    document.parent.mkdir(parents=True)
    document.write_text("{}", encoding="utf-8")
    pdf = source_job / "source" / "paper.pdf"
    pdf.parent.mkdir(parents=True)
    pdf.write_bytes(b"%PDF-1.4\n")
    new_job = tmp_path / "jobs" / "new-job"
    translated = new_job / "translated"
    translated.mkdir(parents=True)
    (translated / "translation-manifest.json").write_text("{}", encoding="utf-8")
    (new_job / "ocr").mkdir()
    return document, pdf, translated


def _write_spec(tmp_path: Path, pdf: Path, translated: Path, source_json: Path | None) -> Path:
    inputs = {"source_pdf": str(pdf), "translations_dir": str(translated)}
    if source_json is not None:
        inputs["source_json"] = str(source_json)
    spec = {
        "schema_version": "render.stage.v1",
        "stage": "render",
        "job": {"job_id": "new-job", "job_root": str(translated.parent), "workflow": "render"},
        "inputs": inputs,
        "params": {"engine": "rpr_fit"},
    }
    path = tmp_path / "render.spec.json"
    path.write_text(json.dumps(spec), encoding="utf-8")
    return path


def test_the_document_from_the_job_record_is_used(tmp_path):
    document, pdf, translated = _layout(tmp_path)
    spec = RenderStageSpec.load(_write_spec(tmp_path, pdf, translated, document))
    assert spec.inputs.source_json == document.resolve()
    assert Path(_args_from_spec(spec).source_json) == document.resolve()

    inputs = resolve_render_inputs(source_pdf_path=pdf, translations_dir=translated, document_path=spec.inputs.source_json)
    assert executor._document_path_for_render(inputs) == document.resolve()
    # 以前的推算落在新任务的空 ocr/ 下
    assert document_path_for_render(translated) == translated.parent / "ocr" / "normalized" / "document.v1.json"
    assert not document_path_for_render(translated).exists()


def test_an_old_spec_without_source_json_still_derives_the_path(tmp_path):
    _document, pdf, translated = _layout(tmp_path)
    spec = RenderStageSpec.load(_write_spec(tmp_path, pdf, translated, None))
    assert spec.inputs.source_json is None
    assert _args_from_spec(spec).source_json == ""
    inputs = resolve_render_inputs(source_pdf_path=pdf, translations_dir=translated)
    assert executor._document_path_for_render(inputs) == translated.parent / "ocr" / "normalized" / "document.v1.json"


def test_protected_formulas_are_read_from_the_same_document(tmp_path, monkeypatch):
    document, pdf, translated = _layout(tmp_path)
    seen = []
    monkeypatch.setattr(executor, "protected_pages_from_document_path", lambda path: seen.append(path) or {})
    executor._protected_pages_for_render(
        resolve_render_inputs(source_pdf_path=pdf, translations_dir=translated, document_path=document)
    )
    assert seen == [document]
