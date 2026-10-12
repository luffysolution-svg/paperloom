import json

import pytest

from retainpdf_pipeline.render.workflow import source_page_records
from retainpdf_pipeline.render.source_cleanup.planning.item_classifier import item_allows_forced_text_strip
from retainpdf_pipeline.translate.core.ocr import json_extractor
from retainpdf_pipeline.translate.llm import domain_context
from retainpdf_pipeline.translate.llm.shared.response_parsing import extract_json_text, extract_single_item_translation_text
from retainpdf_pipeline.translate.llm.shared.structured_output import parse_structured_json, extract_string_fields


@pytest.mark.parametrize("wrapper", ["{}", "```json\n{}\n```", "Here is the response:\n{}"])
def test_valid_json_preserves_smart_punctuation(wrapper):
    payload = {"translated_text": "Vue’s ‘effect’ and “quotes”, 注：value", "item_id": "fixture"}
    raw = wrapper.format(json.dumps(payload, ensure_ascii=False))
    assert json.loads(extract_json_text(raw)) == payload
    assert extract_single_item_translation_text(raw, "fixture") == payload["translated_text"]


def test_nested_translation_shell_preserves_smart_punctuation():
    expected = "Vue’s “effect” 注：value"
    inner = json.dumps({"translated_text": expected}, ensure_ascii=False)
    raw = json.dumps({"translations": [{"item_id": "fixture", "translated_text": inner}]}, ensure_ascii=False)
    assert extract_single_item_translation_text(raw, "fixture") == expected


def test_loose_json_shell_still_supported():
    raw = '“translations”： [{“item_id”: “fixture”, “translated_text”: “text”}]'
    assert extract_single_item_translation_text(raw, "fixture") == "text"


@pytest.mark.parametrize("math_text", [
    r"Use $\beta$, $\boldsymbol{r}$, $\theta$, $\rho$, $\nu$, $\frac{a}{b}$.",
    r"Use \(\alpha + \theta\) and \[\frac{a}{b}\].",
    r"Use $\begin{aligned}\text{value}\underbrace{x}\end{aligned}$.",
    r"Use $$\beta + \theta$$.",
])
def test_raw_latex_json_escapes_preserved_in_structured_and_field_parsers(math_text):
    raw = '{"translation_guidance":"' + math_text + '"}'
    assert parse_structured_json(raw)["translation_guidance"] == math_text
    assert extract_string_fields(raw, {"guidance": ["translation_guidance"]})["guidance"] == math_text


@pytest.mark.parametrize("raw, expected", [
    (r'line one\nnext line\tvalue', "line one\nnext line\tvalue"),
    (r'\nnext line and \tvalue and \rreturn', "\nnext line and \tvalue and \rreturn"),
    (r'quote: \"x\" slash: \/ backslash: \\ Unicode: \u03b2', 'quote: "x" slash: / backslash: \\ Unicode: β'),
    (r'Use $\\beta$ and $\\theta$.', r'Use $\beta$ and $\theta$.'),
])
def test_legitimate_json_escapes_remain_semantically_unchanged(raw, expected):
    content = '{"translation_guidance":"' + raw + '"}'
    assert parse_structured_json(content)["translation_guidance"] == expected
    assert extract_string_fields(content, {"guidance": ["translation_guidance"]})["guidance"] == expected.strip()


@pytest.mark.parametrize("text", ["line\nu = 2", "name\to", "part\rho", "column\bar", "page\forall"])
def test_legal_control_escapes_that_resemble_math_commands_remain_prose(text):
    content = json.dumps({"translated_text": text})
    assert parse_structured_json(content)["translated_text"] == text
    assert extract_string_fields(content, {"text": ["translated_text"]})["text"] == text


def test_unpaired_price_dollars_in_separate_strings_do_not_create_a_math_span():
    payload = {"price_a": "cost $3", "translated_text": "line\nu = 2", "price_b": "$5"}
    assert parse_structured_json(json.dumps(payload)) == payload


def test_escaped_price_dollars_do_not_reinterpret_a_legal_newline():
    text = r"cost \$3; line" + "\nu = 2; " + r"cost \$5"
    assert parse_structured_json(json.dumps({"translated_text": text}))["translated_text"] == text


@pytest.mark.parametrize("guidance", [
    "Use $\beta$.", "Use $\theta$.", "Use $\rho$.", "Use $\nu$.", "Use $\frac{a}{b}$.",
])
def test_domain_context_rejects_control_damaged_math_in_both_cache_locations(tmp_path, monkeypatch, guidance):
    payload = {"summary": "synthetic", "translation_guidance": guidance, "preview_text": "preview"}
    path = tmp_path / domain_context.DOMAIN_CONTEXT_FILE_NAME
    path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(domain_context, "_shared_domain_context_path", lambda *args, **kwargs: path)
    assert domain_context.load_cached_domain_context(tmp_path) is None
    assert domain_context._load_shared_domain_context("preview", model="fixture") is None


def test_domain_context_accepts_clean_old_cache_with_real_line_breaks(tmp_path, monkeypatch):
    guidance = "line one\nnext line\tvalue\n" + r"Use $\beta$ and $\theta$."
    payload = {"summary": "synthetic", "translation_guidance": guidance, "preview_text": "preview"}
    path = tmp_path / domain_context.DOMAIN_CONTEXT_FILE_NAME
    path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(domain_context, "_shared_domain_context_path", lambda *args, **kwargs: path)
    assert domain_context.load_cached_domain_context(tmp_path)["translation_guidance"] == guidance
    assert domain_context._load_shared_domain_context("preview", model="fixture")["translation_guidance"] == guidance


def _caption_document(translate):
    roles = ["figure_caption", "table_caption", "image_caption", "code_caption"]
    blocks = [{
        "block_id": role, "page_index": 0, "order": index, "type": "text", "sub_type": role,
        "block_class": "caption", "geometry": {"bbox": [0, 0, 180, 20]},
        "content": {"kind": "text", "text": role + " text"}, "bbox": [0, 0, 180, 20],
        "text": role + " text", "lines": [], "segments": [], "tags": [],
        "layout_role": "caption", "semantic_role": role, "structure_role": role,
        "policy": {"translate": translate, "translate_reason": "provider_caption_whitelist"},
        "source": {"provider": "fixture", "raw_type": role},
    } for index, role in enumerate(roles)]
    return {"schema": "normalized_document_v1", "schema_version": "1.0.0", "document_id": "fixture",
            "source": {"provider": "fixture"}, "page_count": 1,
            "pages": [{"page_index": 0, "width": 200, "height": 200, "unit": "pt", "blocks": blocks}]}


@pytest.mark.parametrize("extractor", [json_extractor.extract_text_items, source_page_records.extract_text_items])
def test_all_explicit_caption_types_survive_translation_and_render_prewarm(extractor):
    assert [i.structure_role for i in extractor(_caption_document(True), 0)] == [
        "figure_caption", "table_caption", "image_caption", "code_caption"]
    assert extractor(_caption_document(False), 0) == []


def test_caption_stage_role_sets_match_semantically():
    assert json_extractor.PRIMARY_TRANSLATABLE_STRUCTURE_ROLES == source_page_records.PRIMARY_TRANSLATABLE_STRUCTURE_ROLES


def test_code_caption_role_only_compatibility_allows_forced_strip():
    assert item_allows_forced_text_strip({"block_kind": "text", "layout_role": "paragraph", "structure_role": "code_caption"})
    assert all(item_allows_forced_text_strip(block) for block in _caption_document(True)["pages"][0]["blocks"])
