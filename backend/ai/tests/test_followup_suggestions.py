"""追问建议:一轮答完之后产出 2-3 条接着可以问的问题,随 done 下发。

这里钉住三件事:

1. **建议不污染主回答**。它走的是另一条没有推流出口的 transport,产物只进 done 里的
   followups 字段,既不会被当成正文流给用户,也不会混进 citations。
2. **宁可没有,也不凑数**。没有证据的轮次不花那次调用;空话、非问句、解析不出来的
   一律丢掉;一条都不剩时整个字段缺席。
3. **建议出错不能把一轮已经答完的问答弄失败**。

模型不真调:chat_fn 全是替身,和 tests 里其他编排测试一个路子。
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from retainpdf_ai.api_contracts import AskInput
from retainpdf_ai.ask_orchestration import AskOrchestrator, PreparedAsk
from retainpdf_ai.config import Settings
from retainpdf_ai.followups import (
    MAX_FOLLOWUP_CHARS,
    MAX_FOLLOWUPS,
    MIN_FOLLOWUP_CHARS,
    MIN_REMAINING_SECONDS,
    generate_followups,
    has_evidence,
    parse_followups,
)
from retainpdf_ai.request_control import RequestControl
from retainpdf_ai.request_routing import RouteDecision
from retainpdf_ai.runtimes.contracts import AskResult, Citation, RuntimeCapabilities

CONTRACT_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "ai-ask.v1.schema.json"
)


def _result(**overrides):
    payload = {
        "answer": "信赖域方法在第 3 页给出的耗时是 12 秒。[1]",
        "citations": [
            Citation(
                ref=1,
                document_id="doc-1",
                job_id="job-1",
                page_idx=2,
                block_id="p002-b0004",
                snippet="信赖域方法耗时 12 秒,线搜索 7 秒。",
            )
        ],
        "tool_trace": [{"round": 1, "tool": "search_fulltext", "status": "completed"}],
        "rounds": 2,
    }
    payload.update(overrides)
    return AskResult(**payload)


class Chat:
    """chat_fn 替身。记住自己有没有推流出口,以及每次调用的参数。"""

    def __init__(self, reply="", on_delta=None, error=None):
        self.reply = reply
        self.on_delta = on_delta
        self.error = error
        self.calls = []
        self.stream_flags = []

    def __call__(self, messages, tools, *, stream_answer=True, delta_sanitizer=None):
        self.calls.append(messages)
        self.stream_flags.append(stream_answer)
        if self.error is not None:
            raise self.error
        return {"role": "assistant", "content": self.reply}


# ---------------------------------------------------------------- 清洗与解析


def test_only_grounded_questions_survive():
    raw = json.dumps([
        "信赖域方法的 12 秒是在什么规模下测的?",
        "线搜索为什么比信赖域快?",
        "还有什么问题吗?",
        "对比两种方法的收敛速度",
        "第 3 页的表格还给出了哪些指标?",
        "这是第四条,应该被截掉,对吗?",
    ], ensure_ascii=False)
    assert parse_followups(raw) == [
        "信赖域方法的 12 秒是在什么规模下测的?",
        "线搜索为什么比信赖域快?",
        "第 3 页的表格还给出了哪些指标?",
    ]


def test_filler_is_dropped_without_eating_real_questions():
    """空话判定是**整串**匹配的。

    包含匹配会误伤:「需要我们关注哪些指标」里有「需要我」,「还有哪些方法没有提到」
    以「还有哪些」开头——它们都是正经问题。
    """
    for filler in ["还有什么问题吗?", "还有其他问题?", "需要我继续吗?", "anything else?",
                   "Any other questions?", "我还能为您做什么?"]:
        assert parse_followups(json.dumps([filler])) == [], filler
    for real in ["这份报告需要我们关注哪些指标?", "文中还有哪些方法没有展开讨论?"]:
        assert parse_followups(json.dumps([real], ensure_ascii=False)) == [real], real


def test_non_questions_and_oversized_answers_are_dropped():
    assert parse_followups(json.dumps(["对比两种方法的收敛速度"], ensure_ascii=False)) == []
    assert parse_followups(json.dumps(["短?"], ensure_ascii=False)) == []
    too_long = "问" * (MAX_FOLLOWUP_CHARS + 1) + "?"
    assert parse_followups(json.dumps([too_long], ensure_ascii=False)) == []
    just_long_enough = "问" * (MIN_FOLLOWUP_CHARS - 1) + "?"
    assert parse_followups(json.dumps([just_long_enough], ensure_ascii=False)) == [just_long_enough]


def test_citation_markers_never_leak_into_a_suggestion():
    """建议是要塞回输入框重新问的,下一轮的 [1] 根本不是这一轮的 [1]。"""
    assert parse_followups(json.dumps(["[1] 那张表还说明了什么?"], ensure_ascii=False)) == [
        "那张表还说明了什么?"
    ]


def test_duplicates_collapse():
    raw = json.dumps(["那张表还说明了什么?", "那张表还说明了什么", "那张表还说明了什么??"],
                     ensure_ascii=False)
    assert parse_followups(raw) == ["那张表还说明了什么?"]


@pytest.mark.parametrize("raw", [
    "", "不知道", "[", "{\"followups\": 1}", "[1, 2, 3]", "[\"未闭合",
])
def test_unparsable_replies_yield_nothing(raw):
    assert parse_followups(raw) == []


def test_fenced_and_prefaced_json_is_still_parsed():
    fenced = "```json\n[\"这个结论在别的章节有佐证吗?\"]\n```"
    assert parse_followups(fenced) == ["这个结论在别的章节有佐证吗?"]
    prefaced = "好的,建议如下:[\"这个结论在别的章节有佐证吗?\"]"
    assert parse_followups(prefaced) == ["这个结论在别的章节有佐证吗?"]


# ---------------------------------------------------------------- 证据判据


def test_evidence_is_what_decides_whether_to_spend_a_call():
    assert has_evidence(_result()) is True
    assert has_evidence(AskResult(answer="你好")) is False
    assert has_evidence(AskResult(answer="a", tool_trace=[
        {"round": 1, "tool": "search_fulltext", "status": "failed"},
        {"round": 1, "tool": "search_markdown", "status": "skipped"},
    ])) is False
    # retrieval_agent 的 trace 条目不带 status——缺省当成功,否则它整条路都算"没证据"。
    assert has_evidence(AskResult(answer="a", tool_trace=[
        {"round": 1, "tool": "search_fulltext", "arguments": {}},
    ])) is True


def test_a_turn_without_evidence_never_calls_the_model():
    chat = Chat(reply=json.dumps(["不该被问出来的?"], ensure_ascii=False))
    assert generate_followups(chat, question="你好", result=AskResult(answer="你好")) == []
    assert chat.calls == []


# ---------------------------------------------------------------- 轻量调用本身


def test_the_suggestion_call_never_streams_its_output():
    """建议不能被当成正文流给用户。

    第一道闸是编排层给的 transport 本来就没有 on_delta;这里钉第二道:即使 chat_fn 认
    stream_answer,这次调用也明确把它关掉。
    """
    chat = Chat(reply=json.dumps(["那张表还说明了什么?"], ensure_ascii=False))
    assert generate_followups(chat, question="耗时多少?", result=_result())
    assert chat.stream_flags == [False]


def test_the_prompt_carries_this_turn_evidence():
    chat = Chat(reply="[]")
    generate_followups(chat, question="耗时多少?", result=_result())
    prompt = json.dumps(chat.calls[0], ensure_ascii=False)
    assert "信赖域方法耗时 12 秒" in prompt and "search_fulltext" in prompt


def test_a_failing_suggestion_call_never_fails_the_finished_turn():
    chat = Chat(error=RuntimeError("模型挂了"))
    assert generate_followups(chat, question="耗时多少?", result=_result()) == []


def test_a_cancelled_request_skips_the_call():
    """用户已经断开了,没人会看到这几条建议。"""
    chat = Chat(reply=json.dumps(["那张表还说明了什么?"], ensure_ascii=False))
    control = RequestControl(60)
    control.cancel("client_disconnected")
    assert generate_followups(chat, question="耗时多少?", result=_result(),
                              request_control=control) == []
    assert chat.calls == []


def test_a_nearly_expired_deadline_skips_the_call():
    chat = Chat(reply=json.dumps(["那张表还说明了什么?"], ensure_ascii=False))
    control = RequestControl(MIN_REMAINING_SECONDS - 0.5)
    assert generate_followups(chat, question="耗时多少?", result=_result(),
                              request_control=control) == []
    assert chat.calls == []
    control.finish()


# ---------------------------------------------------------------- 编排两条路


class Runtime:
    runtime_id = "followup-test-runtime"
    capabilities = RuntimeCapabilities(
        document_reading=True, document_operations=False, streaming=True,
        durable_sessions=False, model_transport="host_chat",
    )

    def __init__(self, result):
        self.result = result

    def ask(self, question, **kwargs):
        on_event = kwargs.get("on_event")
        if on_event is not None:
            on_event({"type": "answer_delta", "text": self.result.answer})
        return self.result


class RuntimeManaged(Runtime):
    capabilities = RuntimeCapabilities(
        document_reading=True, document_operations=False, streaming=True,
        durable_sessions=False, model_transport="runtime_managed",
    )


class State:
    def resolve_document_id(self, payload):
        return payload.document_id.strip()

    def ensure_conversation_id(self, payload, document_id):
        return "conv-1"

    def prepare_memory(self, conversation_id, force_compress=False, stop_at=""):
        return ([], None, {}, "")

    def persist_agent_request_message(self, *args, **kwargs):
        return ("req-1", True)

    def persist_turn(self, *args, **kwargs):
        self.persisted = getattr(self, "persisted", 0) + 1
        return True


def _make(runtime, reply, **settings_overrides):
    built: list[Chat] = []

    def builder(settings, *, request_control=None, on_delta=None):
        chat = Chat(reply=reply, on_delta=on_delta)
        built.append(chat)
        return chat

    settings = Settings(ai_request_deadline_s=30, ai_heartbeat_interval_s=1,
                        **settings_overrides)
    orchestrator = AskOrchestrator(
        settings=settings, runtime=runtime, reading_runtime=runtime,
        conversation_state=State(), chat_fn_builder=builder,
        confirmation_projector=lambda *a: [],
    )
    prepared = PreparedAsk(runtime, runtime.runtime_id, settings,
                           RouteDecision("auto", "reading", "safe_reading_default"),
                           "structured", 3)
    return orchestrator, prepared, built


def _stream(orchestrator, prepared):
    payload = AskInput(question="信赖域耗时多少?", stream=True, document_id="doc-1")
    return [json.loads(chunk[len("data: "):]) for chunk in
            orchestrator.sse_events(payload, prepared)]


REPLY = json.dumps(["线搜索为什么比信赖域快?", "12 秒是在什么规模下测的?"],
                   ensure_ascii=False)


def test_done_carries_the_suggestions_and_the_stream_stays_clean():
    orchestrator, prepared, built = _make(Runtime(_result()), REPLY)
    events = _stream(orchestrator, prepared)
    done = [event for event in events if event["type"] == "done"][0]
    assert done["followups"] == ["线搜索为什么比信赖域快?", "12 秒是在什么规模下测的?"]
    # 建议既没有被当成正文流出去,也没有混进 citations。
    streamed = "".join(e["text"] for e in events if e["type"] == "answer_delta")
    assert streamed == _result().answer
    for suggestion in done["followups"]:
        assert suggestion not in streamed
    assert [c["ref"] for c in done["citations"]] == [1]
    # 真正被调用的那条 transport 没有推流出口。
    called = [chat for chat in built if chat.calls]
    assert called and all(chat.on_delta is None for chat in called)


def test_the_non_streaming_path_gets_the_same_suggestions():
    orchestrator, prepared, _ = _make(Runtime(_result()), REPLY)
    payload = AskInput(question="信赖域耗时多少?", document_id="doc-1")
    data = orchestrator.ask(payload, prepared)["data"]
    assert data["followups"] == ["线搜索为什么比信赖域快?", "12 秒是在什么规模下测的?"]


@pytest.mark.parametrize("reply", ["[]", json.dumps(["还有什么问题吗?"], ensure_ascii=False)])
def test_nothing_worth_asking_means_no_field_at_all(reply):
    """凑数的建议比没有建议更糟,而"没有"要能一眼看出来:空的时候整个字段缺席。"""
    orchestrator, prepared, _ = _make(Runtime(_result()), reply)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert "followups" not in done


def test_a_turn_without_evidence_costs_nothing():
    orchestrator, prepared, built = _make(Runtime(AskResult(answer="你好", rounds=1)), REPLY)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert "followups" not in done
    assert all(chat.calls == [] for chat in built)


def test_the_feature_can_be_switched_off():
    orchestrator, prepared, built = _make(Runtime(_result()), REPLY,
                                          followup_suggestions=False)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert "followups" not in done
    assert all(chat.calls == [] for chat in built)


def test_a_runtime_managed_model_is_not_asked_through_the_host():
    """fx 一类 runtime 自己管模型,宿主这边没有可用的 chat transport。"""
    orchestrator, prepared, built = _make(RuntimeManaged(_result()), REPLY)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert "followups" not in done
    assert all(chat.calls == [] for chat in built)


def test_a_runtime_that_produced_its_own_suggestions_is_not_asked_twice():
    result = _result(followups=["这个结论在别的章节有佐证吗?"])
    orchestrator, prepared, built = _make(Runtime(result), REPLY)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert done["followups"] == ["这个结论在别的章节有佐证吗?"]
    assert all(chat.calls == [] for chat in built)


def test_runtime_supplied_suggestions_go_through_the_same_filter():
    result = _result(followups=["还有什么问题吗?", "对比两种方法", "12 秒怎么测出来的?"])
    orchestrator, prepared, _ = _make(Runtime(result), REPLY)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert done["followups"] == ["12 秒怎么测出来的?"]


# ---------------------------------------------------------------- 契约


def test_contract_and_implementation_agree_on_the_shape():
    schema = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    followups = schema["definitions"]["DonePayload"]["properties"]["followups"]
    assert followups["type"] == "array"
    assert followups["maxItems"] == MAX_FOLLOWUPS
    assert followups["items"]["type"] == "string"
    assert followups["items"]["minLength"] == MIN_FOLLOWUP_CHARS
    assert followups["items"]["maxLength"] == MAX_FOLLOWUP_CHARS
    # 可选字段:空的时候不发,所以不能进 required。
    assert "followups" not in schema["definitions"]["DonePayload"]["required"]
    assert "followups" in {f.name for f in __import__("dataclasses").fields(AskResult)}


def test_done_marks_an_answer_that_was_cut_short():
    """轮次用尽时模型被强制收尾,语气照常——不在 done 里说一声,前端看不出来。"""
    orchestrator, prepared, _ = _make(
        Runtime(_result(incomplete_reason="rounds_exhausted")), REPLY,
    )
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert done["incomplete_reason"] == "rounds_exhausted"


def test_done_says_nothing_when_the_answer_is_complete():
    """"完整"是默认,不该每轮都声明一次。"""
    orchestrator, prepared, _ = _make(Runtime(_result()), REPLY)
    done = [e for e in _stream(orchestrator, prepared) if e["type"] == "done"][0]
    assert "incomplete_reason" not in done


def test_incomplete_reason_is_in_the_contract():
    schema = json.loads(
        (Path(__file__).resolve().parents[3] / "contracts" / "ai-ask.v1.schema.json").read_text()
    )
    field = schema["definitions"]["DonePayload"]["properties"]["incomplete_reason"]
    assert "rounds_exhausted" in field["enum"]
    assert "incomplete_reason" not in schema["definitions"]["DonePayload"].get("required", [])


def test_a_stopped_turn_is_not_persisted():
    """用户点停止 = 这一轮当没发生过,不留半截回答。

    这是产品决定,不是疏漏。ai_messages.finish_reason 里那个 "cancelled" 因此
    目前没有任何写入方——别看到那个值就以为中断会落库。这条测试在这里,是为了
    不让人顺手「把它修好」。

    交错是真实发生的:模型已经把回答流完、结果也拿到了,而请求在落库之前被取消。
    sse_events 收 request_control,所以这个缝是公开的,不用为测试另开口子。
    """
    orchestrator, prepared, _ = _make(Runtime(_result()), REPLY)
    state = orchestrator._conversation_state
    control = RequestControl(30)
    payload = AskInput(question="会被停掉的问题", stream=True, document_id="doc-1")

    # 让模型这一轮跑完之后立刻取消:落库那一步必须被挡住。
    original = Runtime(_result()).ask

    def cancel_then_answer(*args, **kwargs):
        result = original(*args, **kwargs)
        control.cancel("client_disconnected")
        return result

    prepared.runtime.ask = cancel_then_answer
    list(orchestrator.sse_events(payload, prepared, request_control=control))

    assert getattr(state, "persisted", 0) == 0, "被停止的那一轮落库了"
