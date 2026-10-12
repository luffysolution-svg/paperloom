import sys
import copy
from pathlib import Path


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from retainpdf_pipeline.render.layout.typography_memory.features import build_typography_feature
from retainpdf_pipeline.render.layout.payload.block_seed_metrics import collect_page_seed_metrics
from retainpdf_pipeline.render.layout.payload.block_seed_payload_factory import build_seed_payload_for_item
from retainpdf_pipeline.render.layout.payload import block_seed_payload_factory
from retainpdf_pipeline.render.layout.typography_memory.store import TypographyMemory
from retainpdf_pipeline.render.layout.typography_memory.store import TypographyMemoryDecision
from retainpdf_pipeline.render.layout.typography_memory import store
from retainpdf_pipeline.render.layout.payload.blocks import build_render_blocks


def _item() -> dict:
    return {
        "item_id": "p001-b001",
        "block_kind": "text",
        "block_type": "text",
        "layout_role": "paragraph",
        "semantic_role": "body",
        "structure_role": "body",
        "bbox": [40.0, 80.0, 300.0, 142.0],
        "source_text": "This is a stable body paragraph with enough source words.",
        "protected_source_text": "This is a stable body paragraph with enough source words.",
        "lines": [
            {"bbox": [40.0, 80.0, 300.0, 94.0]},
            {"bbox": [40.0, 98.0, 300.0, 112.0]},
        ],
    }


