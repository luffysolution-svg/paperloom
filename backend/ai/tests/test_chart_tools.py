"""图表工具。

模型给数据和图表类型,工具校验并返回可直接粘进回答的围栏块;SVG 由前端自己画。

最容易出问题的不是画得好不好看,而是**两端的校验规则漂移**:这边接受了、前端
`chart-spec.ts` 的 parseChartSpec 拒绝,用户看到的就是一段 JSON 而不是图。所以这里钉的
边界都是两边共有的那几条,前端同名测试在 frontend/web/tests/reader/answer-chart.test.mjs。
"""

from __future__ import annotations

import json

import pytest

from retainpdf_ai.chart_tools import (
    CHART_FENCE_LANGUAGE,
    CHART_KINDS,
    MAX_POINTS,
    MAX_SERIES,
    make_chart,
)


def _spec(result: dict) -> dict:
    """从返回的围栏块里取出 JSON。"""
    markdown = result["markdown"]
    body = markdown.split("\n", 1)[1].rsplit("\n```", 1)[0]
    return json.loads(body)


def _bar(**extra):
    payload = {
        "kind": "bar",
        "series": [{"name": "耗时", "points": [
            {"label": "信赖域", "value": 12},
            {"label": "线搜索", "value": 7},
        ]}],
    }
    payload.update(extra)
    return payload


@pytest.mark.parametrize("kind", CHART_KINDS)
def test_accepts_every_supported_kind(kind):
    result = make_chart(_bar(kind=kind))
    assert _spec(result)["kind"] == kind


def test_returns_a_fenced_block_the_model_can_paste_verbatim():
    markdown = make_chart(_bar())["markdown"]
    assert markdown.startswith(f"```{CHART_FENCE_LANGUAGE}\n")
    assert markdown.endswith("\n```")


def test_unknown_kind_is_refused():
    assert "error" in make_chart(_bar(kind="甘特图"))


def test_missing_kind_is_refused():
    assert "error" in make_chart({"series": _bar()["series"]})


def test_series_without_numeric_points_is_refused():
    assert "error" in make_chart({"kind": "bar", "series": []})
    assert "error" in make_chart({"kind": "bar", "series": [{"name": "空", "points": []}]})


def test_points_missing_a_value_are_dropped_and_counted():
    """补 0 会在图上凭空造出一个"这里是零"的结论,所以丢掉——但要告诉模型丢了几个。"""
    result = make_chart({"kind": "bar", "series": [{"name": "a", "points": [
        {"label": "甲", "value": 3},
        {"label": "乙"},
        {"label": "丙", "value": 5},
    ]}]})
    assert [p["label"] for p in _spec(result)["series"][0]["points"]] == ["甲", "丙"]
    assert result["dropped_points"] == 1


def test_non_numeric_values_are_dropped():
    result = make_chart({"kind": "bar", "series": [{"name": "a", "points": [
        {"label": "甲", "value": "abc"},
        {"label": "乙", "value": "3.5"},
    ]}]})
    points = _spec(result)["series"][0]["points"]
    assert [p["label"] for p in points] == ["乙"]
    assert points[0]["value"] == 3.5


def test_booleans_are_not_numbers():
    """Python 里 True 是 1,当成数值会把一个布尔悄悄画成柱子。"""
    assert "error" in make_chart({"kind": "bar", "series": [
        {"name": "a", "points": [{"label": "甲", "value": True}]},
    ]})


def test_series_and_points_are_capped():
    payload = {"kind": "line", "series": [
        {"name": f"s{i}", "points": [{"label": str(j), "value": j} for j in range(MAX_POINTS + 10)]}
        for i in range(MAX_SERIES + 4)
    ]}
    spec = _spec(make_chart(payload))
    assert len(spec["series"]) == MAX_SERIES
    assert len(spec["series"][0]["points"]) == MAX_POINTS


def test_pie_keeps_only_the_first_series():
    spec = _spec(make_chart({"kind": "pie", "series": [
        {"name": "a", "points": [{"label": "甲", "value": 1}]},
        {"name": "b", "points": [{"label": "乙", "value": 2}]},
    ]}))
    assert len(spec["series"]) == 1


def test_optional_labels_are_only_emitted_when_given():
    bare = _spec(make_chart(_bar()))
    assert "title" not in bare and "xLabel" not in bare

    labelled = _spec(make_chart(_bar(title="耗时", x_label="方法", y_label="秒")))
    assert labelled["title"] == "耗时"
    assert labelled["xLabel"] == "方法"
    assert labelled["yLabel"] == "秒"


def test_spec_is_json_the_frontend_can_parse():
    """围栏块里必须是合法 JSON——前端解析失败就退回代码块,图没了。"""
    spec = _spec(make_chart(_bar(title='带"引号"的标题')))
    assert spec["title"] == '带"引号"的标题'


def test_chart_tool_is_registered_under_a_stable_name():
    from retainpdf_ai.chart_tools import chart_tools

    names = {tool.name for tool in chart_tools()}
    assert names == {"make_chart"}
