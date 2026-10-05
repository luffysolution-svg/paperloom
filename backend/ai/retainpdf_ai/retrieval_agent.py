"""Document-scoped retrieval agent and its bounded tool loop."""

from __future__ import annotations

import inspect
import json
from collections.abc import Callable
from typing import Any

from .agent_evidence import (
    StreamingAnswerSanitizer,
    assign_refs,
    public_tool_payload,
    referenced_citations,
    sanitize_answer_text,
)
from .prompts import build_reading_system_prompt
from .request_control import RequestControl
from .runtimes.contracts import AskResult, ChatFn, Citation
from .tools import ToolRegistry
from .chart_tools import CHART_TOOL_NAMES
from .unified_tools import (
    CALCULATION_TOOL_NAMES,
    agent_tool_event,
    with_tool_context,
)

SYSTEM_PROMPT = build_reading_system_prompt()
MARKDOWN_TOOL_NAMES = frozenset({"search_markdown", "read_markdown_chunk"})
STRUCTURED_READING_TOOL_NAMES = frozenset({"search_fulltext", "read_blocks"})
# 本地、确定性、不出网的工具。它们是"拿到证据之后"的加工步骤,不是检索。
COMPUTATION_TOOL_NAMES = frozenset((*CALCULATION_TOOL_NAMES, *CHART_TOOL_NAMES))
DOCUMENT_READING_TOOL_NAMES = frozenset(
    (*STRUCTURED_READING_TOOL_NAMES, *MARKDOWN_TOOL_NAMES)
)
DOCUMENT_SEARCH_TOOL_NAMES = frozenset({"search_fulltext", "search_markdown"})


