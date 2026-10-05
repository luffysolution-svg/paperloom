from __future__ import annotations

import re


EN_WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)?")
SHORT_FRAGMENT_RE = re.compile(r"^[A-Za-z][A-Za-z0-9._/-]{0,7}$")
EN_RESIDUE_SEGMENT_RE = re.compile(r"[A-Za-z][A-Za-z0-9\s,;:()'./%+-]{30,}")
# 姓名词。字符类必须覆盖 Latin Extended-A（U+0100–U+017F），否则土耳其语的
# ğ/ı/ş、波兰语的ł/ń、捷克语的 č/ř 这些字母会落在类外——而末尾的 \b 在
# "Uluda|ğ" 之间不成立（两侧都是 word 字符），于是整个姓名**一个都匹配不上**。
# 实测：旧式 À-ÖØ-öø-ÿ 下 "Nesimi Uludağ" 只认出 "Nesimi"，"Goncagül Serdaroğlu"
# 只认出 "Goncagül"，作者行豁免因此失效，署名块被当成未翻译的英文正文。
AUTHOR_NAME_TOKEN_RE = re.compile(
    r"\b(?:[A-Z]\.\s*)?[A-ZÀ-ÖØ-Þ\u0100-\u017F][A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u017F'`´.-]{1,}\b"
)
EN_CHUNK_RE = re.compile(r"[A-Za-z][A-Za-z0-9'./%+\-]*(?:\s+[A-Za-z][A-Za-z0-9'./%+\-]*)*")


def zh_char_count(text: str) -> int:
    return sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")


def english_word_count(text: str) -> int:
    return len(EN_WORD_RE.findall(text or ""))


def looks_like_short_fragment_text(text: str) -> bool:
    stripped = text.strip()
    if not stripped or " " in stripped:
        return False
    return bool(SHORT_FRAGMENT_RE.fullmatch(stripped))


def english_chunk_word_lengths(text: str) -> list[int]:
    lengths: list[int] = []
    for match in EN_CHUNK_RE.finditer(text or ""):
        segment = " ".join((match.group(0) or "").split())
        if not segment:
            continue
        word_count = english_word_count(segment)
        if word_count > 0:
            lengths.append(word_count)
    return lengths


__all__ = [
    "AUTHOR_NAME_TOKEN_RE",
    "EN_RESIDUE_SEGMENT_RE",
    "EN_WORD_RE",
    "english_chunk_word_lengths",
    "english_word_count",
    "looks_like_short_fragment_text",
    "zh_char_count",
]
