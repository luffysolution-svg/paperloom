from __future__ import annotations

import argparse
import json
from pathlib import Path

from retainpdf_pipeline.translate.public import DEFAULT_BASE_URL
from retainpdf_pipeline.translate.public import DEFAULT_MODEL
from retainpdf_pipeline.translate.public import get_api_key
from retainpdf_pipeline.translate.public import normalize_base_url
from retainpdf_pipeline.translate.public import request_chat_content
from retainpdf_pipeline.translate.public import extract_json_text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Best-effort AI diagnosis for unknown job failures.")
    parser.add_argument("--input-json", type=str, required=True, help="Path to failure context JSON")
    parser.add_argument("--api-key", type=str, default="", help="Optional model API key")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model name")
    parser.add_argument("--base-url", type=str, default=DEFAULT_BASE_URL, help="OpenAI-compatible API base URL")
    parser.add_argument("--timeout", type=int, default=45, help="Diagnosis request timeout in seconds")
    return parser.parse_args()


def build_messages(payload: dict) -> list[dict[str, str]]:
    system_prompt = (
        "你在诊断一个失败的 PDF OCR / 翻译 / 渲染任务。\n"
        "只依据给出的证据。不要编造日志或臆测隐藏原因。\n"
        "只返回 JSON，键为：summary、root_cause、suggestion、confidence、observed_signals。\n"
        "confidence 必须是 low、medium、high 之一。\n"
        "observed_signals 是一个简短数组，每项是一条凝练的证据字符串。\n"
        "不要推翻已有的失败分类；这只是辅助诊断。"
    )
    user_prompt = json.dumps(payload, ensure_ascii=False)
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def main() -> None:
    args = parse_args()
    payload = json.loads(Path(args.input_json).read_text(encoding="utf-8"))
    model = (args.model or "").strip() or DEFAULT_MODEL
    base_url = (args.base_url or "").strip() or DEFAULT_BASE_URL

    api_key = get_api_key(
        explicit_api_key=args.api_key,
        required=normalize_base_url(base_url) == normalize_base_url(DEFAULT_BASE_URL),
    )
    if not api_key:
        print(json.dumps({"status": "skipped", "reason": "missing_api_key"}, ensure_ascii=False))
        return

    content = request_chat_content(
        build_messages(payload),
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=0.1,
        response_format={"type": "json_object"},
        timeout=args.timeout,
        request_label="failure-ai-diagnosis",
    )
    parsed = json.loads(extract_json_text(content))
    result = {
        "status": "ok",
        "summary": str(parsed.get("summary", "")).strip(),
        "root_cause": str(parsed.get("root_cause", "")).strip(),
        "suggestion": str(parsed.get("suggestion", "")).strip(),
        "confidence": str(parsed.get("confidence", "")).strip().lower(),
        "observed_signals": [str(item).strip() for item in parsed.get("observed_signals", []) if str(item).strip()],
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