class RetrievalAgent:
    """Run a bounded function-calling loop over RetainPDF retrieval tools."""

    def __init__(
        self,
        registry: ToolRegistry,
        chat_fn: ChatFn,
        *,
        max_tool_rounds: int = 6,
        computation_round_bonus: int = 3,
    ) -> None:
        self._registry = registry
        self._chat = chat_fn
        self._max_tool_rounds = max(1, max_tool_rounds)
        self._computation_round_bonus = max(0, computation_round_bonus)

    @property
    def registry(self) -> ToolRegistry:
        """Expose the read-only tool registry to unified host runtimes."""
        return self._registry

    def ask(
        self,
        question: str,
        *,
        conversation_id: str = "",
        document_id: str = "",
        job_id: str = "",
        request_message_id: str = "",
        on_event: Callable[[dict[str, Any]], None] | None = None,
        chat_fn: ChatFn | None = None,
        history: list[dict[str, str]] | None = None,
        max_tool_rounds: int | None = None,
        content_source: str = "auto",
        request_control: RequestControl | None = None,
    ) -> AskResult:
        emit = on_event or (lambda event: None)
        chat = chat_fn or self._chat
        scoped_document_id = document_id.strip()
        scoped_job_id = job_id.strip()
        messages = _initial_messages(
            question,
            document_id=scoped_document_id,
            job_id=scoped_job_id,
            history=history,
        )
        citations: dict[int, Citation] = {}
        trace: list[dict[str, Any]] = []
        calculation_refs: dict[str, dict[str, Any]] = {}
        next_ref = 1
        tool_specs = tool_specs_for_scope(
            self._registry,
            scoped_document_id,
            scoped_job_id,
            content_source=content_source,
        )
        allowed_tool_names = {
            str((spec.get("function") or {}).get("name") or "") for spec in tool_specs
        }
        document_reading_mode = bool(allowed_tool_names & DOCUMENT_READING_TOOL_NAMES)
        requires_document_search = bool(scoped_document_id or scoped_job_id) and document_reading_mode
        searched_document = False
        structured_search_available = "search_fulltext" in allowed_tool_names
        markdown_fallback_allowed = not structured_search_available
        round_limit = max(
            1,
            min(
                self._max_tool_rounds,
                max_tool_rounds if max_tool_rounds is not None else self._max_tool_rounds,
            ),
        )

        # 轮次预算。
        #
        # 上限存在是为了不让模型在**检索**上乱逛,但复杂问题的后半段是计算:检索 → 读块
        # → 算 → 画图 → 作答,在 reading 模式的 3 轮里做不完,会被强制收尾、拿着半截结果
        # 硬答。直接把上限调高会把"别乱逛"那条约束一起放掉,而问题只出在计算阶段。
        #
        # 所以:**一轮里调的全是本地计算工具时,不吃检索预算**,改从一份单独的、有限的
        # 计算预算里扣。混着调了检索工具的轮次照旧计入——那一轮仍然在检索。
        budget_left = round_limit
        computation_left = self._computation_round_bonus
        round_index = 0

        while True:
            round_index += 1
            if request_control is not None:
                request_control.raise_if_stopped()
            # 这一轮如果不调工具就会被下面的强制检索闸丢弃——而这件事**现在**就知道。
            # 注定被丢弃的正文不推给浏览器,否则用户会看到「废弃答案 + 真答案」拼接,
            # 而且下面那句「尚未完成文档检索」的护栏文案永远排在它后面。
            will_discard_bare_answer = requires_document_search and not searched_document
            # 清洗器按轮新建:它累积的是**这一轮**的原文,而最终答案也只来自一轮。
            # 引用映射此刻已经齐了——最终答案那一轮按定义不再调工具，所以
            # citations 在它开始流之前就不会再变。
            message = _chat_round(
                chat,
                messages,
                tool_specs,
                stream_answer=not will_discard_bare_answer,
                delta_sanitizer=StreamingAnswerSanitizer(citations),
            )
            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                if requires_document_search and not searched_document:
                    if budget_left > 1:
                        budget_left -= 1
                        _request_required_document_search(messages, content_source)
                        continue
                    return AskResult(
                        answer="当前回答尚未完成文档检索，无法可靠回答。请重试。",
                        tool_trace=trace,
                        rounds=round_index,
                    )
                return _answer_result(
                    message, citations, trace, round_index, calculation_refs
                )

            called = {
                str(call.get("function", {}).get("name") or "")
                for call in tool_calls
            }
            # 「全是计算工具」才走计算预算。只要掺了一个检索工具,这一轮就还在检索。
            computation_only = bool(called) and called <= COMPUTATION_TOOL_NAMES
            if computation_only and computation_left > 0:
                computation_left -= 1
            else:
                budget_left -= 1

            messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for call in tool_calls:
                if request_control is not None:
                    request_control.raise_if_stopped()
                name = call.get("function", {}).get("name", "")
                if document_reading_mode and name not in allowed_tool_names:
                    _reject_hidden_tool(
                        call,
                        name=name,
                        round_index=round_index,
                        messages=messages,
                        trace=trace,
                        emit=emit,
                    )
                    continue
                if name in MARKDOWN_TOOL_NAMES and not markdown_fallback_allowed:
                    _reject_early_markdown_fallback(
                        call,
                        name=name,
                        round_index=round_index,
                        messages=messages,
                        trace=trace,
                        emit=emit,
                    )
                    continue
                arguments = _parse_tool_arguments(call)
                arguments = scope_tool_arguments(
                    name,
                    arguments,
                    document_id=scoped_document_id,
                    job_id=scoped_job_id,
                )
                call_id = str(call.get("id") or "")[:256]
                if name in CALCULATION_TOOL_NAMES:
                    arguments = with_tool_context(
                        arguments,
                        conversation_id=conversation_id,
                        request_message_id=request_message_id,
                        document_id=scoped_document_id,
                        job_id=scoped_job_id,
                        tool_call_id=call_id,
                    )
                if name in DOCUMENT_SEARCH_TOOL_NAMES:
                    searched_document = True
                emit(agent_tool_event(name, call_id, "running"))
                result = self._registry.invoke(name, arguments)
                calculation_id = str(result.get("calculation_id") or "").strip()
                if calculation_id:
                    calculation_refs[calculation_id] = {
                        "calculation_id": calculation_id,
                        "status": "failed" if result.get("error") else "completed",
                    }
                if name == "search_fulltext":
                    markdown_fallback_allowed = (
                        result.get("structured_data_available") is False
                    )
                next_ref = assign_refs(result, citations, next_ref)
                emit(
                    agent_tool_event(
                        name,
                        call_id,
                        "failed" if result.get("error") else "completed",
                        result,
                    )
                )
                trace_entry: dict[str, Any] = {"round": round_index, "tool": name}
                if name not in CALCULATION_TOOL_NAMES:
                    trace_entry["arguments"] = arguments
                trace.append(trace_entry)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", ""),
                        "content": json.dumps(
                            result
                            if name in CALCULATION_TOOL_NAMES
                            else public_tool_payload(result),
                            ensure_ascii=False,
                        ),
                    }
                )

            # 收尾条件仍然只看检索预算。曾经试过「两份预算都见底才停」,那会让检索
            # 预算耗尽之后再多跑一次模型调用,而那一轮要是又去检索就只能整轮丢弃——
            # 白花一次往返。计算预算的作用是让计算轮不扣检索预算,不是延长循环。
            if budget_left <= 0:
                break

        messages.append(
            {
                "role": "user",
                "content": (
                    "请基于以上已检索到的证据直接给出最终回答,不要再调用工具。"
                    "引用只用 [n]。"
                ),
            }
        )
        # Use the request-level chat transport here as well: deployments may
        # provide credentials per request while the startup transport has none.
        if request_control is not None:
            request_control.raise_if_stopped()
        if requires_document_search and not citations:
            # 轮数用完了,而一条证据都没拿到。此前这里无条件强制收尾——模型照样输出一段
            # 自信的、纯参数知识的回答,没有任何引用,UI 也看不出它是被逼着收尾的。
            # 用户拿到的是一个看起来正常、实际上没有依据的答案。
            #
            # 强制检索闸在「模型主动不调工具」那条路上会返回这句护栏文案,这条路上
            # 同样该返回它:两条路的失败原因是同一个——没有证据。
            return AskResult(
                answer="当前回答尚未完成文档检索，无法可靠回答。请重试。",
                tool_trace=trace,
                rounds=round_index,
            )
        message = _chat_round(
            chat,
            messages,
            [],
            stream_answer=True,
            delta_sanitizer=StreamingAnswerSanitizer(citations),
        )
        # 走到这里说明轮次预算用尽、模型是被那句「不要再调用工具」逼着收尾的。
        # 它照样会写出一段语气正常的回答,用户看不出它其实没做完——所以要标出来。
        return _answer_result(
            message,
            citations,
            trace,
            round_index,
            calculation_refs,
            incomplete_reason="rounds_exhausted",
        )


