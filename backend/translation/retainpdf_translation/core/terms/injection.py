from __future__ import annotations

from retainpdf_translation.core.terms.abbreviations import AbbreviationEntry
from retainpdf_translation.core.terms.abbreviations import build_abbreviation_guidance
from retainpdf_translation.core.terms.glossary import GlossaryEntry
from retainpdf_translation.core.terms.glossary import build_glossary_guidance


def build_terms_guidance(
    *,
    glossary_entries: list[GlossaryEntry] | None = None,
    abbreviation_entries: list[AbbreviationEntry] | None = None,
) -> str:
    parts = []
    glossary_guidance = build_glossary_guidance(glossary_entries or [])
    abbreviation_guidance = build_abbreviation_guidance(abbreviation_entries or [])
    if glossary_guidance:
        parts.append(glossary_guidance)
    if abbreviation_guidance:
        parts.append(abbreviation_guidance)
    return "\n\n".join(parts).strip()
