"""注定被丢弃的那一轮，正文不许推给浏览器。

强制检索闸（retrieval_agent）在「需要检索但模型还没检索就直接作答」时丢弃这一轮并
重来。但 assemble_streaming_message 对**任何**没有 tool_calls 的轮次都会在结尾 flush，
于是那段被丢弃的答案已经流到用户屏幕上了，随后真答案再流一遍——用户看到的是
「废弃答案 + 真答案」拼接。

更糟的是最后一轮：闸门返回的是「当前回答尚未完成文档检索，无法可靠回答。请重试。」
这句护栏文案，而前面已经流出去的臆测**排在它前面**且改不掉（AI SDK 6 没有
reset-step，前端只能追加）。用户看到的就是那段没有依据的答案。

关键在于这件事**提前就知道**：`requires_document_search and not searched_document`
在发起这一轮之前就能算出来，不必等结果。
"""

from __future__ import annotations

import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.retrieval_agent import RetrievalAgent  # noqa: E402
from retainpdf_ai.tools import Tool, ToolRegistry  # noqa: E402


class _Recorder:
    """记录每一轮 chat 被要求推流还是静默。"""

    def __init__(self, rounds: list[dict]) -> None:
        self._rounds = rounds
        self.stream_flags: list[bool] = []

    def __call__(self, messages, tools, *, stream_answer: bool = True):
        self.stream_flags.append(stream_answer)
        return self._rounds[min(len(self.stream_flags) - 1, len(self._rounds) - 1)]


def _registry() -> ToolRegistry:
    def search_fulltext(_arguments):
        return {"hits": [], "structured_data_available": True}

    def read_blocks(_arguments):
        return {"blocks": []}

    return ToolRegistry(
        [
            Tool(
                name="search_fulltext",
                description="搜索",
                parameters={"type": "object", "properties": {}},
                handler=search_fulltext,
            ),
            Tool(
                name="read_blocks",
                description="读块",
                parameters={"type": "object", "properties": {}},
                handler=read_blocks,
            ),
        ]
    )


def _ask(recorder: _Recorder, **kwargs):
    agent = RetrievalAgent(_registry(), recorder, max_tool_rounds=3)
    return agent.ask("这篇论文讲了什么？", document_id="doc-1", job_id="job-1", **kwargs)


def test_a_round_that_would_be_discarded_is_not_streamed() -> None:
    """第一轮不调工具 → 会被丢弃 → 不许推流。"""
    bare = {"content": "我猜这篇论文提出了一种新方法。", "tool_calls": []}
    recorder = _Recorder([bare])
    _ask(recorder)

    assert recorder.stream_flags, "chat 一次都没被调用"
    assert recorder.stream_flags[0] is False, (
        "尚未检索就作答的那一轮仍在推流，用户会看到被丢弃的臆测"
    )


def test_streaming_resumes_once_the_document_has_been_searched() -> None:
    """检索过之后的回答是要给用户看的，必须推流。"""
    search_round = {
        "content": "",
        "tool_calls": [
            {"id": "c1", "function": {"name": "search_fulltext", "arguments": "{}"}}
        ],
    }
    answer_round = {"content": "论文提出了一种新方法。", "tool_calls": []}
    recorder = _Recorder([search_round, answer_round])
    _ask(recorder)

    assert len(recorder.stream_flags) >= 2, f"轮次不足：{recorder.stream_flags}"
    assert recorder.stream_flags[0] is False, "第一轮尚未检索，不该推流"
    assert recorder.stream_flags[1] is True, "检索之后的回答轮必须推流"


def test_a_chat_fn_without_the_flag_still_works() -> None:
    """chat_fn 是可插拔的——不认这个关键字就退化成照旧推流，不能因签名不匹配而报错。"""
    calls: list[int] = []

    def legacy_chat(messages, tools):
        calls.append(1)
        return {"content": "答案", "tool_calls": []}

    agent = RetrievalAgent(_registry(), legacy_chat, max_tool_rounds=2)
    result = agent.ask("问题", document_id="doc-1", job_id="job-1")

    assert calls, "旧签名的 chat_fn 没有被调用"
    assert result.answer
