"""术语保护：把术语表里的硬约束条目换成不可翻译的 token。

和公式保护（formula_protection）的关键区别：**这条路在生产里是活的**。
direct_typst 的三条编排路径（batched_plain、single_item_flow、tagged_placeholder）
都经 item_with_runtime_hard_glossary 调用这里；公式保护只服务于 placeholder 模式，
生产从未启用。

两者此前挤在 formula_protection.py 里，名字让人以为术语保护是公式保护的附属，
删模式时很容易一起带走。

保护的是 `level != "preserve"` 之外也需要锁定的条目：preserve 表示"原样保留"，
其余表示"必须译成指定写法"——两种都不能交给模型自由发挥，所以都换成 token，
区别只在还原时填回原文还是填回指定译法。
"""

from __future__ import annotations

from retainpdf_pipeline.translate.core.payload.parts.group_split import INLINE_MATH_SPAN_RE
from retainpdf_pipeline.translate.core.placeholder_tokens import PROTECTED_TOKEN_RE
from retainpdf_pipeline.translate.core.payload.token_protection import ProtectedToken
from retainpdf_pipeline.translate.core.payload.token_protection import Span
from retainpdf_pipeline.translate.core.payload.token_protection import checksum
from retainpdf_pipeline.translate.core.payload.token_protection import next_token_indexes
from retainpdf_pipeline.translate.core.payload.token_protection import overlaps_any
from retainpdf_pipeline.translate.core.payload.token_protection import token_tag
from retainpdf_pipeline.translate.core.terms.glossary import GlossaryEntry
from retainpdf_pipeline.translate.core.terms.glossary import context_matches
from retainpdf_pipeline.translate.core.terms.glossary import glossary_hard_entries
from retainpdf_pipeline.translate.core.terms.glossary import normalize_glossary_entries
from retainpdf_pipeline.translate.core.terms.glossary import term_pattern


def collect_term_spans(text: str, glossary_entries: list[GlossaryEntry] | None) -> list[Span]:
    # 已有的受保护 token 先占位:术语匹配不能切进一个 token 中间。
    selected: list[Span] = [
        Span(match.start(), match.end(), "protected", match.group(0), match.group(0))
        for match in PROTECTED_TOKEN_RE.finditer(text)
    ]
    # 公式内部同样不许匹配。term_pattern 的词边界是 `[A-Za-z0-9_]`,`{`/`}`/`(`/`)`
    # 全都算边界,于是术语 `Si` 会在 `$\mathrm{Si}_2\mathrm{O}$` 里命中:canonical
    # 条目还原时填的是译名,结果是 `$\mathrm{硅}_2\mathrm{O}$`——中文进了公式,
    # 渲染器要么报错要么把中文排进数学。preserve 条目内容虽然不变,中间态却把
    # `<t1-9e7/>` 暴露在 `$...$` 里,正是模型会把尖括号当 `\langle`/`\rangle` 改写
    # 的那个形状。
    selected += [
        Span(match.start(), match.end(), "math", match.group(0), match.group(0))
        for match in INLINE_MATH_SPAN_RE.finditer(text)
    ]
    term_spans: list[Span] = []
    for entry in glossary_hard_entries(normalize_glossary_entries(glossary_entries)):
        pattern = term_pattern(entry)
        for match in pattern.finditer(text):
            start, end = match.span()
            if start == end or overlaps_any((start, end), selected):
                continue
            if not context_matches(text, entry, start=start, end=end):
                continue
            original = match.group(0)
            restore_text = original if entry.level == "preserve" else entry.target
            span = Span(start, end, "term", original, restore_text)
            selected.append(span)
            term_spans.append(span)
    return term_spans


def protect_glossary_terms(
    text: str,
    *,
    glossary_entries: list[GlossaryEntry] | None = None,
    existing_map: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    normalized = normalize_glossary_entries(glossary_entries)
    if not normalized:
        return text, list(existing_map or [])
    term_spans = collect_term_spans(text, normalized)
    if not term_spans:
        return text, list(existing_map or [])
    counters = next_token_indexes(existing_map or [])
    selected = sorted(term_spans, key=lambda span: (span.start, -(span.end - span.start)))
    protected_map = list(existing_map or [])
    chunks: list[str] = []
    cursor = 0
    for span in selected:
        chunks.append(text[cursor:span.start])
        counters["term"] += 1
        value_checksum = checksum(span.original_text, span.token_type)
        tag = token_tag(span.token_type, counters["term"], value_checksum)
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


__all__ = [
    "collect_term_spans",
    "protect_glossary_terms",
]
