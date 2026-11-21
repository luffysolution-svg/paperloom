"""源文字清理的意图判定：哪些块的原文可以剥、哪些必须保留（公式、目录、页码等）。

从 test_bbox_text_strip_document.py 整块拆出，用例本身未改。
"""

from __future__ import annotations

from retainpdf_pipeline.render.source_cleanup.planning.intent_classifier import classify_source_cleanup_intent


def test_source_cleanup_intent_preserves_textual_formula_without_overlay() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ \mathrm{f=lateral friction for design speed} $$",
        }
    )

    assert intent.source_role == "textual_formula"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_strips_textual_formula_with_overlay() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ \mathrm{f=lateral friction for design speed} $$",
            "protected_translated_text": "f = 设计速度对应的侧向摩擦系数",
        }
    )

    assert intent.source_role == "textual_formula"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_classifies_math_formula_as_protect_source() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ E=mc^2 $$",
        }
    )

    assert intent.source_role == "math_formula"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_preserves_mixed_text_with_display_formula() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "body text\n$$ E=mc^2 $$",
            "protected_translated_text": "正文\n$$ E=mc^2 $$",
        }
    )

    assert intent.source_role == "mixed_math_text"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_keeps_inline_math_text_deletable() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "Method-2: rate $ Ls=2.7V^2/R $",
            "protected_translated_text": "方法2：变化率 $ Ls=2.7V^2/R $",
        }
    )

    assert intent.source_role == "body_text"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_strips_table_footnote_with_inline_math_markers() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "layout_role": "footnote",
            "semantic_role": "metadata",
            "normalized_sub_type": "table_footnote",
            "source_text": "$ ^{a} $All calculations were performed with the def2-TZVP basis set. $ ^{54} $",
            "protected_translated_text": "$^{a}$所有计算均使用 def2-TZVP 基组完成。$^{54}$",
        }
    )

    assert intent.source_role == "body_text"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_protects_footnote_with_display_math() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "layout_role": "footnote",
            "semantic_role": "metadata",
            "normalized_sub_type": "table_footnote",
            "source_text": "See $$ E=mc^2 $$ for details.",
            "protected_translated_text": "详见 $$ E=mc^2 $$。",
        }
    )

    assert intent.source_role == "mixed_math_text"
    assert intent.cleanup_action == "protect_source"


def test_structural_toc_and_page_number_do_not_force_text_strip_in_beta10_cleanup() -> None:
    from retainpdf_pipeline.render.source_cleanup.planning.item_classifier import item_allows_forced_text_strip

    assert not item_allows_forced_text_strip(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "layout_role": "toc",
            "semantic_role": "table_of_contents",
        }
    )
    assert not item_allows_forced_text_strip(
        {
            "item_id": "p001-b002",
            "block_kind": "text",
            "layout_role": "page_number",
        }
    )
