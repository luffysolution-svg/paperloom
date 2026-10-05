use std::path::Path;

use crate::models::domain::{JobRuntimeState, JobStatusKind, WorkflowKind};

use crate::job_runner::{
    attach_job_provider_failure, clear_canceled_runtime_artifacts, clear_job_failure,
    refresh_job_failure, sync_runtime_state,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum ProcessCompletionKind {
    Canceled,
    Succeeded,
    SucceededWithShutdownNoise,
    Failed,
}

pub(super) fn classify_process_completion(
    canceled: bool,
    process_success: bool,
    shutdown_noise_success: bool,
) -> ProcessCompletionKind {
    if canceled {
        ProcessCompletionKind::Canceled
    } else if process_success {
        ProcessCompletionKind::Succeeded
    } else if shutdown_noise_success {
        ProcessCompletionKind::SucceededWithShutdownNoise
    } else {
        ProcessCompletionKind::Failed
    }
}

/// 这个 worker 进程跑完,整个任务是不是就结束了。
///
/// book / translate 的翻译阶段跑完后面还要渲染,此时把 job 标成
/// `Succeeded` + `finished` 是错的:`sync_runtime_state` 会据此往
/// `stage_history` 里压一条 `finished/succeeded`,而随后渲染阶段又压一条
/// `rendering`。前端拿到的时间线于是长这样——
///
/// ```text
/// translating(succeeded) → finished(succeeded) → rendering(failed) → failed
/// ```
///
/// 「完成」出现在「渲染中」前面,没法按顺序画。
///
/// (中间态没有被写进 DB:`execute_process_job` 不持久化,渲染阶段在启动前会
/// 把 status 改回 `Running`。所以脏的只有 stage_history,不是 job.status。)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ProcessStageKind {
    /// 跑完即终态。
    Final,
    /// 后面还有阶段,成功时保持 Running 与当前 stage。
    Intermediate,
}

pub(super) fn apply_process_completion(
    job: &mut JobRuntimeState,
    completion: ProcessCompletionKind,
    stderr_text: &str,
    stage_kind: ProcessStageKind,
) {
    // 失败与取消无论如何都是终点,只有「成功」需要区分是不是最后一步。
    //
    // 注意 status 仍然要设成 Succeeded:四个调用方都是靠
    // `matches!(job.status, JobStatusKind::Succeeded)` 判断这一阶段成没成功,
    // 再决定要不要继续跑渲染。把它留在 Running 会被读成「翻译失败」,于是直接
    // return、渲染永不启动,任务停在 running/translating——实测撞过一次。
    //
    // 要挡住的只是 `stage = "finished"`:stage 一变,`sync_runtime_state` 就会
    // 往 stage_history 压一条 finished 条目,夹在 translating 和 rendering 中间。
    // stage 留在原地则只会更新当前条目,顺序保持干净。
    if matches!(stage_kind, ProcessStageKind::Intermediate)
        && matches!(
            completion,
            ProcessCompletionKind::Succeeded | ProcessCompletionKind::SucceededWithShutdownNoise
        )
    {
        job.status = JobStatusKind::Succeeded;
        job.error = None;
        clear_job_failure(job);
        sync_runtime_state(job);
        return;
    }
    match completion {
        ProcessCompletionKind::Canceled => {
            job.status = JobStatusKind::Canceled;
            job.stage = Some("canceled".to_string());
            job.stage_detail = Some("任务已取消".to_string());
            clear_canceled_runtime_artifacts(job);
            clear_job_failure(job);
        }
        ProcessCompletionKind::Succeeded => {
            job.status = JobStatusKind::Succeeded;
            job.stage = Some("finished".to_string());
            job.stage_detail = Some("任务完成".to_string());
            clear_job_failure(job);
        }
        ProcessCompletionKind::SucceededWithShutdownNoise => {
            job.status = JobStatusKind::Succeeded;
            job.stage = Some("finished".to_string());
            job.stage_detail = Some("任务完成（已忽略 Python 退出阶段的收尾噪音）".to_string());
            job.error = None;
            clear_job_failure(job);
            job.append_log(
                "INFO: ignored Python shutdown noise after artifacts were already written successfully",
            );
        }
        ProcessCompletionKind::Failed => {
            attach_job_provider_failure(job, stderr_text);
            job.status = JobStatusKind::Failed;
            job.stage = Some("failed".to_string());
            if job
                .stage_detail
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .is_none()
            {
                job.stage_detail = Some("Python worker 执行失败".to_string());
            }
            if stderr_text.trim().is_empty() {
                job.error = job.stage_detail.clone();
            } else {
                job.error = Some(stderr_text.to_string());
            }
            refresh_job_failure(job);
        }
    }
    sync_runtime_state(job);
}

