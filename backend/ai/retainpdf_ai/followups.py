"""一轮回答结束之后,产出几条值得接着问的问题。

**为什么是「结束后单独跑一次」,而不是让主回答那一轮顺带产出**

顺带产出能省一次调用,但这条路在本仓库走不通:主回答是**边生成边推给浏览器**的
(agent_llm 的 on_delta -> SSE answer_delta),而建议要跟着 done 事件走。只要建议出现在
同一条 assistant message 的正文里,它在被清洗之前就已经流到用户屏幕上了——正文流出去
就改不掉(agent_llm 里那段注释说的就是这件事),而 sanitize_answer_text 不能动。

把它做成一个工具(像 chart_tools 那样)可以绕开正文,但代价更实在:工具调用要占掉
reading 模式总共只有 3 轮的预算里的一轮,直接和检索抢;而且模型可能压根不调,功能变成
看运气。它还得在写最终回答**之前**决定追问什么。

所以这里的取舍是:多一次调用、done 事件晚一点,换来

* 建议**结构上**不可能混进正文或 citations:这次调用用的是另一条 **没有 on_delta 的**
  transport,没有推流的出口,产物只进 AskResult.followups,不经过答案清洗那条路;
* 不占检索轮数,也不依赖模型主动调工具;
* 一份实现覆盖所有 runtime——写在编排层,而不是每个 runtime 里各抄一遍。

代价是实打实的:done 会晚一次模型往返。所以没有证据的轮次(闲聊、连通性测试)直接跳过,
一分钱不花;快到 deadline 了也跳过;这次调用失败绝不能影响一轮**已经完成**的问答。
"""

from __future__ import annotations

import inspect
import json
import logging
import re
from typing import Any

LOGGER = logging.getLogger(__name__)

MAX_FOLLOWUPS = 3
# 提示词里要的是「不超过 40 字」。这里放宽到 80 是留给模型的余量:超出就丢,不截断——
# 截一半的句子既不成问句,点开也问不出东西。
MAX_FOLLOWUP_CHARS = 80
MIN_FOLLOWUP_CHARS = 8
# 留给这次调用的最小余量。deadline 只剩几秒时宁可不给建议,也不能让它把一轮已经答完的
# 问答拖进超时。
MIN_REMAINING_SECONDS = 5.0

_CITATION_RE = re.compile(r"\[\d+\]")
_LIST_PREFIX_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)、])\s*")
# 整串匹配,不是包含匹配。包含匹配会误伤正常问句:
# 「这份报告需要我们关注哪些指标?」里有「需要我」,但它显然不是空话。
_FILLER_RE = re.compile(
    r"^(?:"
    r"(?:您|你)?还有(?:什么|其他|别的|哪些)(?:问题|疑问|想问的)?(?:吗|呢)?"
    r"|(?:您|你)?还(?:想|需要|要)(?:了解|知道|问)(?:什么|点什么|其他|别的)?(?:吗|呢)?"
    r"|需要(?:我)?(?:继续|进一步|再)?(?:说明|解释|补充|展开|帮忙)(?:吗|什么|些什么)?"
    r"|(?:我)?(?:还)?能(?:为(?:您|你))?做(?:些)?什么"
    r"|其他(?:问题|疑问)"
    r"|anything else"
    r"|any (?:other|more|further) questions?"
    r"|what else(?: (?:do you|would you like to) know)?"
    r"|do you have any (?:other |more )?questions?"
    r")[\s]*[?？.。!！]*$",
    re.IGNORECASE,
)

_SYSTEM_PROMPT = """你在一个 PDF 文档问答产品里,为刚刚结束的一轮问答生成「接着可以问什么」。

规则:
1. 只输出一个 JSON 数组,不要解释、不要代码围栏。例如:["……?", "……?"]
2. 最多 3 条。宁可少给,也不要凑数;没有值得追问的就输出 []。
3. 每条都是一个问句,以问号结尾,不超过 40 字。
4. 每条都要落在下面给出的证据上:问那些文档里有材料、而这次回答没有展开的具体内容
   (某个数字是怎么算出来的、某个方法和另一个的差别、某一节的结论等)。
5. 不要写「还有什么问题吗」「需要我继续吗」这类空话;不要重复用户刚问过的问题;
   不要问文档之外的常识。
6. 用和用户提问相同的语言。"""


def has_evidence(result: Any) -> bool:
    """这一轮到底用没用上文档里的东西。

    没有证据就不该给建议——那种轮次(闲聊、连通性测试、被护栏挡下的回答)能编出来的
    只有空话。这也是省掉那次调用的判据:先问这个,再决定要不要建 transport。
    """
    if list(getattr(result, "citations", None) or []):
        return True
    for entry in getattr(result, "tool_trace", None) or []:
        if not isinstance(entry, dict):
            continue
        # retrieval_agent 的 trace 条目不带 status(它只记成功调用),openai runtime 带。
        # 缺省当成功,否则前者会被整体当成「没有证据」。
        if str(entry.get("status") or "completed") == "completed":
            return True
    return False


