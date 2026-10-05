"""已经完成并落库的 turn 不许被报成超时。

原来有两处会把成功改判成失败:

1. `persist_turn` 之后还有一次 `raise_if_stopped()`。写库是两次真实 Rust HTTP 请求，
   写完那一刻 deadline 恰好到期的话，一次**已经完整落库**的 turn 被改判成
   `AI_RESPONSE_TIMEOUT`。
2. SSE 主循环从队列里取到事件之后才查 deadline，于是一个已经躺在队列里的 `done`
   被丢弃、换成超时事件。而 `persist_turn` 在 `events.put(done)` 之前就跑完了。

两者的后果一样:用户看到「AI 响应超时，请重试」，一点重试，库里就有了两条 turn；
刷新页面还会发现那个「超时」的问题其实带着完整答案。

要保留的对立约束:**非终态**事件的积压仍然不能掩盖过期的 deadline
（见 test_stream_reliability 的 test_queued_events_cannot_hide_expired_deadline，
那条用的是 100 个 answer_delta）。所以放行的只有 done / error。
"""

from __future__ import annotations

import json
import sys
import threading
import time
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.runtimes.contracts import AskResult  # noqa: E402
from test_stream_reliability import Runtime, make_stream  # noqa: E402


def _drain(stream) -> list[dict]:
    return [json.loads(line.removeprefix("data: ")) for line in stream]


class _FinishesThenExpires(Runtime):
    """跑完一整轮并落库，随后 deadline 才到期。"""

    def __init__(self) -> None:
        self.finished = threading.Event()

    def ask(self, question, *, request_control, on_event, **kwargs):
        self.control = request_control
        self.finished.set()
        return AskResult(answer="完整答案", citations=[], tool_trace=[], rounds=1)


def test_a_done_already_in_the_queue_survives_an_expired_deadline(monkeypatch) -> None:
    runtime = _FinishesThenExpires()
    stream, persisted = make_stream(runtime, monkeypatch)
    next(stream)  # routing
    next(stream)  # 启动 worker
    assert runtime.finished.wait(1), "runtime 没有跑完"
    # 等 worker 把 done 放进队列
    time.sleep(0.05)
    runtime.control._deadline_at = time.monotonic() - 1

    events = _drain(stream)
    kinds = [event.get("type") or event.get("code") for event in events]

    assert persisted == [True], "这一轮没有落库，用例前提不成立"
    assert "AI_RESPONSE_TIMEOUT" not in kinds, (
        f"已落库的成功 turn 被报成了超时：{kinds}"
    )
    assert "done" in kinds, f"终态 done 没有下发：{kinds}"


def test_a_backlog_of_deltas_still_cannot_hide_an_expired_deadline(monkeypatch) -> None:
    """对立约束:非终态事件的积压仍然要收口成超时。

    这条和上面那条是一对。只放行 done/error，不是「取到手的事件一律放行」。
    """
    ready, stopped = threading.Event(), threading.Event()

    class _Backlog(Runtime):
        def ask(self, question, *, request_control, on_event, **kwargs):
            self.control = request_control
            for _ in range(100):
                on_event({"type": "answer_delta", "text": "x"})
            ready.set()
            try:
                while True:
                    request_control.raise_if_stopped()
                    time.sleep(0.001)
            finally:
                stopped.set()

    runtime = _Backlog()
    stream, persisted = make_stream(runtime, monkeypatch)
    next(stream)
    next(stream)
    assert ready.wait(1)
    runtime.control._deadline_at = time.monotonic() - 1

    events = _drain(stream)
    assert [event.get("code") for event in events] == ["AI_RESPONSE_TIMEOUT"]
    assert persisted == []
