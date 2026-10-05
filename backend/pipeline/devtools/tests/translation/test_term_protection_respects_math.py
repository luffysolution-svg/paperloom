"""术语保护不许伸进公式里。

term_pattern 的词边界是 `[A-Za-z0-9_]`,`{`/`}`/`(`/`)` 全都算边界。于是术语 `Si`
会在 `$\\mathrm{Si}_2\\mathrm{O}$` 内部命中,两种级别各有各的坏法:

- canonical 还原时填的是译名 → `$\\mathrm{硅}_2\\mathrm{O}$`,中文进了公式,渲染器
  要么报错要么把中文排进数学。
- preserve 内容最终不变,但中间态把 `<t1-9e7/>` 暴露在 `$...$` 里——正是模型会把
  尖括号当成 `\\langle`/`\\rangle` 改写的那个形状。真实事故里 `<f5-4bb/>` 被写成
  `\\langle f5-4bb\\rangle`,还原匹配不上,整段公式内容凭空消失。

也就是说:刚删掉的那套「按 OCR span 锁公式」的风险面,会被术语保护原样重建一遍。

现在 glossaries 表是空的,所以这条路暂时不触发。这些用例钉的是「开始用术语表功能
的那一天」——那时候没人会想起来这里。
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from retainpdf_pipeline.translate.core.payload.term_protection import (  # noqa: E402
    collect_term_spans,
    protect_glossary_terms,
)
from retainpdf_pipeline.translate.core.payload.token_protection import (  # noqa: E402
    restore_protected_tokens,
)

SOURCE = r"The film $\mathrm{Si}_2\mathrm{O}$ is stable and Si is common."


def _entries(level: str) -> list[dict]:
    return [{"source": "Si", "target": "硅", "level": level}]


def test_a_canonical_term_never_lands_inside_a_formula() -> None:
    protected, protected_map = protect_glossary_terms(SOURCE, glossary_entries=_entries("canonical"))
    restored = restore_protected_tokens(protected, protected_map)

    assert r"$\mathrm{Si}_2\mathrm{O}$" in restored, f"译名被填进了公式：{restored}"
    assert "硅 is common" in restored, "正文里的术语没有被翻译"


def test_a_preserve_term_never_exposes_a_token_inside_a_formula() -> None:
    """preserve 的内容最终不变，坏的是中间态——那正是模型动手的地方。"""
    protected, _ = protect_glossary_terms(SOURCE, glossary_entries=_entries("preserve"))

    formula = protected[protected.index("$"): protected.rindex("$") + 1]
    assert "<t" not in formula, f"token 被暴露在公式里：{formula}"


def test_terms_outside_formulas_are_still_protected() -> None:
    """别把保护修没了——公式外的术语仍然要锁。"""
    protected, protected_map = protect_glossary_terms(SOURCE, glossary_entries=_entries("canonical"))

    assert protected_map, "公式外的术语也没保护"
    assert len(protected_map) == 1, f"应当只保护公式外的那一次：{protected_map}"


def test_span_collection_skips_math_regions() -> None:
    spans = collect_term_spans(SOURCE, _entries("canonical"))
    math_start = SOURCE.index("$")
    math_end = SOURCE.rindex("$") + 1

    assert spans, "一个术语跨度都没收集到"
    for span in spans:
        assert not (span.start < math_end and math_start < span.end), (
            f"跨度 {span.start}-{span.end} 落在公式区间 {math_start}-{math_end} 内"
        )
