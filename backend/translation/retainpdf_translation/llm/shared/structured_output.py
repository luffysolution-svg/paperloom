from __future__ import annotations

import json
import re
from typing import Any

from retainpdf_translation.llm.shared.response_parsing import extract_json_text


_TRAILING_COMMA_RE = re.compile(r",(\s*[}\]])")
_FENCED_JSON_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_UNQUOTED_KEY_RE = re.compile(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)(\s*:)')
_LINE_VALUE_RE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_\-]*)\s*:\s*(.+?)\s*$")
_UNICODE_ESCAPE_HEX_RE = re.compile(r"[0-9a-fA-F]{4}")
_SHORT_JSON_ESCAPES = frozenset("bfnrt")


def escape_latex_backslashes(text: str) -> str:
    r"""把模型漏转义的 LaTeX 反斜杠补成 ``\\``，再交给 ``json.loads``。

    模型常在 JSON 字符串里直接写 ``$\beta$``、``$\rho$``。JSON 合法转义只有
    ``\" \\ \/ \b \f \n \r \t \uXXXX``，而 ``\beta`` ``\frac`` ``\nu`` ``\rho``
    ``\theta`` 恰好以 ``\b \f \n \r \t`` 开头，会被静默解成退格 / 换页 / 换行 /
    回车 / 制表符；``\alpha`` 之类则直接让解析失败。判断规则（从左到右逐个反斜杠，
    已成对的 ``\\`` 整体跳过，不会被二次处理）：

    - ``\"`` ``\\`` ``\/``：合法转义，原样保留；
    - ``\u`` 后跟 4 位十六进制：合法 unicode 转义，原样保留；
    - ``\b \f \n \r \t`` 后面**不是**小写 ASCII 字母：当作真转义保留
      （``\n- 条目``、``\nNote``、``\t1`` 仍是换行 / 制表）；
    - ``\b \f \n \r \t`` 后面紧跟小写字母：当作 LaTeX 命令（``\beta`` ``\frac``
      ``\nu`` ``\rho`` ``\theta``），补成字面反斜杠；
    - 其余（``\alpha`` ``\{`` ``\,`` ``\underline`` 等非法转义）：补成字面反斜杠。

    已知代价：换行 / 制表后直接接小写英文单词（如 ``"\nthe"``）会被当成 LaTeX，
    得到字面 ``\nthe`` 而不是换行 —— 对以中文为主的领域指引可以接受。
    """
    if "\\" not in text:
        return text
    out: list[str] = []
    index = 0
    length = len(text)
    while index < length:
        char = text[index]
        if char != "\\":
            out.append(char)
            index += 1
            continue
        nxt = text[index + 1] if index + 1 < length else ""
        if nxt in {'"', "\\", "/"}:
            out.append(text[index : index + 2])
            index += 2
            continue
        if nxt == "u" and _UNICODE_ESCAPE_HEX_RE.fullmatch(text[index + 2 : index + 6]):
            out.append(text[index : index + 6])
            index += 6
            continue
        if nxt and nxt in _SHORT_JSON_ESCAPES:
            after = text[index + 2] if index + 2 < length else ""
            if not ("a" <= after <= "z"):
                out.append(text[index : index + 2])
                index += 2
                continue
        out.append("\\\\")
        index += 1
    return "".join(out)


def parse_structured_json(content: str) -> dict[str, Any]:
    try:
        payload = json.loads(escape_latex_backslashes(extract_json_text(content)))
    except Exception:
        try:
            repaired = _repair_json_text(content)
            payload = json.loads(repaired)
        except Exception:
            payload = _parse_key_value_lines(content)
    if not isinstance(payload, dict):
        raise ValueError("Structured response is not a JSON object.")
    return payload


def extract_string_fields(content: str, aliases_by_field: dict[str, tuple[str, ...] | list[str]]) -> dict[str, str]:
    text = _strip_code_fences(content)
    result: dict[str, str] = {}
    for field_name, aliases in aliases_by_field.items():
        for alias in aliases:
            value = _extract_string_field(text, alias)
            if value:
                result[field_name] = value
                break
    return result


def _repair_json_text(content: str) -> str:
    text = _strip_code_fences(content)
    try:
        text = extract_json_text(text)
    except Exception:
        text = _slice_outer_json_object(text)
    text = escape_latex_backslashes(text)
    text = _CONTROL_CHAR_RE.sub("", text)
    text = _UNQUOTED_KEY_RE.sub(r'\1"\2"\3', text)
    repaired = _TRAILING_COMMA_RE.sub(r"\1", text)
    return repaired


def _strip_code_fences(content: str) -> str:
    return _FENCED_JSON_RE.sub("", (content or "").strip()).strip()


def _slice_outer_json_object(content: str) -> str:
    text = (content or "").strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Structured response does not contain a JSON object.")
    return text[start : end + 1]


def _parse_key_value_lines(content: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for raw_line in _strip_code_fences(content).splitlines():
        match = _LINE_VALUE_RE.match(raw_line)
        if not match:
            continue
        key = str(match.group(1) or "").strip()
        value = str(match.group(2) or "").strip().strip('",')
        if key:
            result[key] = value
    if not result:
        raise ValueError("Structured response could not be repaired.")
    return result


def _extract_string_field(content: str, key: str) -> str:
    escaped_key = re.escape(key)
    patterns = (
        re.compile(rf'["\']{escaped_key}["\']\s*:\s*"((?:\\.|[^"\\])*)"', re.DOTALL),
        re.compile(rf'["\']{escaped_key}["\']\s*:\s*\'((?:\\.|[^\'\\])*)\'', re.DOTALL),
        re.compile(rf'^\s*{escaped_key}\s*:\s*(.+?)\s*$', re.IGNORECASE | re.MULTILINE),
        re.compile(rf'^\s*["\']{escaped_key}["\']\s*:\s*(.+?)\s*$', re.IGNORECASE | re.MULTILINE),
    )
    for idx, pattern in enumerate(patterns):
        match = pattern.search(content)
        if not match:
            continue
        value = str(match.group(1) or "").strip()
        if not value:
            continue
        if idx == 0:
            try:
                return json.loads(f'"{escape_latex_backslashes(value)}"').strip()
            except Exception:
                return value.strip()
        if idx == 1:
            return _decode_single_quoted_string(value).strip()
        cleaned = value.strip().strip('",\'')
        if cleaned:
            return cleaned
    return ""


def _decode_single_quoted_string(value: str) -> str:
    escaped = value.replace("\\'", "'").replace("\\\\", "\\")
    return escaped
