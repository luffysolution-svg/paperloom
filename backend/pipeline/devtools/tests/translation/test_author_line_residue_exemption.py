"""作者署名行不该被 english_residue 判成"未翻译的英文"。

回归来源：job 20260916234056-b343d1 第 1 页的署名行

    Goncagül Serdaroğlu a,⁎, Nesimi Uludağ b, Erol Ercag b,
    Paramasivam Sugumar c,d, Parthasarathi Rajkumar e

5 次模型调用（尾队列 2 次 + raw fallback 1 次 + agent_repair 1 次 +
final_recovery 1 次）全部 HTTP 成功，全部被本地校验判 english_residue，
最终进死信并让导出门禁拒绝整份文档——130 个块里 129 个翻译成功却全部作废。

人名本就无法"译成中文"，`_looks_like_author_name_list` 正是为此存在的豁免，
但它对这一行失效，原因有两个且**必须同时修复**，只修一个仍然不通过：

1. `AUTHOR_NAME_TOKEN_RE` 的字符类只到 Latin-1 补充块（À-ÖØ-öø-ÿ），
   土耳其语的 ğ 落在类外；又因为该正则以 \\b 收尾，而 "Uluda|ğ" 两侧都是
   word 字符、构不成边界，于是姓名**整个匹配不上**——不是少匹配几个字符。
2. 隶属标记 "⁎" 与 "c,d" 里的 "d" 被逗号切成独立段，既拉高 len(segments)，
   又把 `>= len(segments) - 1` 的门槛一起抬高（实测 7 段 / 门槛 6 / 合格 5）。
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from retainpdf_pipeline.translate.llm.validation.english_residue import (
    _looks_like_author_name_list,
)
from retainpdf_pipeline.translate.llm.validation.quality import review_translation_item


JOB_B009_SOURCE = (
    "Goncagül Serdaroğlu a,⁎, Nesimi Uludağ b, Erol Ercag b, "
    "Paramasivam Sugumar c,d, Parthasarathi Rajkumar e"
)


def _body_item(source: str) -> dict:
    """署名行在 OCR 侧就被归成 body（provider_body_whitelist:text），
    拿不到 title/metadata 那层豁免，只能靠作者行识别。"""
    return {
        "item_id": "p001-b009",
        "page_idx": 0,
        "source_text": source,
        "protected_source_text": source,
        "translation_unit_protected_source_text": source,
        "block_kind": "text",
        "block_type": "text",
        "block_class": "body",
        "layout_role": "paragraph",
        "semantic_role": "body",
        "structure_role": "body",
        "should_translate": True,
        "policy_translate": True,
        "math_mode": "direct_typst",
        "classification_label": "",
        "skip_reason": "",
    }


def test_turkish_author_line_is_recognized_as_author_list() -> None:
    assert _looks_like_author_name_list(JOB_B009_SOURCE) is True


def test_turkish_author_line_produces_no_validation_error() -> None:
    # 模型原样返回署名行——人名没有中文译法，这是正确输出而非"未翻译"。
    review = review_translation_item(
        _body_item(JOB_B009_SOURCE),
        {"decision": "translate", "translated_text": JOB_B009_SOURCE},
    )
    errors = [issue for issue in review.issues if issue.severity == "error"]
    assert errors == [], f"署名行不应产生 error：{[(i.kind, i.message) for i in errors]}"


def test_author_lines_with_extended_latin_names() -> None:
    # Latin Extended-A 覆盖面：土耳其 ğ/ı/ş、波兰 ł/ń/ś、捷克 č/ř/ž。
    assert _looks_like_author_name_list(
        "Paweł Nowak a, Jiří Čermák b, Łukasz Wiśniewski c"
    ) is True
    assert _looks_like_author_name_list(
        "Gülşah Yıldırım 1, Şükrü Öztürk 2, Ayşe Çelik 3"
    ) is True


def test_affiliation_marks_do_not_inflate_segment_threshold() -> None:
    # 同一批作者，带与不带隶属标记必须判定一致；标记只是排版噪声。
    plain = "Goncagül Serdaroğlu, Nesimi Uludağ, Erol Ercag, Paramasivam Sugumar, Parthasarathi Rajkumar"
    assert _looks_like_author_name_list(plain) is True
    assert _looks_like_author_name_list(JOB_B009_SOURCE) is True

    # 通讯作者标记的各种写法都不该把段数撑大。
    assert _looks_like_author_name_list(
        "John Smith a,∗, Mary Jones b,†, Peter Brown c,‡"
    ) is True


def test_non_author_text_stays_unexempted() -> None:
    # 豁免不能宽到吞掉真正需要翻译的英文正文。
    assert _looks_like_author_name_list(
        "The synthesis of carbazole derivatives was carried out under mild "
        "conditions, and the products were characterized by spectroscopic methods."
    ) is False
    # 带邮箱的行按既有规则整体不豁免。
    assert _looks_like_author_name_list(
        "John Smith a, Mary Jones b, corresponding@univ.edu"
    ) is False
    assert _looks_like_author_name_list(
        "J. Am. Chem. Soc. 2021, 143, 12345-12350, doi 10.1021/jacs.1c01234"
    ) is False