def _initial_messages(
    question: str,
    *,
    document_id: str,
    job_id: str,
    history: list[dict[str, str]] | None,
) -> list[dict[str, Any]]:
    user_content = question.strip()
    if document_id or job_id:
        user_content = (
            f"(限定当前结构化文档 document_id={document_id or 'unknown'}"
            f"{f', job_id={job_id}' if job_id else ''}"
            "。优先使用 search_fulltext / read_blocks 读取同一套原文、译文与版面块；"
            "仅在 search_fulltext 明确报告没有结构化数据时使用 Markdown 兼容工具。)\n"
            f"{user_content}"
        )
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if not (document_id or job_id):
        messages[0]["content"] += "\n\n" + (
            "当前请求没有绑定文档。普通聊天、通用知识或连通性测试可以直接回答，"
            "不要求文档检索或引用，也不要声称已读取某篇文档。"
            "若用户确实询问文档内容，应使用检索工具取得证据，"
            "或请用户明确选择文档；不得编造文档内容或引用。"
        )
    for turn in history or []:
        role = str(turn.get("role") or "")
        content = str(turn.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_content})
    return messages


def _chat_round(
    chat: Any,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    *,
    stream_answer: bool,
    delta_sanitizer: Any = None,
) -> dict[str, Any]:
    """调用 chat,能关推流就关。

    chat_fn 是可插拔的（测试注入自己的双替身,别的 runtime 也有各自实现）,所以先看
    它认不认这个关键字,不认就照常调用——退化成「照旧推流」,不会因为签名不匹配而报错。
    """
    supported = _supported_chat_kwargs(chat)
    extra: dict[str, Any] = {}
    if not stream_answer and "stream_answer" in supported:
        extra["stream_answer"] = False
    if delta_sanitizer is not None and "delta_sanitizer" in supported:
        extra["delta_sanitizer"] = delta_sanitizer
    return chat(messages, tools, **extra)


