from retainpdf_translation.core.terms.abbreviations import AbbreviationEntry
from retainpdf_translation.core.terms.abbreviations import build_abbreviation_guidance
from retainpdf_translation.core.terms.abbreviations import matched_abbreviation_entries
from retainpdf_translation.core.terms.glossary import GlossaryEntry
from retainpdf_translation.core.terms.glossary import build_glossary_guidance
from retainpdf_translation.core.terms.glossary import context_matches
from retainpdf_translation.core.terms.glossary import glossary_hard_entries
from retainpdf_translation.core.terms.glossary import matched_glossary_entries
from retainpdf_translation.core.terms.glossary import normalize_glossary_entries
from retainpdf_translation.core.terms.glossary import parse_glossary_json
from retainpdf_translation.core.terms.glossary import term_pattern
from retainpdf_translation.core.terms.injection import build_terms_guidance

__all__ = [
    "AbbreviationEntry",
    "GlossaryEntry",
    "build_abbreviation_guidance",
    "build_glossary_guidance",
    "build_terms_guidance",
    "context_matches",
    "glossary_hard_entries",
    "matched_abbreviation_entries",
    "matched_glossary_entries",
    "normalize_glossary_entries",
    "parse_glossary_json",
    "term_pattern",
]