def test_default_typography_does_not_learn_or_shrink_over_repeated_renders(tmp_path, monkeypatch):
    monkeypatch.delenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY", raising=False)
    monkeypatch.setattr(store.typography_memory, "db_path", tmp_path / "memory.sqlite3")
    monkeypatch.setattr(store.typography_memory, "_ready", False)
    items = []
    top = 72.0
    for index, (words, chars) in enumerate(((60, 150), (45, 160), (70, 120), (40, 170), (55, 200), (80, 140))):
        source = " ".join(f"word{i}" for i in range(words))
        count = max(2, words // 9)
        item = {
            "item_id": f"fixture-{index}", "block_type": "text", "block_kind": "text",
            "layout_role": "paragraph", "semantic_role": "body", "structure_role": "body",
            "source_text": source, "protected_source_text": source,
            "protected_translated_text": ("用于检验重复渲染排版字号的正文段落。" * 30)[:chars],
            "bbox": [56.0, top, 540.0, top + count * 13.0],
            "lines": [{"bbox": [56.0, top + i * 13.0, 540.0, top + i * 13.0 + 11.0],
                       "spans": [{"type": "text", "content": source[:60]}]} for i in range(count)],
        }
        items.append(item)
        top = item["bbox"][3] + 10.0
    runs = [[(b.block_id, b.font_size_pt, b.leading_em)
             for b in build_render_blocks(copy.deepcopy(items), page_width=595.0, page_height=842.0)]
            for _ in range(7)]
    assert all(run == runs[0] for run in runs)
    assert store.typography_memory.enabled is False
    assert not store.typography_memory.db_path.exists()


def test_old_typography_statistics_are_ignored_without_deleting_history(tmp_path, monkeypatch):
    monkeypatch.setenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY", "1")
    memory = TypographyMemory(tmp_path / "memory.sqlite3")
    with monkeypatch.context() as old:
        old.setattr(store, "TYPOGRAPHY_MEMORY_ALGORITHM_VERSION", "font_leading_stats_v1")
        for _ in range(3):
            memory.observe(feature_key="fixture", font_size_pt=8.0, leading_em=0.6)
        assert memory.lookup("fixture") is not None
    assert memory.lookup("fixture") is None
    with memory._connect() as conn:
        assert conn.execute("select observations from typography_stats where algorithm_version = 'font_leading_stats_v1'").fetchone() == (3,)


def test_typography_memory_learns_after_min_observations(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY", "1")
    monkeypatch.setenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY_MIN_OBS", "2")
    memory = TypographyMemory(tmp_path / "typography.sqlite3")
    feature = build_typography_feature(
        item=_item(),
        translated_text="这是一个稳定的正文段落，用于测试字号和行距缓存。",
        font_size_pt=10.5,
        leading_em=0.78,
        page_width=595.0,
        page_height=842.0,
        page_text_width_med=260.0,
        is_body=True,
        dense_small_box=False,
        heavy_dense_small_box=False,
        wide_aspect_body_text=False,
        preserve_line_breaks=False,
    )

    assert feature is not None
    assert memory.lookup(feature.key) is None

    memory.observe(feature_key=feature.key, font_size_pt=10.8, leading_em=0.82)
    assert memory.lookup(feature.key) is None

    memory.observe(feature_key=feature.key, font_size_pt=10.9, leading_em=0.81)
    decision = memory.lookup(feature.key)

    assert decision is not None
    assert decision.observations == 2
    assert 10.8 <= decision.font_size_pt <= 10.9
    assert 0.81 <= decision.leading_em <= 0.82


def test_typography_memory_rejects_unstable_samples(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY", "1")
    monkeypatch.setenv("RETAIN_RENDER_TYPOGRAPHY_MEMORY_MIN_OBS", "3")
    memory = TypographyMemory(tmp_path / "typography.sqlite3")
    feature = build_typography_feature(
        item=_item(),
        translated_text="这是另一个稳定正文段落。",
        font_size_pt=10.5,
        leading_em=0.78,
        page_width=595.0,
        page_height=842.0,
        page_text_width_med=260.0,
        is_body=True,
        dense_small_box=False,
        heavy_dense_small_box=False,
        wide_aspect_body_text=False,
        preserve_line_breaks=False,
    )

    assert feature is not None
    for font_size in (8.0, 12.0, 16.0):
        memory.observe(feature_key=feature.key, font_size_pt=font_size, leading_em=0.8)

    assert memory.lookup(feature.key) is None


def test_typography_memory_hit_still_runs_final_fit(monkeypatch) -> None:
    class _Memory:
        def lookup(self, feature_key: str):
            assert feature_key
            return TypographyMemoryDecision(
                font_size_pt=13.0,
                leading_em=0.9,
                observations=6,
                confidence=0.8,
            )

    calls: list[tuple[float, float]] = []

    def _fake_fit(item, text, formula_map, font_size_pt, leading_em, *, page_body_font_size_pt=None):
        del item, text, formula_map, page_body_font_size_pt
        calls.append((font_size_pt, leading_em))
        return 10.2, 0.58

    monkeypatch.setattr(block_seed_payload_factory, "typography_memory", _Memory())
    monkeypatch.setattr(block_seed_payload_factory, "fit_translated_block_metrics", _fake_fit)

    item = {
        "item_id": "p001-b001",
        "block_kind": "text",
        "block_type": "text",
        "layout_role": "paragraph",
        "semantic_role": "body",
        "structure_role": "body",
        "bbox": [40.0, 80.0, 330.0, 142.0],
        "source_text": "This is a stable body paragraph with enough source words for metrics.",
        "protected_source_text": "This is a stable body paragraph with enough source words for metrics.",
        "protected_translated_text": "这是一个稳定的正文段落，用于测试缓存命中后仍然经过最终安全拟合。",
        "lines": [
            {"bbox": [40.0, 80.0, 330.0, 94.0]},
            {"bbox": [40.0, 98.0, 330.0, 112.0]},
        ],
    }
    metrics = collect_page_seed_metrics([item], page_width=595.0)

    payload = build_seed_payload_for_item(
        index=0,
        item=item,
        metrics=metrics,
        page_width=595.0,
        page_height=842.0,
    )

    assert calls == [(13.0, 0.9)]
    assert payload is not None
    assert payload["font_size_pt"] == 10.2
    assert payload["leading_em"] == 0.58
    assert payload["_typography_memory_hit"] is True
