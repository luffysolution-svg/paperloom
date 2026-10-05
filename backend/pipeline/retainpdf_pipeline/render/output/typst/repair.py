from __future__ import annotations

import json
import os
import re
from typing import Callable

from retainpdf_pipeline.render.layout.payload.shared import get_render_formula_map
from retainpdf_pipeline.render.layout.payload.shared import get_render_protected_text


TYPST_REPAIR_MODEL_ENV = "TYPST_REPAIR_MODEL"
TYPST_REPAIR_BASE_URL_ENV = "TYPST_REPAIR_BASE_URL"
TYPST_REPAIR_ENABLED_ENV = "TYPST_REPAIR_LLM_ENABLED"
TypstRepairRequestFn = Callable[..., str]
_FENCED_BLOCK_RE = re.compile(r"^\s*```[^\n]*\n(?P<body>.*)\n```\s*$", re.DOTALL)
_PROTECTED_TEXT_BLOCK_RE = re.compile(
    r"<<<PROTECTED_TEXT>>>\s*(?P<content>.*?)\s*<<<END_PROTECTED_TEXT>>>",
    re.DOTALL,
)
_FORMULA_BLOCK_RE = re.compile(
    r"<<<FORMULA\s+placeholder=(?P<placeholder>\[\[FORMULA_\d+]])\s*>>>\s*"
    r"(?P<content>.*?)"
    r"\s*<<<END_FORMULA>>>",
    re.DOTALL,
)


def _typst_repair_enabled() -> bool:
    value = os.environ.get(TYPST_REPAIR_ENABLED_ENV, "1")
    return value.strip().lower() not in {"0", "false", "no", "off"}


def _item_formula_map(item: dict) -> list[dict]:
    formula_map = get_render_formula_map(item)
    normalized: list[dict] = []
    for entry in formula_map:
        placeholder = str(entry.get("placeholder", "") or "").strip()
        formula_text = str(entry.get("formula_text", "") or "").strip()
        if not placeholder:
            continue
        normalized.append({"placeholder": placeholder, "formula_text": formula_text})
    return normalized


def _item_render_text(item: dict) -> str:
    return get_render_protected_text(item)


def _apply_formula_map(item: dict, formula_map: list[dict]) -> dict:
    cloned = dict(item)
    if "render_formula_map" in cloned:
        cloned["render_formula_map"] = formula_map
    if "translation_unit_formula_map" in cloned:
        cloned["translation_unit_formula_map"] = formula_map
    cloned["formula_map"] = formula_map
    return cloned


def _strip_wrapping_fence(text: str) -> str:
    stripped = (text or "").strip()
    match = _FENCED_BLOCK_RE.match(stripped)
    if match:
        return (match.group("body") or "").strip()
    return stripped


def _parse_typst_repair_response(
    content: str,
    *,
    original_protected_text: str,
    formula_map: list[dict],
) -> tuple[str, list[dict]]:
    text = _strip_wrapping_fence(content)
    protected_match = _PROTECTED_TEXT_BLOCK_RE.search(text)
    repaired_text = (
        (protected_match.group("content") or "").strip()
        if protected_match is not None
        else original_protected_text
    )

    repaired_lookup: dict[str, str] = {}
    for match in _FORMULA_BLOCK_RE.finditer(text):
        placeholder = str(match.group("placeholder") or "").strip()
        formula_text = str(match.group("content") or "").strip()
        if placeholder and formula_text:
            repaired_lookup[placeholder] = formula_text

    repaired_formula_map: list[dict] = []
    for entry in formula_map:
        placeholder = str(entry.get("placeholder", "") or "").strip()
        original_formula_text = str(entry.get("formula_text", "") or "").strip()
        repaired_formula_map.append(
            {
                "placeholder": placeholder,
                "formula_text": repaired_lookup.get(placeholder, original_formula_text),
            }
        )

    original_placeholders = [entry["placeholder"] for entry in formula_map if entry.get("placeholder")]
    if any(placeholder not in repaired_text for placeholder in original_placeholders):
        repaired_text = original_protected_text

    return repaired_text, repaired_formula_map


def _resolve_typst_repair_request(
    *,
    api_key: str,
    model: str,
    base_url: str,
) -> tuple[str, str, str] | None:
    if not _typst_repair_enabled():
        return None
    resolved_api_key = (api_key or "").strip()
    resolved_model = (os.environ.get(TYPST_REPAIR_MODEL_ENV, model) or "").strip()
    resolved_base_url = (os.environ.get(TYPST_REPAIR_BASE_URL_ENV, base_url) or "").strip()
    if not (resolved_api_key and resolved_model and resolved_base_url):
        return None
    return resolved_api_key, resolved_model, resolved_base_url