def normalize_followups(values: Any) -> list[str]:
    """把一组候选清洗成可以直接下发的建议。

    模型侧的产物和 runtime 自己填的 AskResult.followups 走同一道闸:形状、长度、空话
    判定只有一处,不会出现「某条路径没过滤」。
    """
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values if isinstance(values, list) else []:
        text = _clean_one(value)
        if text is None:
            continue
        key = re.sub(r"[\s?？!！.。,，]", "", text).casefold()
        if not key or key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
        if len(cleaned) >= MAX_FOLLOWUPS:
            break
    return cleaned


def parse_followups(raw: str) -> list[str]:
    """从模型返回的正文里取出建议。解析不出来就当没有。"""
    return normalize_followups(_json_array(raw))


def generate_followups(
    chat: Any,
    *,
    question: str,
    result: Any,
    request_control: Any | None = None,
) -> list[str]:
    """跑一次轻量调用产出建议。任何一处不顺就返回空列表。

    这一轮的问答**已经答完了**。建议是锦上添花,不能反过来把它弄失败:所以这里吞掉
    所有异常(包括超时和取消),最坏的结果只是没有建议。
    """
    if not callable(chat):
        return []
    if not has_evidence(result):
        return []
    if request_control is not None:
        # 用户已经走了、或者 deadline 只剩几秒:这次调用要么没人看,要么会把一轮**已经
        # 答完**的问答拖进超时。两种情况都不值得再花一次 token。
        if getattr(request_control, "cancelled", False):
            return []
        if (
            getattr(request_control, "remaining_seconds", MIN_REMAINING_SECONDS)
            < MIN_REMAINING_SECONDS
        ):
            return []
    try:
        message = _call_chat(chat, _build_messages(question, result))
    except Exception:  # noqa: BLE001 - 见 docstring:建议失败不能影响已完成的一轮
        LOGGER.debug("followup suggestion call failed", exc_info=True)
        return []
    if not isinstance(message, dict):
        return []
    return parse_followups(str(message.get("content") or ""))


def _clean_one(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = _LIST_PREFIX_RE.sub("", value.strip())
    # 建议是要塞进输入框重新发一次的,带着 [1] 这种编号没有意义——下一轮的编号不是这个。
    text = _CITATION_RE.sub("", text)
    text = re.sub(r"\s+", " ", text).strip().strip('"“”')
    if not text.endswith(("?", "？")):
        # 只收问句。陈述句("对比两种方法的收敛速度")点下去是一条指令不是追问,
        # 而且模型一旦开始输出散文,通常整批都不能用——宁可一条不给。
        return None
    if not MIN_FOLLOWUP_CHARS <= len(text) <= MAX_FOLLOWUP_CHARS:
        return None
    if _FILLER_RE.match(text):
        return None
    return text


def _json_array(raw: str) -> list[Any]:
    text = str(raw or "").strip()
    if not text:
        return []
    # 只切第一个 [ 到最后一个 ] 之间的部分:代码围栏、"好的,建议如下:"这类前言都被
    # 一并跳过,不用单独认它们。
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end <= start:
        return []
    try:
        parsed = json.loads(text[start : end + 1])
    except (ValueError, TypeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _build_messages(question: str, result: Any) -> list[dict[str, Any]]:
    user = "\n".join(
        [
            f"用户这一轮问的是:{str(question or '').strip()[:300]}",
            "",
            "助手的回答(节选):",
            str(getattr(result, "answer", "") or "")[:1200],
            "",
            "这一轮实际用到的证据:",
            _evidence_digest(result),
        ]
    )
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def _evidence_digest(result: Any) -> str:
    lines: list[str] = []
    for citation in list(getattr(result, "citations", None) or [])[:6]:
        snippet = re.sub(r"\s+", " ", str(getattr(citation, "snippet", "") or "")).strip()
        if not snippet:
            continue
        page_idx = getattr(citation, "page_idx", None)
        page = f"第 {page_idx + 1} 页" if isinstance(page_idx, int) else "未知页"
        lines.append(f"- [{page}] {snippet[:160]}")
    tools = []
    for entry in getattr(result, "tool_trace", None) or []:
        if isinstance(entry, dict):
            name = str(entry.get("tool") or "").strip()
            if name and name not in tools:
                tools.append(name)
    if tools:
        lines.append(f"- 本轮用到的工具:{'、'.join(tools[:8])}")
    return "\n".join(lines) or "(无)"


def _call_chat(chat: Any, messages: list[dict[str, Any]]) -> Any:
    """能关推流就关。

    编排层给进来的本来就是一条没有 on_delta 的 transport,压根没有推流的出口;这里再关
    一次是第二道闸——万一以后有人图省事把主回答那条流式 transport 传进来,建议也不会被
    当成正文吐给用户。chat_fn 是可插拔的,所以先看签名认不认这个关键字。
    """
    try:
        supported = frozenset(inspect.signature(chat).parameters)
    except (TypeError, ValueError):
        supported = frozenset()
    if "stream_answer" in supported:
        return chat(messages, [], stream_answer=False)
    return chat(messages, [])
