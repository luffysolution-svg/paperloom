"""受保护 token 的通用机制：打标、编号、还原。

这里放的是「把一段文本里的某些跨度换成不可翻译的 token，翻完再换回来」这件事
本身，不关心被保护的是公式还是术语。

为什么单独成文件：公式保护（formula_protection）和术语保护（term_protection）
原本挤在同一个文件里，而那个文件叫 formula_protection.py。结果是术语保护看起来
像公式保护的一部分——公式保护只服务于 placeholder 模式（生产里从未启用），术语
保护则在 direct_typst 的三条编排路径上真实运行。名字撒的这个谎差点让「删掉
placeholder 模式」顺手把术语保护一起删掉。

token 形如 `<t1-4f2/>`：类型前缀 + 序号 + 内容校验和。

校验和目前只起一个作用：让 tag 难以被正文偶然撞上。**全仓没有任何一处重算并比对
它**——这段注释此前声称它用来发现模型把 token 改坏，那是假的。

模型把 `<t1-4f2/>` 写成 `<t1-4f3/>` 确实会被抓到，但抓它的是 quality.py 的
unexpected_placeholder / placeholder_inventory_mismatch，靠的是「译文里出现了原文
没有的 tag」这种集合差，和校验和无关。想让校验和真正生效，要在还原前重算一次比对；
在那之前别把它当成一道防线。
"""

from __future__ import annotations

from dataclasses import asdict
from dataclasses import dataclass
import hashlib
import re


LEGACY_FORMULA_PLACEHOLDER_RE = re.compile(r"\[\[FORMULA_(\d+)]]")
LEGACY_ALIAS_PLACEHOLDER_RE = re.compile(r"@@F\d+@@")
TYPED_TOKEN_RE = re.compile(r"<(?P<prefix>[futnvc])(?P<index>\d+)-(?P<checksum>[0-9a-z]{3})/>")
INLINE_MATH_RE = re.compile(r"\$(?P<body>[^$\n]+)\$")

TOKEN_TYPE_PREFIX = {
    "formula": "f",
    "term": "t",
    "unit": "u",
    "numeric": "n",
    "variable": "v",
    "citation": "c",
}


@dataclass(frozen=True)
class ProtectedToken:
    token_tag: str
    token_type: str
    original_text: str
    restore_text: str
    source_offset: int
    checksum: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True)
class Span:
    start: int
    end: int
    token_type: str
    original_text: str
    restore_text: str


def checksum(value: str, token_type: str) -> str:
    return hashlib.blake2s(f"{token_type}\0{value}".encode("utf-8"), digest_size=2).hexdigest()[:3]


def token_tag(token_type: str, index: int, value_checksum: str) -> str:
    prefix = TOKEN_TYPE_PREFIX[token_type]
    return f"<{prefix}{index}-{value_checksum}/>"


def overlaps_any(span: tuple[int, int], selected: list[Span]) -> bool:
    start, end = span
    return any(start < item.end and item.start < end for item in selected)


def next_token_indexes(existing_map: list[dict]) -> dict[str, int]:
    """接着已有 map 的序号往下编，避免两轮保护产生同名 token。"""
    counters = {token_type: 0 for token_type in TOKEN_TYPE_PREFIX}
    for entry in existing_map or []:
        token_type = str(entry.get("token_type", "") or "")
        tag = str(entry.get("token_tag") or entry.get("placeholder") or "")
        match = TYPED_TOKEN_RE.fullmatch(tag)
        if token_type in counters and match is not None:
            counters[token_type] = max(counters[token_type], int(match.group("index")))
    return counters


def wrap_formula_inline_math(formula_text: str) -> str:
    text = str(formula_text or "").strip()
    if not text:
        return ""
    match = INLINE_MATH_RE.fullmatch(text)
    if match is not None:
        text = match.group("body").strip()
    return f"${text}$"


def restore_protected_tokens(text: str, protected_map: list[dict]) -> str:
    restored = text or ""
    for item in protected_map or []:
        tag = str(item.get("token_tag") or item.get("placeholder") or "")
        restore_text = str(item.get("restore_text") or item.get("formula_text") or item.get("original_text") or "")
        if str(item.get("token_type", "") or "") == "formula":
            restore_text = wrap_formula_inline_math(restore_text)
        if tag:
            restored = restored.replace(tag, restore_text)
    return restored


