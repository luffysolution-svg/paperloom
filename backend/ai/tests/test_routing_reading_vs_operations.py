"""auto 路由:纯阅读问题不许被当成改文档意图。

原来的正则是「名词 × 动词就近匹配」，窗口 `.{0,20}` / `.{0,30}`，而且动词表里有
`提取` / `extract` —— 这两个在阅读语境里比在改文档语境里常见得多。于是双向都错:

    文档里提取了哪些关键结论？           -> operations   （窗口跨过整个从句）
    extract the key points from the …   -> operations
    这份文档删除线部分是什么意思         -> operations   （`删除` 撞上 `删除线`）
    帮我把第3页删掉                      -> reading      （动词表里没有 `删掉`）
    把最后一页去掉                       -> reading
    去掉这个水印                         -> reading

误判成 operations 的连锁后果不止是走错分支:`content_source=none` 的 409 保护只在
reading 分支生效，误判之后那条保护被整段跳过；工具轮数预算从 reading 的 3 换成 6；
运行时若没开 document_operations 还会直接 409 拒掉一个普通阅读问题。

现在的判据:祈使动词 + **明确的页面指代** + 紧邻。泛指的「文档」「PDF」只对
拆分/合并/加密这类本来就不会出现在阅读问题里的动词生效。
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.request_routing import resolve_assistant_mode  # noqa: E402

READING_QUESTIONS = [
    "文档里提取了哪些关键结论？",
    "帮我总结文档，提取核心观点",
    "extract the key points from the document",
    "Please summarize this pdf and extract the main arguments",
    "这份文档删除线部分是什么意思",
    "论文里提到 delete 操作对 page cache 的影响是什么",
    "这本书的页面设计风格如何，能否提取一下配色",
    "这篇文章讲了什么",
    "第三页讲的是什么内容",
    "文档的结论是什么",
]

OPERATION_REQUESTS = [
    "帮我把第3页删掉",
    "把最后一页去掉",
    "去掉这个水印",
    "把第2页转个方向",
    "旋转第3页",
    "删除第5页",
    "把这个 PDF 拆分",
    "rotate page 3",
    "delete the last page",
    "extract page 2 as a new file",
]


@pytest.mark.parametrize("question", READING_QUESTIONS, ids=lambda s: s[:18])
def test_a_reading_question_stays_in_reading(question: str) -> None:
    decision = resolve_assistant_mode("auto", question)
    assert decision.resolved_mode == "reading", (
        f"被判成 {decision.resolved_mode}（{decision.reason}）"
    )


@pytest.mark.parametrize("question", OPERATION_REQUESTS, ids=lambda s: s[:18])
def test_a_mutation_request_reaches_operations(question: str) -> None:
    decision = resolve_assistant_mode("auto", question)
    assert decision.resolved_mode == "operations", (
        f"被判成 {decision.resolved_mode}（{decision.reason}）"
    )


def test_an_explicit_mode_is_never_rewritten() -> None:
    for mode in ("reading", "operations"):
        decision = resolve_assistant_mode(mode, "帮我把第3页删掉")
        assert decision.resolved_mode == mode
        assert decision.reason == "explicit"


def test_ambiguity_still_fails_safe_to_reading() -> None:
    """判不准就当阅读——阅读没有副作用，改文档有。"""
    decision = resolve_assistant_mode("auto", "这个怎么办")
    assert decision.resolved_mode == "reading"
    assert decision.reason == "safe_reading_default"


def test_operation_control_reads_the_same_in_both_word_orders() -> None:
    """此前只认「动词在前」，同一件事两种结果。"""
    operation_id = "op-abcd1234"
    for question in (f"运行 {operation_id}", f"{operation_id} 执行一下"):
        decision = resolve_assistant_mode("auto", question)
        assert decision.resolved_mode == "operations", f"{question} -> {decision}"
