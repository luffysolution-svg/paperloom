"""流式清洗的结果必须逐字等于批量清洗。

这是「边流边清洗」这个方案能成立的唯一前提。流式路径上已推给浏览器的文本改不掉
（AI SDK 6 没有 reset-step），所以流出去的必须**就是**最终文本；差一个字符，前端的
`startsWith` 判据就不成立，整份清洗结果被丢弃，用户看到未清洗原文。

风险不在于增量算法本身，而在于**两份实现漂移**——一份给流式、一份给最终答案，改了
一边忘了另一边。所以增量器内部调的就是批量函数，而这个文件用随机切分点把
「增量 == 批量」钉死:切法由伪随机决定，种子固定，一旦哪天有人把增量逻辑写成独立的
一套，这里就会红。
"""

from __future__ import annotations

import inspect
import random
import sys
from pathlib import Path

import pytest

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.agent_evidence import (  # noqa: E402
    Citation,
    StreamingAnswerSanitizer,
    sanitize_answer_text,
)


def _citation(ref: int, block_id: str) -> Citation:
    fields = {}
    for name, parameter in inspect.signature(Citation).parameters.items():
        if name == "ref":
            fields[name] = ref
        elif name == "block_id":
            fields[name] = block_id
        elif parameter.default is not inspect.Parameter.empty:
            continue
        else:
            fields[name] = ""
    return Citation(**fields)


CITATIONS = {
    1: _citation(1, "p002-b0004"),
    2: _citation(2, "p008-b0001"),
}

# 每条都针对一类会破坏前缀关系的清洗动作。
ANSWERS = [
    "结论见 [p002-b0004] 所述，另见 [p008-b0001]。",
    "裸标识符 p002-b0004 也要映射",
    "无法映射的 [p009-b0009] 会被删掉",
    "正文  有   多余空格，还有行尾空格   \n下一行",
    "```python\ndef f():\n    if x:\n        return 1\n```\n代码之外 [p002-b0004]",
    "行内 `code p002-b0004` 不动，正文 [p002-b0004] 要动",
    "机型 MD-11 与引脚 P1-B2 都是正文",
    "混合：[p002-b0004] 后接  多空格  与 `inline code` 与裸 p008-b0001。",
    "纯中文回答，没有任何标识符或多余空格。",
    "",
]


def _stream(answer: str, chunks: list[str]) -> tuple[str, StreamingAnswerSanitizer]:
    sanitizer = StreamingAnswerSanitizer(CITATIONS)
    out = [sanitizer.feed(chunk) for chunk in chunks]
    out.append(sanitizer.flush())
    return "".join(out), sanitizer


def _random_chunks(text: str, rng: random.Random) -> list[str]:
    if not text:
        return []
    cuts = sorted(rng.sample(range(1, len(text) + 1), k=min(len(text), rng.randint(1, 8))))
    chunks = []
    previous = 0
    for cut in cuts:
        chunks.append(text[previous:cut])
        previous = cut
    if previous < len(text):
        chunks.append(text[previous:])
    return chunks


@pytest.mark.parametrize("answer", ANSWERS, ids=lambda s: (s[:22] or "empty"))
def test_streaming_matches_batch_for_single_chunk(answer: str) -> None:
    streamed, sanitizer = _stream(answer, [answer] if answer else [])
    assert streamed == sanitize_answer_text(answer, CITATIONS)
    assert not sanitizer.diverged


@pytest.mark.parametrize("answer", ANSWERS, ids=lambda s: (s[:22] or "empty"))
def test_streaming_matches_batch_for_character_chunks(answer: str) -> None:
    """逐字符喂——最坏的切分方式，每个标记都被切碎。"""
    streamed, sanitizer = _stream(answer, list(answer))
    assert streamed == sanitize_answer_text(answer, CITATIONS)
    assert not sanitizer.diverged


@pytest.mark.parametrize("answer", ANSWERS, ids=lambda s: (s[:22] or "empty"))
def test_streaming_matches_batch_for_random_chunks(answer: str) -> None:
    rng = random.Random(20260918)
    for _ in range(40):
        streamed, sanitizer = _stream(answer, _random_chunks(answer, rng))
        assert streamed == sanitize_answer_text(answer, CITATIONS), (
            f"切分点不同导致结果不同：{answer!r}"
        )
        assert not sanitizer.diverged


def test_a_marker_split_across_chunks_is_still_mapped() -> None:
    """跨 delta 边界的标记是这套机制最容易出错的地方，单独钉一条。"""
    streamed, sanitizer = _stream(
        "见 [p002-b0004] 所述", ["见 [p002-", "b0004]", " 所述"]
    )
    assert streamed == "见 [1] 所述"
    assert not sanitizer.diverged


def test_nothing_is_emitted_twice() -> None:
    """推送必须是严格追加的——重复推送会在页面上出现重复文本。"""
    sanitizer = StreamingAnswerSanitizer(CITATIONS)
    pieces = [sanitizer.feed(chunk) for chunk in ["一段", "文字", " [p002-b0004]", " 结尾"]]
    pieces.append(sanitizer.flush())
    assert "".join(pieces) == sanitize_answer_text("一段文字 [p002-b0004] 结尾", CITATIONS)
