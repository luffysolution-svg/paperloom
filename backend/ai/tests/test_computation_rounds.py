"""纯计算的轮次不吃检索预算。

轮次上限压得低是为了不让模型在**检索**上乱逛。但复杂问题的后半段是计算:检索 → 读块
→ 算 → 画图 → 作答。在 reading 模式的 3 轮里做不完,模型会被强制收尾、拿着半截结果硬
答。直接把上限调高会把"别乱逛"那条约束一起放掉,而问题只出在计算阶段。

所以规则是:**一轮里调的全是本地计算工具时,从一份单独的、有限的计算预算里扣**;只要
掺了一个检索工具,这一轮仍然算检索。总轮数被两份预算之和夹住。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from retainpdf_ai.retrieval_agent import RetrievalAgent
from retainpdf_ai.tools import Tool, ToolRegistry


def _tool(name: str, payload: dict | None = None) -> Tool:
    return Tool(
        name=name,
        description=name,
        parameters={"type": "object", "properties": {}},
        handler=lambda arguments: dict(payload or {"ok": True}),
    )


def _registry() -> ToolRegistry:
    return ToolRegistry([
        _tool("search_fulltext", {"hits": [{
            "document_id": "doc-a", "job_id": "job-1", "page_idx": 1,
            "block_id": "p001-b0001", "translated_snippet": "证据",
        }]}),
        _tool("calculate_expression", {"value": 42}),
        _tool("calculate_statistics", {"mean": 1.5}),
        _tool("make_chart", {"markdown": "```retainpdf-chart\n{}\n```"}),
    ])


def _call(name: str, call_id: str = "c1") -> dict:
    return {
        "id": call_id,
        "type": "function",
        "function": {"name": name, "arguments": json.dumps({})},
    }


class _Script:
    """按脚本逐轮返回模型响应;脚本走完就给最终回答。"""

    def __init__(self, rounds: list[list[str]]) -> None:
        self._rounds = list(rounds)
        self.calls = 0

    def __call__(self, messages, tools, **kwargs):
        self.calls += 1
        if not self._rounds:
            return {"content": "最终回答 [1]"}
        names = self._rounds.pop(0)
        if not names:
            return {"content": "最终回答 [1]"}
        return {"content": "", "tool_calls": [_call(n, f"c{self.calls}") for n in names]}


def _run(rounds: list[list[str]], *, max_tool_rounds: int, bonus: int):
    script = _Script(rounds)
    agent = RetrievalAgent(
        _registry(), script, max_tool_rounds=max_tool_rounds, computation_round_bonus=bonus,
    )
    result = agent.ask("算一下", content_source="unscoped")
    return result, script


def test_calculation_rounds_do_not_spend_the_retrieval_budget():
    """检索 1 轮 + 计算 3 轮,在 2 轮检索预算下仍然跑得完。"""
    rounds = [["search_fulltext"], ["calculate_expression"], ["calculate_statistics"], ["make_chart"]]
    result, script = _run(rounds, max_tool_rounds=2, bonus=3)
    tools_used = [entry["tool"] for entry in result.tool_trace]
    assert tools_used == [
        "search_fulltext", "calculate_expression", "calculate_statistics", "make_chart",
    ], tools_used


def test_chart_counts_as_computation_too():
    """画图是拿到数之后的加工,和计算同类——否则「算完再画」永远差一轮。"""
    result, _ = _run(
        [["search_fulltext"], ["make_chart"], ["make_chart"]],
        max_tool_rounds=2, bonus=2,
    )
    assert [e["tool"] for e in result.tool_trace].count("make_chart") == 2


def test_a_round_that_also_searches_still_spends_the_retrieval_budget():
    """掺了检索工具就还是检索轮,不能靠捎带一个计算工具白嫖预算。"""
    rounds = [["search_fulltext", "calculate_expression"], ["search_fulltext"], ["search_fulltext"]]
    result, _ = _run(rounds, max_tool_rounds=2, bonus=3)
    searches = [e["tool"] for e in result.tool_trace].count("search_fulltext")
    assert searches == 2, f"检索轮没有按预算收口,跑了 {searches} 轮"


def test_computation_budget_is_finite():
    """计算预算也有限,不能无限循环算下去。"""
    rounds = [["search_fulltext"]] + [["calculate_expression"]] * 8
    result, _ = _run(rounds, max_tool_rounds=2, bonus=2)
    calcs = [e["tool"] for e in result.tool_trace].count("calculate_expression")
    # 预算内的 2 轮走 bonus,再多的那一轮把最后一点检索预算扣掉后收尾。
    assert calcs == 3, f"计算轮跑了 {calcs} 轮,应当被两份预算一起夹住"


def test_total_rounds_are_bounded_by_both_budgets():
    rounds = [["search_fulltext"], ["calculate_expression"], ["search_fulltext"],
              ["calculate_expression"], ["search_fulltext"], ["calculate_expression"]]
    result, script = _run(rounds, max_tool_rounds=2, bonus=2)
    # 2 轮检索 + 2 轮计算 + 最后收尾那一次调用
    assert script.calls <= 2 + 2 + 1, f"模型被调了 {script.calls} 次"


def test_without_the_bonus_a_calculation_round_spends_retrieval_budget():
    """bonus 关掉时退回原来的行为——这条保证开关真的有用。"""
    rounds = [["search_fulltext"], ["calculate_expression"], ["calculate_expression"]]
    result, _ = _run(rounds, max_tool_rounds=2, bonus=0)
    calcs = [e["tool"] for e in result.tool_trace].count("calculate_expression")
    assert calcs == 1, f"bonus=0 时计算轮没有计入检索预算(跑了 {calcs} 轮)"


def test_reported_rounds_reflect_what_actually_ran():
    """rounds 以前在耗尽分支报的是上限值,和实际轮数对不上。"""
    result, _ = _run(
        [["search_fulltext"], ["calculate_expression"]], max_tool_rounds=2, bonus=1,
    )
    assert result.rounds >= 2


def test_a_forced_finish_is_marked_incomplete():
    """轮次用尽时模型是被逼着收尾的,它写出来的话语气照常——不标出来没人看得出。"""
    rounds = [["search_fulltext"], ["search_fulltext"], ["search_fulltext"]]
    result, _ = _run(rounds, max_tool_rounds=2, bonus=0)
    assert result.incomplete_reason == "rounds_exhausted"


def test_a_normal_answer_carries_no_reason():
    """"这条回答是完整的"是默认,不该每次都说一遍。"""
    result, _ = _run([["search_fulltext"], []], max_tool_rounds=3, bonus=1)
    assert result.incomplete_reason == ""


def test_computation_rounds_delay_the_forced_finish():
    """算完再答不该被算成"提前收尾"。"""
    rounds = [["search_fulltext"], ["calculate_expression"], ["make_chart"], []]
    result, _ = _run(rounds, max_tool_rounds=2, bonus=3)
    assert result.incomplete_reason == ""
