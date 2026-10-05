"""Conservative host-owned routing for ``assistant_mode=auto``."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ResolvedAssistantMode = Literal["reading", "operations"]
ContentSource = Literal["structured", "markdown", "none", "unscoped", "unknown"]

_OPERATION_ID_RE = re.compile(r"\bop-[a-z0-9-]{8,}\b", re.IGNORECASE)

# 明确的页面指代。改文档的指令总要说清改哪一页;泛指的「文档」「PDF」「页面」不算,
# 因为「文档里提取了哪些关键结论」这类纯阅读问题也会带上它们。
_PAGE_OBJECT = (
    r"(?:第?\s*[一二三四五六七八九十百\d]+\s*页|最后一页|首页|封面页|"
    r"pages?\s*\d+|last\s+page|first\s+page|cover\s+page)"
)
# 只作用于整份文档的动作,不需要页码。
_WHOLE_DOCUMENT_OBJECT = r"(?:PDF|文档|页面|document|pages?)"

# 祈使式的变异动词。
#
# 承重的不是这张表，是上面那条「必须配明确页码」——实测把泛指的文档/PDF/页面放回
# 页面宾语，三条阅读用例立刻变红；而把窗口从 6/12 放宽回 20/30、去掉下面的 `(?!线)`，
# 测试全绿。也就是说窗口宽度和 `删除线` 守卫都是纵深防御，不是修复本身。
#
# 收窄窗口仍然留着:真实指令里动宾紧挨着（「删除第3页」「把第3页删掉」），宽窗口
# 只会在将来往表里加词时放大误判面。
_PAGE_ACTION = r"(?:旋转|翻转|删除(?!线)|删掉|去掉|移除|重排|重新排序|裁剪|提取|导出)"
_PAGE_ACTION_EN = r"(?:rotate|delete|remove|reorder|crop|extract|export)"
# 「转个方向」这类说法里 `转` 单独出现风险太大（转换/转录/转折），只认成型搭配。
_TURN_ACTION = r"(?:转\s*(?:个|一下)?\s*(?:方向|角度)|转向)"

_OPERATION_ACTION_RE = re.compile(
    r"(?:"
    # 动词 ↔ 明确页码，双向，紧邻
    rf"{_PAGE_ACTION}.{{0,6}}{_PAGE_OBJECT}|"
    rf"{_PAGE_OBJECT}.{{0,6}}(?:{_PAGE_ACTION}|{_TURN_ACTION})|"
    rf"{_PAGE_ACTION_EN}.{{0,12}}{_PAGE_OBJECT}|"
    rf"{_PAGE_OBJECT}.{{0,12}}{_PAGE_ACTION_EN}|"
    # 整份文档级动作:这些动词本身不会出现在阅读问题里
    rf"(?:拆分|合并|加密|解密).{{0,6}}{_WHOLE_DOCUMENT_OBJECT}|"
    rf"{_WHOLE_DOCUMENT_OBJECT}.{{0,6}}(?:拆分|合并|加密|解密)|"
    r"(?:split|merge|encrypt|decrypt).{0,12}(?:pdf|document|pages?)|"
    r"(?:pdf|document|pages?).{0,12}(?:split|merge|encrypt|decrypt)|"
    # 水印:动词在哪一侧都算
    r"(?:加|添加|去掉|移除|删除|删掉).{0,6}水印|水印.{0,6}(?:去掉|移除|删除|删掉)|"
    r"(?:add|remove|strip).{0,12}watermark|watermark.{0,12}(?:removal|removed)"
    r")",
    re.IGNORECASE,
)
_EXISTING_OPERATION_ACTION_RE = re.compile(
    # 双向。此前只认「动词在前」，于是「运行 op-xxxx」判 operations 而
    # 「op-xxxx 执行一下」判 reading，同一件事两种结果。
    r"(?:确认)?(?:运行|执行|提交|取消|重试).{0,24}(?:操作|候选|op-)|"
    r"(?:操作|候选|op-).{0,24}(?:运行|执行|提交|取消|重试)|"
    r"(?:run|commit|cancel|retry).{0,24}(?:operation|candidate|op-)|"
    r"(?:operation|candidate|op-).{0,24}(?:run|commit|cancel|retry)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class RouteDecision:
    requested_mode: str
    resolved_mode: ResolvedAssistantMode
    reason: str


def resolve_assistant_mode(requested_mode: str, question: str) -> RouteDecision:
    """Honor explicit modes and let ambiguous auto requests fail safe to reading."""
    requested = requested_mode.strip().lower() or "auto"
    if requested in {"reading", "operations"}:
        return RouteDecision(requested, requested, "explicit")  # type: ignore[arg-type]
    normalized = " ".join(question.strip().split())
    if _OPERATION_ACTION_RE.search(normalized):
        return RouteDecision("auto", "operations", "document_mutation_intent")
    if _OPERATION_ID_RE.search(normalized) and _EXISTING_OPERATION_ACTION_RE.search(
        normalized
    ):
        return RouteDecision("auto", "operations", "operation_control_intent")
    return RouteDecision("auto", "reading", "safe_reading_default")
