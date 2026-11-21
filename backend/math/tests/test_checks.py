from retainpdf_math import dropped_latex_commands
from retainpdf_math import has_balanced_inline_math_delimiters
from retainpdf_math import math_spans
from retainpdf_math import unbalanced_brace_math_spans


def test_math_spans_finds_inline_and_display_formulas():
    assert math_spans("a $x^2$ b $$\\sum_i y$$ c \\$5 d $ $") == ["x^2", "\\sum_i y"]
    assert has_balanced_inline_math_delimiters("$a$ \\$ $b$")
    assert not has_balanced_inline_math_delimiters("$a$ $b")


def test_unbalanced_braces_are_blamed_only_when_the_source_was_fine():
    source = "$ \\rho_{s}(\\mathbf{r}) $ and OCR junk $ x_{i $"
    translated = "$\\rho_{s}(\\mathbf{r}})$，OCR $x_{i$，转义 $\\{a\\}$"
    assert unbalanced_brace_math_spans(source, translated) == ["\\rho_{s}(\\mathbf{r}})"]


def test_dropped_commands_counts_semantic_commands():
    assert dropped_latex_commands("$\\mathsf{A} \\cdot B$", "$A B$") == {"mathsf": 1, "cdot": 1}
    assert dropped_latex_commands("$A^{\\prime}$", "$A'$") == {}
