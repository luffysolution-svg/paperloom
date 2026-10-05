"""流给浏览器的文本必须就是最终答案。

前端只能追加，不能替换（AI SDK 6 没有 reset-step），所以
`retainpdf-chat-transport.ts` 用的判据是「最终答案是不是已流文本的前缀」——是就补
后缀，不是就**整份丢弃**，页面上留下未清洗的原文。

而最终答案是清洗过的:`[p002-b0004]` 变成 `[1]`、多空格被压掉。任何一条触发，前缀
关系就断了，判据必然落到「丢弃」那一侧。实测表现:用户看到内部 block id 裸露、行内
引用按钮一个都生成不出来、脚注退化成「按页去重取前 3 条」和正文毫无关系，连
`persisted:false` 的「本轮回答未写入历史」警告也一起没了。

这里钉的是修复之后的契约:流出去的增量拼起来，逐字等于 AskResult.answer。
"""

from __future__ import annotations

import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.agent_evidence import StreamingAnswerSanitizer  # noqa: E402
from retainpdf_ai.agent_llm import assemble_streaming_message  # noqa: E402
from retainpdf_ai.retrieval_agent import RetrievalAgent  # noqa: E402
from retainpdf_ai.tools import Tool, ToolRegistry  # noqa: E402

HITS = [
    {
        "document_id": "doc-a",
        "job_id": "job-1",
        "page_idx": 1,
        "block_id": "p002-b0004",
        "translated_snippet": "反应速率显著提高",
    }
]

# 模型原文里带内部 block id 和多余空格——两者都会让清洗重写文本。
RAW_ANSWER = "根据检索结果  [p002-b0004]  ，反应速率显著提高。"


def _registry() -> ToolRegistry:
    return ToolRegistry(
        [
            Tool(
                name="search_fulltext",
                description="搜索",
                parameters={"type": "object", "properties": {}},
                handler=lambda _arguments: {"hits": HITS, "structured_data_available": True},
            )
        ]
    )


def _chat_factory(streamed: list[str]):
    """两轮:先检索，再作答。作答那轮逐字符流出去。"""
    rounds = [
        {
            "content": "",
            "tool_calls": [
                {"id": "c1", "function": {"name": "search_fulltext", "arguments": "{}"}}
            ],
        },
        {"content": RAW_ANSWER, "tool_calls": []},
    ]
    state = {"index": 0}

    def chat(messages, tools, *, stream_answer: bool = True, delta_sanitizer=None):
        message = rounds[min(state["index"], len(rounds) - 1)]
        state["index"] += 1
        if stream_answer and message["content"]:
            sanitizer = delta_sanitizer or StreamingAnswerSanitizer({})
            for character in message["content"]:
                piece = sanitizer.feed(character)
                if piece:
                    streamed.append(piece)
            tail = sanitizer.flush()
            if tail:
                streamed.append(tail)
        return message

    return chat


def test_streamed_text_equals_the_final_answer() -> None:
    streamed: list[str] = []
    agent = RetrievalAgent(_registry(), _chat_factory(streamed), max_tool_rounds=3)
    result = agent.ask("反应速率如何？", document_id="doc-a", job_id="job-1")

    assert result.answer, "没有拿到答案"
    assert "".join(streamed) == result.answer, (
        f"流出去的和最终答案不一致：\n流式 {''.join(streamed)!r}\n最终 {result.answer!r}"
    )


def test_the_streamed_text_is_already_cleaned() -> None:
    """钉住「清洗确实发生了」——否则上一条可能因为两边都没清洗而通过。"""
    streamed: list[str] = []
    agent = RetrievalAgent(_registry(), _chat_factory(streamed), max_tool_rounds=3)
    agent.ask("反应速率如何？", document_id="doc-a", job_id="job-1")

    text = "".join(streamed)
    assert "p002-b0004" not in text, f"内部 block id 流给了浏览器：{text!r}"
    assert "[1]" in text, f"引用编号没有生成：{text!r}"
    assert "  " not in text, f"多余空格没有压掉：{text!r}"


def test_a_round_with_tool_calls_does_not_flush_its_preamble() -> None:
    """调了工具的那一轮不该 flush 它的前言——那段不是答案。

    覆盖范围要说清楚:挡住前言靠的是 assemble_streaming_message 里 64 字符的 holdback,
    所以这条只验证**短**前言。超过 64 字符的前言仍会先于 tool_calls 被 flush 出去,
    那是独立的老问题（`agent_llm.py` 的 holdback_chars 是个启发式,不是保证）。

    本文件的修复没有让它变差:前言泄漏时前端退回它原有的 startsWith 分支,表现和修复
    前一致。但别把这条测试当成「前言不会泄漏」的证明。
    """
    emitted: list[str] = []
    sanitizer = StreamingAnswerSanitizer({})
    lines = [
        b'data: {"choices":[{"delta":{"content":"\\u6211\\u5148\\u67e5\\u4e00\\u4e0b"}}]}',
        b'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1",'
        b'"function":{"name":"search_fulltext","arguments":"{}"}}]}}]}',
        b'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        b"data: [DONE]",
    ]
    message = assemble_streaming_message(
        iter(lines), lambda piece: emitted.append(sanitizer.feed(piece)), None
    )

    assert message.get("tool_calls"), "用例没有产生 tool_calls"
    assert "".join(emitted) == "", f"前言被推给了浏览器：{''.join(emitted)!r}"