def restore_tokens_by_type(text: str, protected_map: list[dict], token_types: set[str]) -> str:
    restored = text or ""
    for item in protected_map or []:
        if str(item.get("token_type", "") or "") not in token_types:
            continue
        tag = str(item.get("token_tag") or item.get("placeholder") or "")
        restore_text = str(item.get("restore_text") or item.get("formula_text") or item.get("original_text") or "")
        if tag:
            restored = restored.replace(tag, restore_text)
    return restored


def protect_spans(text: str, spans: list[Span]) -> tuple[str, list[dict]]:
    """把若干跨度换成 token，重叠的按「靠左、更长」优先取舍。

    公式和术语必须共用这一次取舍：各自打各自的会在重叠处互相覆盖。所以取舍放在
    这里，由上层把两边的 span 合并后一次性交进来——这也是 formula 和 term 两个
    模块之所以不必互相依赖的原因。
    """
    ordered = sorted(spans, key=lambda span: (span.start, -(span.end - span.start)))
    selected: list[Span] = []
    for span in ordered:
        if overlaps_any((span.start, span.end), selected):
            continue
        selected.append(span)

    counters: dict[str, int] = {}
    protected_map: list[dict] = []
    chunks: list[str] = []
    cursor = 0
    for span in selected:
        chunks.append(text[cursor:span.start])
        counters[span.token_type] = counters.get(span.token_type, 0) + 1
        value_checksum = checksum(span.original_text, span.token_type)
        tag = token_tag(span.token_type, counters[span.token_type], value_checksum)
        protected_map.append(
            ProtectedToken(
                token_tag=tag,
                token_type=span.token_type,
                original_text=span.original_text,
                restore_text=span.restore_text,
                source_offset=span.start,
                checksum=value_checksum,
            ).to_dict()
        )
        chunks.append(tag)
        cursor = span.end
    chunks.append(text[cursor:])
    return "".join(chunks), protected_map



def protected_map_from_formula_map(formula_map: list[dict]) -> list[dict]:
    protected_map: list[dict] = []
    iterable = [] if isinstance(formula_map, dict) else list(formula_map or [])
    for item in iterable:
        if not isinstance(item, dict):
            continue
        tag = str(item.get("placeholder", "") or "")
        restore_text = str(item.get("formula_text", "") or "")
        token_type = "formula"
        protected_map.append(
            ProtectedToken(
                token_tag=tag,
                token_type=token_type,
                original_text=restore_text,
                restore_text=restore_text,
                source_offset=-1,
                checksum=checksum(restore_text, token_type),
            ).to_dict()
        )
    return protected_map


def formula_map_from_protected_map(protected_map: list[dict]) -> list[dict]:
    formula_map: list[dict] = []
    iterable = [] if isinstance(protected_map, dict) else list(protected_map or [])
    for item in iterable:
        if not isinstance(item, dict):
            continue
        if str(item.get("token_type", "") or "") != "formula":
            continue
        placeholder = str(item.get("token_tag") or item.get("placeholder") or "")
        formula_text = str(item.get("restore_text") or item.get("formula_text") or item.get("original_text") or "")
        if not placeholder or not formula_text:
            continue
        formula_map.append(
            {
                "placeholder": placeholder,
                "token_tag": placeholder,
                "formula_text": formula_text,
            }
        )
    return formula_map


__all__ = [
    "INLINE_MATH_RE",
    "LEGACY_ALIAS_PLACEHOLDER_RE",
    "LEGACY_FORMULA_PLACEHOLDER_RE",
    "ProtectedToken",
    "Span",
    "TOKEN_TYPE_PREFIX",
    "TYPED_TOKEN_RE",
    "checksum",
    "formula_map_from_protected_map",
    "next_token_indexes",
    "overlaps_any",
    "protect_spans",
    "protected_map_from_formula_map",
    "restore_protected_tokens",
    "restore_tokens_by_type",
    "token_tag",
    "wrap_formula_inline_math",
]
