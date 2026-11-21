from __future__ import annotations

import json
from pathlib import Path

import pytest


from retainpdf_base.events import emit_artifact_published
from retainpdf_base.events import emit_stage_progress
from retainpdf_base.events import emit_stage_transition
from retainpdf_base.events import PipelineEventWriter
from retainpdf_base.events import pipeline_event_writer_scope


def test_pipeline_event_writer_emits_structured_jsonl(tmp_path: Path, capsys) -> None:
    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(
        job_id="job-1",
        job_root=tmp_path,
        logs_dir=logs_dir,
        workflow="book",
        provider="paddle",
    )

    with pipeline_event_writer_scope(writer):
        emit_stage_transition(
            stage="startup",
            message="worker started",
        )
        emit_stage_progress(
            stage="translating",
            message="batch done",
            progress_current=3,
            progress_total=5,
            elapsed_ms=1234,
        )
        artifact_path = tmp_path / "artifacts" / "pipeline_summary.json"
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        artifact_path.write_text("{}", encoding="utf-8")
        emit_artifact_published(
            artifact_key="pipeline_summary_json",
            path=artifact_path,
            stage="saving",
            message="summary ready",
        )

    events_path = logs_dir / "pipeline_events.jsonl"
    rows = [
        json.loads(line)
        for line in events_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    assert [row["event_type"] for row in rows] == [
        "stage_transition",
        "stage_progress",
        "artifact_published",
    ]
    assert rows[0]["provider"] == "paddle"
    assert rows[1]["user_stage"] == "translation"
    assert rows[1]["semantic_event_type"] == "progress"
    assert rows[1]["created_at"] == rows[1]["ts"]
    assert rows[1]["progress_unit"] == "batch"
    assert rows[1]["progress_current"] == 3
    assert rows[1]["progress_total"] == 5
    assert rows[1]["elapsed_ms"] == 1234
    assert rows[2]["payload"]["artifact_key"] == "pipeline_summary_json"
    assert rows[2]["payload"]["path"] == str(artifact_path.resolve())

    stdout_rows = [
        json.loads(line)
        for line in capsys.readouterr().out.splitlines()
        if line.strip()
    ]
    assert [row["event_type"] for row in stdout_rows] == [
        "stage_transition",
        "stage_progress",
        "artifact_published",
    ]
    assert stdout_rows[0]["schema"] == "pipeline_stage_observation_v1"
    assert stdout_rows[0]["schema_version"] == 1


def test_artifact_published_prints_structured_stdout_event(tmp_path: Path, capsys) -> None:
    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(
        job_id="job-stdout",
        job_root=tmp_path,
        logs_dir=logs_dir,
        workflow="book",
    )
    artifact_path = tmp_path / "rendered" / "output.pdf"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_bytes(b"%PDF")

    with pipeline_event_writer_scope(writer):
        emit_artifact_published(
            artifact_key="output_pdf",
            path=artifact_path,
            stage="saving",
            message="output ready",
        )

    stdout_rows = [
        json.loads(line)
        for line in capsys.readouterr().out.splitlines()
        if line.strip()
    ]
    assert len(stdout_rows) == 1
    assert stdout_rows[0]["event_type"] == "artifact_published"
    assert stdout_rows[0]["payload"]["artifact_key"] == "output_pdf"
    assert stdout_rows[0]["payload"]["path"] == str(artifact_path.resolve())


def test_pipeline_event_writer_keeps_progress_monotonic_per_substage(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(
        job_id="job-progress",
        job_root=tmp_path,
        logs_dir=logs_dir,
        workflow="book",
    )

    with pipeline_event_writer_scope(writer):
        emit_stage_progress(
            stage="rendering",
            message="page 10",
            progress_current=10,
            progress_total=20,
            payload={"user_stage": "render", "substage": "render_pages", "progress_unit": "page"},
        )
        emit_stage_progress(
            stage="rendering",
            message="stale page 2",
            progress_current=2,
            progress_total=20,
            payload={"user_stage": "render", "substage": "render_pages", "progress_unit": "page"},
        )
        emit_stage_progress(
            stage="rendering",
            message="compile step",
            progress_current=1,
            progress_total=4,
            payload={"user_stage": "render", "substage": "render_compile", "progress_unit": "step"},
        )

    rows = [
        json.loads(line)
        for line in (logs_dir / "pipeline_events.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    assert rows[0]["progress_current"] == 10
    assert rows[1]["progress_current"] == 10
    assert rows[2]["progress_current"] == 1


def test_stage_progress_accepts_top_level_substage(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(
        job_id="job-substage",
        job_root=tmp_path,
        logs_dir=logs_dir,
        workflow="book",
    )

    with pipeline_event_writer_scope(writer):
        emit_stage_progress(
            stage="translating",
            substage="translation_tail_retry",
            message="tail retry item",
            progress_current=2,
            progress_total=9,
            payload={"progress_unit": "batch"},
        )

    rows = [
        json.loads(line)
        for line in (logs_dir / "pipeline_events.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    assert rows[0]["stage"] == "translating"
    assert rows[0]["substage"] == "translation_tail_retry"
    assert rows[0]["user_stage"] == "translation"
    assert rows[0]["progress_unit"] == "batch"
    assert rows[0]["progress_current"] == 2


def test_pipeline_events_classify_translation_and_render_substages(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(
        job_id="job-stage-map",
        job_root=tmp_path,
        logs_dir=logs_dir,
        workflow="book",
    )

    with pipeline_event_writer_scope(writer):
        emit_stage_progress(
            stage="agent_repair",
            substage="agent_repair",
            message="repair done",
            progress_current=1,
            progress_total=3,
        )
        emit_stage_progress(
            stage="render_preprocess",
            substage="render_prewarm",
            message="prewarm done",
            progress_current=2,
            progress_total=3,
            payload={"progress_unit": "step"},
        )

    rows = [
        json.loads(line)
        for line in (logs_dir / "pipeline_events.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    assert rows[0]["user_stage"] == "translation"
    assert rows[0]["substage"] == "agent_repair"
    assert rows[1]["user_stage"] == "render"
    assert rows[1]["stage"] == "render_preprocess"
    assert rows[1]["substage"] == "render_prewarm"


@pytest.fixture(autouse=True)
def _isolated_progress_state():
    # Monotonic progress state lives in ContextVars shared by the whole test
    # process; reset it so per-substage counters from one test do not leak.
    from retainpdf_base import events as events_module

    snapshot_token = events_module._ACTIVE_PROGRESS_SNAPSHOT.set(None)
    page_token = events_module._ACTIVE_RENDER_PAGE_PROGRESS.set(None)
    yield
    events_module._ACTIVE_RENDER_PAGE_PROGRESS.reset(page_token)
    events_module._ACTIVE_PROGRESS_SNAPSHOT.reset(snapshot_token)


def _read_event_rows(logs_dir: Path) -> list[dict]:
    return [
        json.loads(line)
        for line in (logs_dir / "pipeline_events.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_render_prepare_progress_is_main_lane_render_step(tmp_path: Path) -> None:
    from retainpdf_base.events import emit_render_page_progress
    from retainpdf_base.events import emit_render_prepare_progress
    from retainpdf_base.events import reset_render_page_progress

    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(job_id="job-render-prepare", job_root=tmp_path, logs_dir=logs_dir)

    reset_render_page_progress()
    with pipeline_event_writer_scope(writer):
        emit_render_prepare_progress(
            current=2,
            total=4,
            message="渲染准备：正在计算版式与配色（3/4）",
            payload={"render_prepare_step": "payload_layout_color"},
        )
        # render_prepare must not feed the render_pages rollback guard.
        record = emit_render_page_progress(current=1, total=48, message="正在生成背景页，第 1/48 页")

    rows = _read_event_rows(logs_dir)
    assert record is not None
    assert rows[0]["event_type"] == "stage_progress"
    assert rows[0]["user_stage"] == "render"
    assert rows[0]["stage"] == "rendering"
    assert rows[0]["substage"] == "render_prepare"
    assert rows[0]["progress_unit"] == "step"
    assert (rows[0]["progress_current"], rows[0]["progress_total"]) == (2, 4)
    assert rows[0]["payload"]["render_prepare_step"] == "payload_layout_color"
    assert rows[1]["substage"] == "render_pages"
    assert (rows[1]["progress_current"], rows[1]["progress_total"]) == (1, 48)


def test_throttle_progress_callback_keeps_min_interval_from_stage_start() -> None:
    from retainpdf_translation.workflow.phases.events import throttle_progress_callback

    now = [100.0]
    seen: list[int] = []
    throttled = throttle_progress_callback(lambda current: seen.append(current), clock=lambda: now[0])

    for current in range(1, 11):
        now[0] += 0.4
        throttled(current)

    # 0.4s per call: forwarded at +1.2s, +2.4s, +3.6s.
    assert seen == [3, 6, 9]


class _SteppingClock:
    def __init__(self, step_s: float) -> None:
        self.now = 1000.0
        self.step_s = step_s

    def __call__(self) -> float:
        value = self.now
        self.now += self.step_s
        return value


def _run_page_policy_stage_with_fake_pages(tmp_path: Path, *, clock_step_s: float) -> list[dict]:
    import functools
    from unittest import mock

    from retainpdf_translation.workflow.phases import policy as policy_phase
    from retainpdf_translation.workflow.phases.events import throttle_progress_callback

    page_payloads = {page_idx: [] for page_idx in range(48)}

    def _fake_apply_page_policies(*, page_payloads, progress_callback, **_kwargs):
        total = len(page_payloads)
        for order, page_idx in enumerate(sorted(page_payloads), start=1):
            progress_callback(order, total, page_idx, 0)
        return 0

    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(job_id="job-page-policy-throttle", job_root=tmp_path, logs_dir=logs_dir)
    with pipeline_event_writer_scope(writer), mock.patch.object(
        policy_phase, "apply_page_policies", side_effect=_fake_apply_page_policies
    ), mock.patch.object(
        policy_phase,
        "throttle_progress_callback",
        functools.partial(throttle_progress_callback, clock=_SteppingClock(clock_step_s)),
    ):
        policy_phase.run_page_policy_stage(
            page_payloads=page_payloads,
            mode="sci",
            classify_batch_size=1,
            workers=1,
            api_key="",
            model="",
            base_url="",
            skip_title_translation=False,
            sci_cutoff_page_idx=None,
            sci_cutoff_block_idx=None,
            policy_config=None,
            run_diagnostics=None,
        )
    return [row for row in _read_event_rows(logs_dir) if row["substage"] == "page_policies"]


def test_fast_page_policy_stage_emits_only_start_and_finish(tmp_path: Path) -> None:
    rows = _run_page_policy_stage_with_fake_pages(tmp_path, clock_step_s=0.002)

    assert [row["event_type"] for row in rows] == ["stage_transition", "stage_progress"]
    assert (rows[0]["progress_current"], rows[0]["progress_total"]) == (0, 48)
    assert rows[-1]["message"] == "页面策略和块分类完成"
    assert (rows[-1]["progress_current"], rows[-1]["progress_total"]) == (48, 48)


def test_slow_page_policy_stage_throttles_per_page_events(tmp_path: Path) -> None:
    rows = _run_page_policy_stage_with_fake_pages(tmp_path, clock_step_s=0.25)

    per_page = [row for row in rows if row["message"].startswith("正在执行页面策略")]
    # One clock read per page at 0.25s => one forwarded page event per 4 pages.
    assert [row["progress_current"] for row in per_page] == list(range(4, 49, 4))
    assert rows[0]["event_type"] == "stage_transition"
    assert rows[-1]["message"] == "页面策略和块分类完成"
    assert (rows[-1]["progress_current"], rows[-1]["progress_total"]) == (48, 48)


def test_fast_continuation_review_emits_only_start_and_finish(tmp_path: Path) -> None:
    from unittest import mock

    from retainpdf_translation.workflow.phases import continuation as continuation_phase

    page_payloads = {page_idx: [] for page_idx in range(48)}

    def _fake_review(*, progress_callback, **_kwargs):
        for current in range(1, 31):
            progress_callback(current, 30)

    logs_dir = tmp_path / "logs"
    writer = PipelineEventWriter(job_id="job-continuation-throttle", job_root=tmp_path, logs_dir=logs_dir)
    with pipeline_event_writer_scope(writer), mock.patch.object(
        continuation_phase, "review_and_apply_continuations", side_effect=_fake_review
    ):
        continuation_phase.run_continuation_review(
            page_payloads=page_payloads,
            translation_paths={},
            api_key="",
            model="",
            base_url="",
            workers=1,
            run_diagnostics=None,
        )

    rows = [row for row in _read_event_rows(logs_dir) if row["substage"] == "continuation_review"]
    assert [row["event_type"] for row in rows] == ["stage_transition", "stage_progress"]
    assert rows[-1]["message"] == "跨栏/跨页连续段复核完成"
    assert (rows[-1]["progress_current"], rows[-1]["progress_total"]) == (48, 48)
