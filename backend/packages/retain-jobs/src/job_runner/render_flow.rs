use anyhow::Result;

use crate::models::domain::{
    job_stage_detail, job_stage_str, now_iso, JobRuntimeState, JobStage, JobStatusKind,
};

use super::render_flow_artifacts::prepare_render_job_from_artifacts;
use super::{clear_job_failure, execute_process_job, sync_runtime_state, ProcessRuntimeDeps};
use crate::worker_command::{build_worker_stage_command, WorkerStageCommand};

pub(super) async fn run_render_job_from_artifacts(
    deps: ProcessRuntimeDeps,
    job: JobRuntimeState,
) -> Result<JobRuntimeState> {
    let (mut job, render_inputs) = prepare_render_job_from_artifacts(&deps.persist, job)?;
    let job_paths = crate::storage_paths::build_job_paths(&deps.persist.output_root, &job.job_id)?;

    job.command = build_worker_stage_command(
        &deps.worker_command_runtime(),
        &job.request_payload,
        &job_paths,
        WorkerStageCommand::Render {
            source_pdf_path: &render_inputs.source_pdf_path,
            translations_dir: &render_inputs.translations_dir,
        },
    )?;
    job.status = JobStatusKind::Running;
    job.started_at = Some(now_iso());
    job.updated_at = now_iso();
    job.stage = Some(job_stage_str(JobStage::Rendering).to_string());
    job.stage_detail = Some(job_stage_detail(JobStage::Rendering).to_string());
    // 进入新阶段就把进度清零,和 `prepare_translation_stage` 对称。
    //
    // 这对字段是 job 级的、跨阶段不自动重置。渲染阶段的进度走的是 stage
    // snapshot(stages.render 那个 2/3),从不写 job.progress_*,于是它整段都
    // 停在翻译留下的值上——stage_history 把渲染和 finished 两条都归档成了
    // 「59/59」,而那是翻译的块数,不是渲染的页数。
    job.progress_current = None;
    job.progress_total = None;
    clear_job_failure(&mut job);
    sync_runtime_state(&mut job);
    execute_process_job(deps, job, &[]).await
}