def _supported_chat_kwargs(chat: Any) -> frozenset[str]:
    try:
        return frozenset(inspect.signature(chat).parameters)
    except (TypeError, ValueError):
        return frozenset()


def _request_required_document_search(
    messages: list[dict[str, Any]], content_source: str = "auto"
) -> None:
    if content_source == "markdown":
        instruction = (
            "回答当前文档前必须先调用 search_markdown 检索 Markdown，"
            "再用 read_markdown_chunk 读取证据。"
        )
    else:
        instruction = (
            "回答当前文档前必须先调用 search_fulltext 检索结构化块。"
            "结构化数据存在但无命中时应更换关键词继续检索。"
        )
    messages.extend(
        [
            {"role": "assistant", "content": ""},
            {
                "role": "user",
                "content": instruction,
            },
        ]
    )


def _parse_tool_arguments(call: dict[str, Any]) -> dict[str, Any]:
    try:
        arguments = json.loads(call.get("function", {}).get("arguments") or "{}")
    except json.JSONDecodeError:
        return {}
    return arguments if isinstance(arguments, dict) else {}


def _reject_hidden_tool(
    call: dict[str, Any],
    *,
    name: str,
    round_index: int,
    messages: list[dict[str, Any]],
    trace: list[dict[str, Any]],
    emit: Callable[[dict[str, Any]], None],
) -> None:
    arguments = {"skipped": True}
    result = {
        "error": (
            "当前文档问答不允许调用该工具，请使用 search_fulltext / read_blocks；"
            "旧任务缺少结构化数据时才使用 search_markdown / read_markdown_chunk。"
        )
    }
    event = {
        "type": "tool",
        "round": round_index,
        "tool": name,
        "arguments": arguments,
    }
    emit(event)
    trace.append({"round": round_index, "tool": name, "arguments": arguments})
    messages.append(
        {
            "role": "tool",
            "tool_call_id": call.get("id", ""),
            "content": json.dumps(result, ensure_ascii=False),
        }
    )


def _reject_early_markdown_fallback(
    call: dict[str, Any],
    *,
    name: str,
    round_index: int,
    messages: list[dict[str, Any]],
    trace: list[dict[str, Any]],
    emit: Callable[[dict[str, Any]], None],
) -> None:
    arguments = {"skipped": True}
    result = {
        "error": (
            "请先调用 search_fulltext 检索结构化文档块；只有它明确报告当前文档没有"
            f"结构化数据时，才可调用 {name}。单次无命中不会启用 Markdown。"
        )
    }
    emit(
        {
            "type": "tool",
            "round": round_index,
            "tool": name,
            "arguments": arguments,
        }
    )
    trace.append({"round": round_index, "tool": name, "arguments": arguments})
    messages.append(
        {
            "role": "tool",
            "tool_call_id": call.get("id", ""),
            "content": json.dumps(result, ensure_ascii=False),
        }
    )


