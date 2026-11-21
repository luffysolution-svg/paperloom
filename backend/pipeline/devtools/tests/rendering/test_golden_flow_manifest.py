from __future__ import annotations


from devtools import run_golden_flow


def test_golden_manifest_is_valid() -> None:
    rows = run_golden_flow._check_manifest()

    assert any(row["id"] == "editable-paper-formula" for row in rows)
    assert any(row["id"] == "pseudo-editable" for row in rows)


def test_sample_id_resolves_existing_pdf() -> None:
    assert run_golden_flow._sample_pdf("editable-paper-formula").name == "1.pdf"
    assert run_golden_flow._sample_pdf("pseudo-editable").name == "2.pdf"