def _repair_item_with_llm_for_typst(
    item: dict,
    *,
    request_label: str,
    api_key: str,
    model: str,
    base_url: str,
    request_chat_content_fn: TypstRepairRequestFn | None,
) -> dict:
    if request_chat_content_fn is None:
        return item
    repair_request = _resolve_typst_repair_request(
        api_key=api_key,
        model=model,
        base_url=base_url,
    )
    if repair_request is None:
        return item
    repair_api_key, repair_model, repair_base_url = repair_request

    protected_text = _item_render_text(item)
    formula_map = _item_formula_map(item)
    if not protected_text and not formula_map:
        return item

    messages = [
        {
            "role": "system",
            "content": (
                "你是 LaTeX 数学语法修复器，处理已翻译的科技文本。\n"
                "渲染器是 mitex，它读 LaTeX——不要把公式改写成 Typst 语法。\n"
                "保持语义不变。\n"
                "除非是修语法必需，否则不要改动中文措辞。\n"
                "不要翻译、概括或解释。\n"
                "每个公式占位符必须原样保留。\n"
                "只修真正坏掉的地方：`$` 不平衡、命令被截断、花括号缺失、上下标脱落。\n"
                "不要替换本来就能渲染的命令。`\\bf`、`\\rm`、`\\it`、`\\pmb`、"
                "`\\hbar`、`\\partial`、`\\otimes`、`\\langle`、`\\rangle`、"
                "`\\mathscr`、`\\varPhi`、`\\left`/`\\right` 都是支持的；换成 Unicode "
                "字符或近似命令只会丢掉字体和尺寸信息，并不会让渲染更容易成功。\n"
                "确实渲染不了的只有 `\\circled{...}` 和 `\\textcircled{...}`，"
                "遇到时输出圈内的字符本身。\n"
                "不要删掉结构性数学命令，例如 `\\frac`、`\\sqrt`、`\\left`、`\\right`、上下标。\n"
                "不要输出 JSON、Markdown、代码块或解释。\n"
                "只返回以下格式的标记块：\n"
                "<<<PROTECTED_TEXT>>>\n"
                "修复后的受保护文本，占位符原样不动\n"
                "<<<END_PROTECTED_TEXT>>>\n"
                "然后返回零个或多个公式块：\n"
                "<<<FORMULA placeholder=[[FORMULA_1]]>>>\n"
                "修复后的公式文本\n"
                "<<<END_FORMULA>>>\n"
                "仅当 formula_text 存在时，每个占位符返回一个公式块。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": "Repair this translated block for Typst rendering while preserving placeholders.",
                    "item_id": item.get("item_id", ""),
                    "protected_text": protected_text,
                    "formula_map": formula_map,
                },
                ensure_ascii=False,
            ),
        },
    ]
    try:
        content = request_chat_content_fn(
            messages,
            api_key=repair_api_key,
            model=repair_model,
            base_url=repair_base_url,
            temperature=0.0,
            response_format=None,
            timeout=60,
            request_label=request_label,
        )
    except Exception as exc:
        print(f"{request_label}: llm repair skipped: {type(exc).__name__}: {exc}", flush=True)
        return item

    repaired_text, repaired_formula_map = _parse_typst_repair_response(
        content,
        original_protected_text=protected_text,
        formula_map=formula_map,
    )

    cloned = _apply_formula_map(item, repaired_formula_map)
    if "render_protected_text" in cloned:
        cloned["render_protected_text"] = repaired_text
    if "translation_unit_protected_translated_text" in cloned:
        cloned["translation_unit_protected_translated_text"] = repaired_text
    if "protected_translated_text" in cloned:
        cloned["protected_translated_text"] = repaired_text
    return cloned


def repair_items_with_llm_for_typst(
    translated_items: list[dict],
    bad_indices: list[int],
    *,
    stem: str,
    api_key: str,
    model: str,
    base_url: str,
    request_chat_content_fn: TypstRepairRequestFn | None = None,
) -> list[dict]:
    patched: list[dict] = []
    bad_index_set = set(bad_indices)
    for index, item in enumerate(translated_items):
        if index not in bad_index_set:
            patched.append(item)
            continue
        patched.append(
            _repair_item_with_llm_for_typst(
                item,
                request_label=f"typst-llm-repair {stem} {item.get('item_id', index)}",
                api_key=api_key,
                model=model,
                base_url=base_url,
                request_chat_content_fn=request_chat_content_fn,
            )
        )
    return patched