def _answer_result(
    message: dict[str, Any],
    citations: dict[int, Citation],
    trace: list[dict[str, Any]],
    rounds: int,
    calculation_refs: dict[str, dict[str, Any]] | None = None,
    incomplete_reason: str = "",
) -> AskResult:
    answer = sanitize_answer_text(str(message.get("content") or "").strip(), citations)
    return AskResult(
        answer=answer,
        citations=referenced_citations(answer, citations),
        tool_trace=trace,
        rounds=rounds,
        calculation_refs=list((calculation_refs or {}).values()),
        incomplete_reason=incomplete_reason,
    )


def scope_tool_arguments(
    name: str,
    arguments: dict[str, Any],
    *,
    document_id: str = "",
    job_id: str = "",
) -> dict[str, Any]:
    """Force tool calls into the current document/job scope."""
    scoped = dict(arguments)
    if name in MARKDOWN_TOOL_NAMES:
        if document_id:
            scoped["document_id"] = document_id
        if job_id:
            scoped["job_id"] = job_id
        return scoped
    if not document_id:
        return scoped
    if name in {"search_fulltext", "search_favorites", "list_documents", "read_blocks"}:
        scoped["document_id"] = document_id
    if name == "search_fulltext" and job_id:
        # Internal scope only: the tool uses this to decide whether the exact
        # reader job has a document.v1 artifact.  Rust full-text search remains
        # document scoped.
        scoped["job_id"] = job_id
    if name == "read_blocks" and job_id and not str(scoped.get("job_id") or "").strip():
        scoped["job_id"] = job_id
    return scoped


def tool_specs_for_scope(
    registry: ToolRegistry,
    document_id: str = "",
    job_id: str = "",
    *,
    content_source: str = "auto",
) -> list[dict[str, Any]]:
    """Expose structured document tools first, with Markdown as legacy fallback."""
    specs = registry.specs()
    names = {str((spec.get("function") or {}).get("name") or "") for spec in specs}
    if document_id.strip() and names & DOCUMENT_READING_TOOL_NAMES:
        by_name = {
            str((spec.get("function") or {}).get("name") or ""): spec
            for spec in specs
        }
        preferred_order = (
            "search_fulltext",
            "read_blocks",
            "search_markdown",
            "read_markdown_chunk",
        )
        preferred = [by_name[name] for name in preferred_order if name in by_name]
        preferred_names = set(preferred_order) | {"list_documents"}
        selected = [
            *preferred,
            *[
                spec
                for spec in specs
                if str((spec.get("function") or {}).get("name") or "")
                not in preferred_names
            ],
        ]
        if content_source == "structured":
            return [
                spec
                for spec in selected
                if str((spec.get("function") or {}).get("name") or "")
                not in MARKDOWN_TOOL_NAMES
            ]
        if content_source == "markdown":
            return [
                spec
                for spec in selected
                if str((spec.get("function") or {}).get("name") or "")
                not in STRUCTURED_READING_TOOL_NAMES
            ]
        if content_source == "none":
            return [
                spec
                for spec in selected
                if str((spec.get("function") or {}).get("name") or "")
                not in DOCUMENT_READING_TOOL_NAMES
            ]
        return selected
    if job_id.strip():
        return [
            spec
            for spec in specs
            if str((spec.get("function") or {}).get("name") or "")
            in MARKDOWN_TOOL_NAMES | CALCULATION_TOOL_NAMES
        ]
    if not document_id.strip():
        return [
            spec
            for spec in specs
            if str((spec.get("function") or {}).get("name") or "")
            not in MARKDOWN_TOOL_NAMES
        ]
    return [
        spec
        for spec in specs
        if str((spec.get("function") or {}).get("name") or "") != "list_documents"
    ]


_scope_tool_arguments = scope_tool_arguments
_tool_specs_for_scope = tool_specs_for_scope

# Historical private import retained for compatibility with tests/integrations.
_request_required_markdown_search = _request_required_document_search
