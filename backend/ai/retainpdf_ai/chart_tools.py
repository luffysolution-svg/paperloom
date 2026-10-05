"""把一组数据变成回答里的图表块。

模型给**数据 + 图表类型**，不给 SVG:模型画的图坐标和比例都靠它自己算，不可靠;而且
那是一段要塞进页面的标记,等于给注入开一道门。规格由前端自己渲染。

这里的校验规则必须和前端 `chart-spec.ts` 的 `parseChartSpec` 对齐——两边不一致的后果
是这边说"好了"、前端拒绝作图,用户看到的是一段 JSON。tests/test_chart_tools.py 里钉了
两边共有的那几条边界。
"""

from __future__ import annotations

import json
from typing import Any

from .tools import Tool

CHART_FENCE_LANGUAGE = "retainpdf-chart"
CHART_KINDS = ("bar", "line", "pie")
MAX_SERIES = 6
MAX_POINTS = 40

CHART_TOOL_NAMES = frozenset({"make_chart"})


def _finite(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value) if value == value and value not in (float("inf"), float("-inf")) else None
    if isinstance(value, str) and value.strip():
        try:
            parsed = float(value)
        except ValueError:
            return None
        return parsed if parsed == parsed and parsed not in (float("inf"), float("-inf")) else None
    return None


def _text(value: Any, fallback: str = "") -> str:
    text = f"{value if value is not None else ''}".strip()
    return text or fallback


def _normalize_points(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    points: list[dict[str, Any]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        value = _finite(entry.get("value", entry.get("y")))
        # 缺值的点丢掉而不是补 0:补 0 会在图上凭空造出一个"这里是零"的结论。
        if value is None:
            continue
        points.append({
            "label": _text(entry.get("label", entry.get("x")), str(len(points) + 1)),
            "value": value,
        })
        if len(points) >= MAX_POINTS:
            break
    return points


def _normalize_series(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    series: list[dict[str, Any]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        points = _normalize_points(entry.get("points", entry.get("data")))
        if not points:
            continue
        series.append({"name": _text(entry.get("name"), f"系列 {len(series) + 1}"), "points": points})
        if len(series) >= MAX_SERIES:
            break
    return series


def make_chart(arguments: dict[str, Any]) -> dict[str, Any]:
    kind = _text(arguments.get("kind", arguments.get("type"))).lower()
    if kind not in CHART_KINDS:
        return {"error": f"kind must be one of {', '.join(CHART_KINDS)}"}

    series = _normalize_series(arguments.get("series"))
    if not series:
        return {"error": "series must contain at least one entry with numeric points"}
    # 饼图只有一个系列有意义,多给了取第一个而不是叠着画。
    if kind == "pie":
        series = series[:1]

    spec: dict[str, Any] = {"kind": kind, "series": series}
    for key, source in (("title", "title"), ("xLabel", "x_label"), ("yLabel", "y_label")):
        text = _text(arguments.get(source, arguments.get(key)))
        if text:
            spec[key] = text

    body = json.dumps(spec, ensure_ascii=False)
    return {
        "markdown": f"```{CHART_FENCE_LANGUAGE}\n{body}\n```",
        "series_count": len(series),
        "point_count": sum(len(s["points"]) for s in series),
        "dropped_points": _dropped(arguments, series),
    }


def _dropped(arguments: dict[str, Any], series: list[dict[str, Any]]) -> int:
    """被丢掉的点数。模型据此知道自己给的数据有没有缺值,而不是默默少几根柱子。"""
    raw = arguments.get("series")
    if not isinstance(raw, list):
        return 0
    given = 0
    for entry in raw:
        if isinstance(entry, dict):
            points = entry.get("points", entry.get("data"))
            if isinstance(points, list):
                given += len(points)
    kept = sum(len(s["points"]) for s in series)
    return max(0, given - kept)


def chart_tools() -> list[Tool]:
    return [
        Tool(
            name="make_chart",
            description=(
                "把一组数据变成回答里可以直接显示的图表。给数据和图表类型,不要自己写 SVG。"
                "返回的 markdown 字段原样粘进回答即可,不要改动其中的内容。"
                "适用于对比几组数值、展示随页码/时间变化的趋势、或呈现占比。"
                "数据必须来自文档检索结果或 calculate_* 的返回,不要凭印象填数。"
            ),
            parameters={
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "kind": {"type": "string", "enum": list(CHART_KINDS)},
                    "title": {"type": "string", "maxLength": 80},
                    "x_label": {"type": "string", "maxLength": 40},
                    "y_label": {"type": "string", "maxLength": 40},
                    "series": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": MAX_SERIES,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "name": {"type": "string", "maxLength": 40},
                                "points": {
                                    "type": "array",
                                    "minItems": 1,
                                    "maxItems": MAX_POINTS,
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "label": {"type": "string", "maxLength": 40},
                                            "value": {"type": "number"},
                                        },
                                        "required": ["label", "value"],
                                    },
                                },
                            },
                            "required": ["name", "points"],
                        },
                    },
                },
                "required": ["kind", "series"],
            },
            handler=make_chart,
        ),
    ]
