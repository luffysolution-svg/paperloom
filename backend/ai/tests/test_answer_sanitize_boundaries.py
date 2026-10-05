"""回答清洗不许吃掉正文。

`sanitize_answer_text` 的职责是把内部 block id 换成公开引用编号。它原本按**形状**
处理裸标识符,映射不到就删除,于是把正文一起吃了:

    机型 MD-11 与 MD-80 的对比   ->  机型 与 的对比
    引脚 P1-B2 接地             ->  引脚 接地
    参数 p2_b3 为常量            ->  参数 为常量

两个正则大小写不敏感又没有词表,机型号、引脚、料号、图表编号全都撞得上。

空白压缩同样没有代码段保护,把 Python 缩进和 Markdown 表格对齐压平。前端
sanitize-answer.ts 早就加了围栏/行内 code 抽出（注释写着「Python 缩进、表格对齐曾被
压成一行」），但**后端这份才是落库的权威文本**,前端再补也晚了。

现在的规则:
- `[p002-b0004]` 带方括号,明显是标记,映射不到就删。
- 裸的只在映射得到时才换,否则原样留着。代价是无法映射的内部 id 会留在正文里——
  看得见,但比静默删掉用户内容好得多。
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai.agent_evidence import Citation, sanitize_answer_text  # noqa: E402


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


CITATIONS = {1: _citation(1, "p002-b0004")}


def test_body_text_that_merely_looks_like_a_block_id_survives() -> None:
    for source in (
        "机型 MD-11 与 MD-80 的对比",
        "引脚 P1-B2 接地",
        "参数 p2_b3 为常量",
        "图表 MD-7 见附录",
    ):
        assert sanitize_answer_text(source, CITATIONS) == source, f"正文被吃掉了：{source}"


def test_code_indentation_is_preserved() -> None:
    """空白压缩会把 Python 缩进压平,而这是落库的权威文本。"""
    source = "```python\ndef f():\n    if x:\n        return 1\n```"
    assert sanitize_answer_text(source, CITATIONS) == source


def test_inline_code_is_preserved() -> None:
    source = "调用 `read_blocks(p002-b0004)` 即可"
    assert sanitize_answer_text(source, CITATIONS) == source


def test_a_real_marker_still_becomes_a_citation_number() -> None:
    assert sanitize_answer_text("结论见 [p002-b0004] 所述。", CITATIONS) == "结论见 [1] 所述。"
    assert sanitize_answer_text("裸的 p002-b0004 也要换", CITATIONS) == "裸的 [1] 也要换"


def test_an_unmapped_bracketed_marker_is_still_removed() -> None:
    """带方括号的明显是标记,映射不到就删——这条行为保持不变。"""
    assert sanitize_answer_text("无法映射的 [p009-b0009] 标记", CITATIONS) == "无法映射的 标记"


def test_prose_whitespace_is_still_collapsed() -> None:
    """代码之外的空白压缩保持原样,免得把这条修过头。"""
    assert sanitize_answer_text("正文  有   多余空格", CITATIONS) == "正文 有 多余空格"
