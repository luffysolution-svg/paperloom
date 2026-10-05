"""模型编的引用编号不该让我们替它补一批无关引用。

`referenced_citations` 在正文里找不到有效的 `[n]` 时会兜底:按页去重取前几条。这是给
「模型给了回答却忘了标注」准备的——聊胜于无。

但同一个条件也会命中「模型写了 `[42]`、而 citations 里只有 1–4」:编号无效被跳过，
selected 为空，于是走兜底。结果是正文写着 `[42]`、脚注却列着三条它根本没引用的块。
凭空造出来的依据比没有依据更糟——用户会以为那三条支持了这句话。

正文里那个 `[42]` 不动。学术文档里方括号数字很可能是**原文自己的**参考文献编号，
按形状删除会破坏内容。
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.agent_evidence import Citation, referenced_citations  # noqa: E402


def _citation(ref: int, page_idx: int) -> Citation:
    fields = {}
    for name, parameter in inspect.signature(Citation).parameters.items():
        if name == "ref":
            fields[name] = ref
        elif name == "page_idx":
            fields[name] = page_idx
        elif name == "block_id":
            fields[name] = f"p{page_idx + 1:03d}-b0001"
        elif parameter.default is not inspect.Parameter.empty:
            continue
        else:
            fields[name] = ""
    return Citation(**fields)


CITATIONS = {ref: _citation(ref, ref) for ref in (1, 2, 3, 4)}


def test_a_fabricated_marker_does_not_invent_citations() -> None:
    picked = referenced_citations("模型自信地说了一个结论 [9]。", CITATIONS)
    assert picked == [], f"凭空补了 {len(picked)} 条无关引用"


def test_no_marker_at_all_still_falls_back() -> None:
    """忘了标注时的兜底保持不变——这是它本来要解决的问题。"""
    picked = referenced_citations("一段没有任何标注的回答。", CITATIONS)
    assert picked, "兜底被一起改没了"


def test_valid_markers_win_and_keep_reading_order() -> None:
    picked = referenced_citations("先看 [3]，再看 [1]。", CITATIONS)
    assert [c.ref for c in picked] == [3, 1]


def test_a_mix_keeps_only_the_valid_ones() -> None:
    """有效和编造的混在一起时，按有效的来，不走兜底。"""
    picked = referenced_citations("见 [2] 与 [9]。", CITATIONS)
    assert [c.ref for c in picked] == [2]


def test_the_answer_text_is_not_rewritten() -> None:
    """这个函数只挑引用，不动正文——正文里的 [42] 可能是原文自己的参考文献编号。"""
    answer = "根据文献 [42] 的结论。"
    referenced_citations(answer, CITATIONS)
    assert answer == "根据文献 [42] 的结论。"


def test_no_citations_at_all_is_empty() -> None:
    assert referenced_citations("随便什么回答 [1]。", {}) == []