pub(super) fn should_treat_shutdown_noise_as_success(
    job: &JobRuntimeState,
    stderr_text: &str,
) -> bool {
    let stderr = stderr_text.trim();
    if stderr.is_empty() || !is_shutdown_noise(stderr) {
        return false;
    }
    let Some(artifacts) = job.artifacts.as_ref() else {
        return false;
    };
    let render_outputs = artifacts.render_outputs();
    let translation_outputs = artifacts.translation_outputs();
    let output_pdf_ready = render_outputs
        .output_pdf
        .as_deref()
        .map(Path::new)
        .is_some_and(Path::exists);
    let translations_ready = translation_outputs
        .translations_dir
        .as_deref()
        .map(Path::new)
        .is_some_and(Path::exists);
    let summary_ready = render_outputs
        .summary
        .or(translation_outputs.summary)
        .as_deref()
        .map(Path::new)
        .is_some_and(Path::exists);
    match job.workflow {
        WorkflowKind::Translate => translations_ready && summary_ready,
        _ => output_pdf_ready && summary_ready,
    }
}

pub(super) fn is_shutdown_noise(stderr: &str) -> bool {
    stderr.contains("Exception ignored in")
        || stderr.contains("sys.unraisablehook")
        || stderr.contains("Exception ignored in sys.unraisablehook")
}

#[cfg(test)]
mod stage_kind_tests {
    use super::*;
    use crate::models::domain::JobSnapshot;
    use crate::models::request::CreateJobInput;

    fn translating_job() -> JobRuntimeState {
        let mut job = JobSnapshot::new(
            "job-stage-kind".to_string(),
            CreateJobInput::default(),
            vec!["python".to_string()],
        )
        .into_runtime();
        job.status = JobStatusKind::Running;
        job.stage = Some("translating".to_string());
        job.stage_detail = Some("已完成 26/26 个文本块".to_string());
        job.sync_runtime_state();
        job
    }

    /// 中间阶段成功后 stage 必须留在原地,否则时间线里会出现「完成」夹在
    /// 「渲染中」前面。但 status 仍要是 Succeeded——调用方靠它决定要不要继续
    /// 跑下一阶段。这两条必须同时成立,漏掉后者会让渲染永不启动。
    #[test]
    fn intermediate_success_keeps_the_stage_so_the_timeline_stays_ordered() {
        let mut job = translating_job();
        apply_process_completion(
            &mut job,
            ProcessCompletionKind::Succeeded,
            "",
            ProcessStageKind::Intermediate,
        );

        assert_eq!(
            job.status,
            JobStatusKind::Succeeded,
            "调用方靠 status==Succeeded 判断这一阶段成功、进而启动渲染；留在 Running 会让渲染永不启动"
        );
        assert_eq!(
            job.stage.as_deref(),
            Some("translating"),
            "stage 应留在原地，由下一阶段改写"
        );
        let history = job.runtime.as_ref().expect("runtime").stage_history.clone();
        assert!(
            !history.iter().any(|entry| entry.stage == "finished"),
            "stage_history 不得出现 finished：{:?}",
            history.iter().map(|e| &e.stage).collect::<Vec<_>>()
        );
    }

    /// 失败与取消无论在哪一步都是终点,不能因为「是中间阶段」就被放过。
    #[test]
    fn intermediate_failure_is_still_terminal() {
        let mut job = translating_job();
        apply_process_completion(
            &mut job,
            ProcessCompletionKind::Failed,
            "boom",
            ProcessStageKind::Intermediate,
        );
        assert_eq!(job.status, JobStatusKind::Failed);
        assert_eq!(job.stage.as_deref(), Some("failed"));

        let mut job = translating_job();
        apply_process_completion(
            &mut job,
            ProcessCompletionKind::Canceled,
            "",
            ProcessStageKind::Intermediate,
        );
        assert_eq!(job.status, JobStatusKind::Canceled);
        assert_eq!(job.stage.as_deref(), Some("canceled"));
    }

    /// 终点阶段行为不变（回归保护）。
    #[test]
    fn final_success_still_marks_the_job_finished() {
        let mut job = translating_job();
        apply_process_completion(
            &mut job,
            ProcessCompletionKind::Succeeded,
            "",
            ProcessStageKind::Final,
        );
        assert_eq!(job.status, JobStatusKind::Succeeded);
        assert_eq!(job.stage.as_deref(), Some("finished"));
    }
}
