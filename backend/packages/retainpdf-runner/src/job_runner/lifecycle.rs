use std::time::{Duration, Instant};

use anyhow::Result;
use tracing::{debug, error};

#[cfg(test)]
#[path = "lifecycle_tests.rs"]
mod tests;

use crate::config::AppConfig;
use crate::db::Db;
use crate::job_events::{cas_persist_job_with_resources, driver_run_generation, with_driver_run};
use crate::models::domain::{now_iso, JobRuntimeState, JobSnapshot, JobStatusKind, WorkflowKind};

use super::{
    append_error_chain_log,
    cancel_registry::{clear_cancel_request_with_registry, is_cancel_requested_with_registry},
    execution_queue::wait_for_execution_slot,
    format_error_chain,
    ocr_flow::execute_ocr_job,
    render_flow::run_render_job_from_artifacts,
    revision_publication::publish_translation_revisions_after_terminal,
    translation_flow::resume_render_stage_from_durable_state,
    translation_flow::resume_translation_stage_from_durable_state,
    translation_flow::run_translate_only_job_with_ocr,
    translation_flow::run_translation_job_with_ocr,
    ProcessRuntimeDeps,
};

/// 新一次运行的 driver 等上一次运行的 driver 释放登记时，多久看一次、最多等多久。
/// 上一次的 driver 只剩收尾（排空 stdout 最多 30 秒、善后），等不到就放弃，交给运行期巡检。
const SUPERSEDED_DRIVER_POLL: Duration = Duration::from_millis(50);
const SUPERSEDED_DRIVER_MAX_WAIT: Duration = Duration::from_secs(120);

/// driver 出错后落「失败」终态：读行或写行偶发失败（SQLite 忙等）时重试几次，别一次失败就让任务
/// 停在 queued/running 没人管。
const FAILED_PERSIST_ATTEMPTS: usize = 3;
const FAILED_PERSIST_RETRY_DELAY: Duration = Duration::from_millis(200);

pub fn spawn_job(deps: ProcessRuntimeDeps, job_id: String) {
    spawn_job_with_workflow(deps, job_id, dispatch_workflow);
}

/// 为刚刚新建/原地重跑出来的一次运行发射 driver：先丢掉上一次运行遗留的取消标记，再起 driver。
///
/// 取消标记只登记在内存里、以任务编号为键，由 driver 消费。取消一个没有 driver 的任务（发射丢了、
/// 进程重启过）时没人消费，标记会一直留着，下一次原地重跑的 driver 一启动就看到它，把新一次运行
/// 立刻取消掉。新的一次运行开始之前不可能有针对它的取消请求，所以这里清掉是安全的。
/// 取消 queued 任务时 API 自己会 CAS 落终态，不依赖这个标记。
pub fn launch_job(deps: ProcessRuntimeDeps, job_id: String) {
    launch_job_with_workflow(deps, job_id, dispatch_workflow);
}

fn launch_job_with_workflow<F, Fut>(
    deps: ProcessRuntimeDeps,
    job_id: String,
    workflow: F,
) -> tokio::task::JoinHandle<()>
where
    F: FnOnce(ProcessRuntimeDeps, JobRuntimeState) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<JobRuntimeState>> + Send,
{
    tokio::spawn(async move {
        clear_cancel_request_with_registry(deps.canceled_jobs.as_ref(), &job_id).await;
        if let Some(driver) = spawn_job_with_workflow(deps, job_id, workflow) {
            let _ = driver.await;
        }
    })
}

fn spawn_job_with_workflow<F, Fut>(
    deps: ProcessRuntimeDeps,
    job_id: String,
    workflow: F,
) -> Option<tokio::task::JoinHandle<()>>
where
    F: FnOnce(ProcessRuntimeDeps, JobRuntimeState) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<JobRuntimeState>> + Send,
{
    // 这个 driver 属于哪一次运行：发射时行上的代次。之后它所有对这个任务的 CAS 写都钉在这个代次上
    // （`with_driver_run`），任务被重新排队之后，它的写自动落空。
    let generation = match deps.db.job_run_generation(&job_id) {
        Ok(Some(generation)) => generation,
        // 没有这一行：和以前一样让 run_job 去报「找不到任务」。
        Ok(None) => 0,
        Err(err) => {
            error!("job {job_id}: cannot read run generation, launch skipped: {err:#}");
            return None;
        }
    };
    let guard = match deps.job_drivers.claim(&job_id, generation) {
        Some(guard) => Some(guard),
        None => match deps.job_drivers.holder_generation(&job_id) {
            // 登记着的是上一次运行的 driver（取消后还在收尾、成功后还在善后）：这次发射不能丢，
            // 等它走了再接手。
            Some(held) if held < generation => None,
            // 同一次运行已经有 driver 了：重复发射，丢掉是对的。
            _ => {
                debug!("job {job_id}: driver already owns run {generation}; duplicate launch ignored");
                return None;
            }
        },
    };
    // driver 里打的日志都带 `job{job_id=…}`。parent 是空的：从请求里发射的 driver 不挂在那个请求的 span 下，
    // 请求早结束了，任务还要跑很久。
    let span = tracing::info_span!(parent: None, "job", job_id = %job_id);
    Some(tokio::spawn(with_driver_run(
        job_id.clone(),
        generation,
        tracing::Instrument::instrument(async move {
            let _guard = match guard {
                Some(guard) => guard,
                None => match claim_after_previous_run(&deps, &job_id, generation).await {
                    Some(guard) => guard,
                    None => return,
                },
            };
            if let Err(err) = run_job(deps.clone(), job_id.clone(), workflow).await {
                error!("job {} failed to run: {}", job_id, err);
                settle_after_driver_error(&deps, &job_id, &err).await;
                clear_job_cancel_request(&deps, &job_id).await;
            }
        }, span),
    )))
}

/// 上一次运行的 driver 还登记着：等它释放，再认领这一次运行。
/// 等的过程中行被再次重跑（代次又变了），或者别的 driver 已经接手，就放弃。
async fn claim_after_previous_run(
    deps: &ProcessRuntimeDeps,
    job_id: &str,
    generation: u64,
) -> Option<super::driver_registry::JobDriverGuard> {
    let deadline = Instant::now() + SUPERSEDED_DRIVER_MAX_WAIT;
    loop {
        if let Some(guard) = deps.job_drivers.claim(job_id, generation) {
            return Some(guard);
        }
        if deps
            .job_drivers
            .holder_generation(job_id)
            .is_some_and(|held| held >= generation)
        {
            debug!("job {job_id}: run {generation} was taken over by another driver");
            return None;
        }
        if !matches!(deps.db.job_run_generation(job_id), Ok(Some(current)) if current == generation) {
            debug!("job {job_id}: run {generation} was superseded while waiting for the previous driver");
            return None;
        }
        if Instant::now() >= deadline {
            error!(
                "job {job_id}: previous driver still registered after {}s; run {generation} not started (the periodic sweep will retry)",
                SUPERSEDED_DRIVER_MAX_WAIT.as_secs()
            );
            return None;
        }
        tokio::time::sleep(SUPERSEDED_DRIVER_POLL).await;
    }
}

/// 发射没能交给任何 driver（壳转发给 jobsd 重试后仍失败）：行还是 queued、永远没人来跑，
/// 落成「失败」并写清原因，用户能看到、能重试。行不是 queued（已经有 driver 动过它）就不碰，
/// 返回 false。
pub fn fail_unlaunched_job(deps: &ProcessRuntimeDeps, job_id: &str, reason: &str) -> Result<bool> {
    let job = deps.db.get_job(job_id)?;
    if job.status != JobStatusKind::Queued || deps.job_drivers.is_live(job_id) {
        return Ok(false);
    }
    persist_failed_job(
        deps,
        job,
        &anyhow::anyhow!("任务没能交给任务运行时，未开始执行：{reason}"),
    )?;
    Ok(true)
}

/// 当前 driver 所属的那次运行已经被取代了吗（任务被原地重跑过，行上的代次比 driver 的大）。
/// 不在 driver 里（没有钉住的代次）或读库失败都当作「没有」。
fn run_is_superseded(deps: &ProcessRuntimeDeps, job_id: &str) -> bool {
    let Some(pinned) = driver_run_generation(job_id) else {
        return false;
    };
    matches!(deps.db.job_run_generation(job_id), Ok(Some(current)) if current != pinned)
}

/// driver 以错误退出：行还是 queued/running 就落「失败」；终态已经是别人（API 取消）写的，
/// 就只把这次运行的 pipeline attempt 收尾。落库失败会重试，仍失败则打日志（运行期巡检兜底），
/// 不再静默吞掉。
async fn settle_after_driver_error(deps: &ProcessRuntimeDeps, job_id: &str, err: &anyhow::Error) {
    for attempt in 1..=FAILED_PERSIST_ATTEMPTS {
        let outcome = deps.db.get_job(job_id).and_then(|job| {
            if matches!(job.status, JobStatusKind::Queued | JobStatusKind::Running) {
                persist_failed_job(deps, job, err)
            } else {
                close_attempt_after_foreign_terminal(deps, job_id);
                Ok(())
            }
        });
        match outcome {
            Ok(()) => return,
            Err(persist_err) => {
                error!(
                    "job {job_id}: persisting the failure of a crashed driver failed (attempt {attempt}/{FAILED_PERSIST_ATTEMPTS}): {persist_err:#}"
                );
                if attempt < FAILED_PERSIST_ATTEMPTS {
                    tokio::time::sleep(FAILED_PERSIST_RETRY_DELAY).await;
                }
            }
        }
    }
    error!("job {job_id}: left in its previous state after driver failure; the periodic sweep will settle it");
}

/// 终态不是这个 driver 写的（API 取消先赢了 CAS，或 runner 内部检查点已落终态）时，pipeline attempt
/// 没人收尾，会一直停在 running，之后的译文修订登记永远 pending、原地重跑还会把它当成可续用的
/// attempt。按行上实际的终态补一次收尾（没有 running attempt 时是空操作，幂等）。
/// 这次运行已被取代时不碰：attempt 属于新的一次运行。
fn close_attempt_after_foreign_terminal(deps: &ProcessRuntimeDeps, job_id: &str) {
    if run_is_superseded(deps, job_id) {
        return;
    }
    let status = match deps.db.job_status(job_id) {
        Ok(Some(JobStatusKind::Succeeded)) => "succeeded",
        Ok(Some(JobStatusKind::Failed)) => "failed",
        Ok(Some(JobStatusKind::Canceled)) => "canceled",
        Ok(_) => return,
        Err(err) => {
            error!("job {job_id}: reading terminal status to close its pipeline attempt failed: {err:#}");
            return;
        }
    };
    if let Err(err) = deps.db.finish_latest_pipeline_attempt(job_id, status) {
        error!("job {job_id}: closing its pipeline attempt as {status} failed: {err:#}");
    }
}

async fn clear_job_cancel_request(deps: &ProcessRuntimeDeps, job_id: &str) {
    // 被取代的旧 driver 收尾时不能清：标记可能是针对新一次运行的。
    if run_is_superseded(deps, job_id) {
        return;
    }
    clear_cancel_request_with_registry(deps.canceled_jobs.as_ref(), job_id).await;
}

async fn should_skip_job_execution(deps: &ProcessRuntimeDeps, job_id: &str) -> Result<bool> {
    let job = deps.db.get_job(job_id)?;
    if is_cancel_requested_with_registry(deps.canceled_jobs.as_ref(), job_id).await
        || !matches!(job.status, JobStatusKind::Queued | JobStatusKind::Running)
    {
        clear_job_cancel_request(deps, job_id).await;
        return Ok(true);
    }
    Ok(false)
}

fn persist_queued_job(deps: &ProcessRuntimeDeps, job: &mut JobSnapshot) -> Result<bool> {
    job.status = JobStatusKind::Queued;
    job.stage = Some("queued".to_string());
    job.stage_detail = Some("任务排队中，等待可用执行槽位".to_string());
    job.updated_at = now_iso();
    job.sync_runtime_state();
    job.replace_failure_info(None);
    let updated = cas_persist_job_with_resources(
        deps.db.as_ref(),
        &deps.persist.data_root,
        &deps.persist.output_root,
        job,
        &["queued", "running"],
    )?;
    Ok(updated)
}

async fn dispatch_workflow(
    deps: ProcessRuntimeDeps,
    job: JobRuntimeState,
) -> Result<JobRuntimeState> {
    // Keep pipeline state machines out of the driver future. In debug builds,
    // nested inline workflow polling can exhaust the default runtime thread
    // stack as soon as another request yields to this background task.
    let durable_stage = deps.db.running_pipeline_stage_key(&job.job_id)?;
    match (&job.workflow, durable_stage.as_deref()) {
        (WorkflowKind::Book, Some("render")) => {
            return Box::pin(resume_render_stage_from_durable_state(deps, job)).await;
        }
        (WorkflowKind::Book, Some("translate")) => {
            return Box::pin(resume_translation_stage_from_durable_state(deps, job, true)).await;
        }
        (WorkflowKind::Translate, Some("translate")) => {
            let render_after_translation = job.request_payload.runtime.render_after_translation;
            return Box::pin(resume_translation_stage_from_durable_state(
                deps,
                job,
                render_after_translation,
            ))
            .await;
        }
        (WorkflowKind::Translate, Some("render"))
            if job.request_payload.runtime.render_after_translation =>
        {
            return Box::pin(resume_render_stage_from_durable_state(deps, job)).await;
        }
        _ => {}
    }
    match job.workflow {
        WorkflowKind::Ocr => Box::pin(execute_ocr_job(deps, job, None, None)).await,
        WorkflowKind::Book => Box::pin(run_translation_job_with_ocr(deps, job)).await,
        WorkflowKind::Translate => Box::pin(run_translate_only_job_with_ocr(deps, job)).await,
        WorkflowKind::Render => Box::pin(run_render_job_from_artifacts(deps, job)).await,
    }
}

fn persist_failed_job(
    deps: &ProcessRuntimeDeps,
    mut job: JobSnapshot,
    err: &anyhow::Error,
) -> Result<()> {
    let detail = format_error_chain(err);
    append_error_chain_log(&mut job, err);
    job.status = JobStatusKind::Failed;
    job.stage = Some("failed".to_string());
    job.stage_detail = Some(detail.clone());
    job.error = Some(detail);
    job.updated_at = now_iso();
    job.finished_at = Some(now_iso());
    job.sync_runtime_state();
    job.replace_failure_info(crate::job_failure::classify_job_failure(&job));
    let updated = cas_persist_job_with_resources(
        deps.db.as_ref(),
        &deps.persist.data_root,
        &deps.persist.output_root,
        &job,
        &["queued", "running"],
    )?;
    if updated {
        let _ = deps
            .db
            .finish_latest_pipeline_attempt(&job.job_id, "failed")?;
        publish_translation_revisions_after_terminal(deps, &job.job_id);
        maintain_document_after_terminal(
            deps,
            &job.job_id,
            job.upload_id.as_deref(),
            &JobStatusKind::Failed,
        );
    } else {
        close_attempt_after_foreign_terminal(deps, &job.job_id);
    }
    Ok(())
}

/// 取消标记在队列门被消费掉之后,由谁来落终态。
///
/// `wait_for_execution_slot` 命中取消标记时会**清掉标记并返回 None**,driver 随即
/// 退出——它不写任何状态。正常取消路径没事:`cancel_job` 紧接着就会 CAS 写
/// Canceled。但取消 OCR 任务(`workflow = ocr`)时 `cancel_job` 在 `stage != "queued"` 时**完全不写
/// DB**(它把落终态的责任交给 runner 的取消检查点,好让 runner 先做 provider 清理),
/// 于是出现一个没人收尾的空洞:标记没了、driver 走了、DB 行还停在 queued/running,
/// 而且再没有 driver 会来驱动它。用户看到的是永久转圈,连重跑都点不了——
/// `rerun` 对 queued/running 直接 conflict。
///
/// 这里补上收尾。用 CAS 是因为 runner 的检查点或 `cancel_job` 可能已经抢先写过了,
/// 那种情况下应当尊重它们写的结果,而不是覆盖。
fn persist_canceled_job(deps: &ProcessRuntimeDeps, job_id: &str) -> Result<()> {
    let mut job = deps.db.get_job(job_id)?;
    if !matches!(
        job.status,
        JobStatusKind::Queued | JobStatusKind::Running
    ) {
        close_attempt_after_foreign_terminal(deps, job_id);
        return Ok(());
    }
    job.status = JobStatusKind::Canceled;
    job.stage = Some("canceled".to_string());
    job.stage_detail = Some("任务已取消".to_string());
    job.updated_at = now_iso();
    job.finished_at = Some(now_iso());
    job.pid = None;
    job.sync_runtime_state();
    job.replace_failure_info(None);
    let updated = cas_persist_job_with_resources(
        deps.db.as_ref(),
        &deps.persist.data_root,
        &deps.persist.output_root,
        &job,
        &["queued", "running"],
    )?;
    if updated {
        let _ = deps
            .db
            .finish_latest_pipeline_attempt(&job.job_id, "canceled")?;
        publish_translation_revisions_after_terminal(deps, &job.job_id);
        maintain_document_after_terminal(
            deps,
            &job.job_id,
            job.upload_id.as_deref(),
            &JobStatusKind::Canceled,
        );
    } else {
        close_attempt_after_foreign_terminal(deps, &job.job_id);
    }
    Ok(())
}

async fn run_job<F, Fut>(deps: ProcessRuntimeDeps, job_id: String, workflow: F) -> Result<()>
where
    F: FnOnce(ProcessRuntimeDeps, JobRuntimeState) -> Fut,
    Fut: std::future::Future<Output = Result<JobRuntimeState>>,
{
    // 行已经是更新的一次运行（取消后立刻原地重跑）：这个 driver 属于上一次运行，什么都不做。
    if run_is_superseded(&deps, &job_id) {
        return Ok(());
    }
    // 这里也会消费掉取消标记然后早退,和队列门是同一个洞,只是更早。
    // `persist_canceled_job` 自带「只在 queued/running 时写」的守卫,所以
    // 「行已终态」那个分支调用它是安全的空操作。
    if should_skip_job_execution(&deps, &job_id).await? {
        persist_canceled_job(&deps, &job_id)?;
        return Ok(());
    }
    let mut job = deps.db.get_job(&job_id)?;
    if !persist_queued_job(&deps, &mut job)? {
        clear_job_cancel_request(&deps, &job_id).await;
        return Ok(());
    }

    let _permit = match wait_for_execution_slot(
        deps.db.as_ref(),
        deps.canceled_jobs.as_ref(),
        &deps.job_slots,
        &job_id,
        deps.job_runner_config().queue_poll_interval_ms,
    )
    .await?
    {
        Some(permit) => permit,
        // 队列门已经把取消标记清掉了,这里必须补一次终态,否则任务会挂着没人管。
        None => {
            persist_canceled_job(&deps, &job_id)?;
            return Ok(());
        }
    };

    // 排队等槽位可能等很久，期间任务可能被取消并原地重跑。
    if run_is_superseded(&deps, &job_id) {
        return Ok(());
    }
    if should_skip_job_execution(&deps, &job_id).await? {
        return Ok(());
    }
    let finished_job = workflow(deps.clone(), deps.db.get_job(&job_id)?.into_runtime()).await?;
    let updated = crate::job_events::cas_persist_job_with_resources(
        deps.db.as_ref(),
        &deps.persist.data_root,
        &deps.persist.output_root,
        &finished_job.snapshot(),
        &["queued", "running"],
    )?;
    if !updated {
        // Already terminal (e.g., canceled), do not overwrite with Succeeded/Failed
        if run_is_superseded(&deps, &job_id) {
            // 任务已被原地重跑：行和 attempt 都是新一次运行的，这个 driver 到此为止。
            return Ok(());
        }
        // 终态是 API 取消（或别的检查点）写的：它们不收尾 attempt，由这里补。
        close_attempt_after_foreign_terminal(&deps, &job_id);
        publish_translation_revisions_after_terminal(&deps, &job_id);
        release_document_after_foreign_terminal(&deps, &job_id);
        clear_job_cancel_request(&deps, &job_id).await;
        return Ok(());
    }
    let terminal_status = match finished_job.status {
        JobStatusKind::Succeeded => "succeeded",
        JobStatusKind::Failed => "failed",
        JobStatusKind::Canceled => "canceled",
        JobStatusKind::Queued | JobStatusKind::Running => "failed",
    };
    let _ = deps
        .db
        .finish_latest_pipeline_attempt(&job_id, terminal_status)?;
    // 精修在渲染子进程里写回、绕过了 PATCH：attempt 收尾后把修订登记进实时译文。
    publish_translation_revisions_after_terminal(&deps, &job_id);
    update_document_after_job(&deps, &finished_job);
    clear_job_cancel_request(&deps, &job_id).await;
    Ok(())
}

/// 任务终态后的图书馆维护:job 归属 document、置 active_job_id、重建
/// 该文档的 FTS 全文索引。全部尽力而为——FTS 是可重建的派生索引,
/// 这里失败只记日志,绝不影响任务状态。
fn update_document_after_job(deps: &ProcessRuntimeDeps, job: &JobRuntimeState) {
    maintain_document_after_terminal(deps, &job.job_id, job.upload_id.as_deref(), &job.status);
}

/// 所有终态出口(成功 / 失败 / driver 报错 / 取消)共用的图书馆维护。
fn maintain_document_after_terminal(
    deps: &ProcessRuntimeDeps,
    job_id: &str,
    upload_id: Option<&str>,
    status: &JobStatusKind,
) {
    maintain_document_for_terminal(&deps.config, &deps.db, job_id, upload_id, status);
}

/// `maintain_document_after_terminal` 的本体,只要配置和库:启动恢复(`startup_recovery`)没有
/// 运行时依赖,但它写终态时同样要维护书卡和全文索引。
pub(super) fn maintain_document_for_terminal(
    config: &AppConfig,
    db: &Db,
    job_id: &str,
    upload_id: Option<&str>,
    status: &JobStatusKind,
) {
    let Some(document_id) = job_document(config, db, job_id, upload_id) else {
        return;
    };
    if *status != JobStatusKind::Succeeded {
        // 提交时指针已经给了它;它没成功,书卡别停在失败任务上(规则见
        // `release_document_active_job`)。
        if let Err(error) = db.release_document_active_job(&document_id, job_id) {
            error!("library: release active job {job_id} for {document_id} failed: {error}");
        }
        return;
    }
    // 书卡该展示哪个任务：不再无条件覆盖（旧任务后完成会顶掉正在跑的新任务，纯 OCR 会顶掉
    // 翻译好的任务）。规则见 `active_job::active_job_after_success`。
    if let Some(next) = next_active_job(db, &document_id, job_id) {
        if let Err(error) = db.set_document_active_job(&document_id, &next, None) {
            error!("library: set active job for {document_id} failed: {error}");
        }
    }
    // 按这本书所有成功任务重建索引（每页取最新的那个）。只索引刚完成的这个任务的话，翻完
    // 1-5 页再翻 6-10 页，前 5 页就搜不到了。
    if let Err(error) = db.rebuild_document_fts(&document_id) {
        error!("library: fts rebuild for {document_id} failed: {error}");
    }
}

/// 终态不是 driver 写的(CAS 没更新)时的书卡收尾。
///
/// 经 API 取消 OCR 任务且已过排队阶段时(`cancel_job` 遇到 `workflow = ocr`),API 不写 DB,
/// 由 runner 的取消检查点(`save_ocr_job`)落 Canceled;runner 内部别的检查点也可能自己
/// 落 Failed。这些写法都不走任何书卡回退,driver 是最后一个知道任务结束了的地方。
/// 只做「没成功 → 退回」这一半:`release_document_active_job` 只在书卡仍指着它时生效,
/// 若终态是 API 的 `cancel_job` 写的,它已经退回过,这里自然是空操作。
fn release_document_after_foreign_terminal(deps: &ProcessRuntimeDeps, job_id: &str) {
    let job = match deps.db.get_job(job_id) {
        Ok(job) => job,
        Err(error) => {
            error!("library: reload job {job_id} after foreign terminal failed: {error}");
            return;
        }
    };
    if matches!(job.status, JobStatusKind::Canceled | JobStatusKind::Failed) {
        maintain_document_after_terminal(deps, job_id, job.upload_id.as_deref(), &job.status);
    }
}

/// 任务属于哪本书:有 upload_id 就按它关联(并写回 jobs.document_id);没有 —— 重新渲染、
/// 重试、继续/重跑这些派生任务只带 artifact_job_id —— 就用提交时继承下来的 jobs.document_id;
/// 都没有(从 source_url 建的任务)就把它的原文 PDF 登记成一本书。
/// 以前没有 upload_id 直接跳过,这些任务成功后不纠正书卡、不重建全文索引。
fn job_document(config: &AppConfig, db: &Db, job_id: &str, upload_id: Option<&str>) -> Option<String> {
    if let Some(upload_id) = upload_id.filter(|id| !id.is_empty()) {
        match db.link_job_to_document(job_id, upload_id) {
            Ok(Some(document_id)) => return Some(document_id),
            Ok(None) => {}
            Err(error) => error!("library: link job {job_id} to document failed: {error}"),
        }
    }
    match db.document_id_for_job(job_id) {
        Ok(Some(document_id)) => Some(document_id),
        Ok(None) => adopt_source_document(config, db, job_id),
        Err(error) => {
            error!("library: resolve document for job {job_id} failed: {error}");
            None
        }
    }
}

/// 既没有上传、也没继承到书的任务（从 `source_url` 建的）：把它的原文 PDF 登记成一本书（见 `source_document`）。
fn adopt_source_document(config: &AppConfig, db: &Db, job_id: &str) -> Option<String> {
    let job = match db.get_job(job_id) {
        Ok(job) => job,
        Err(error) => {
            error!("library: reload job {job_id} to adopt its source pdf failed: {error}");
            return None;
        }
    };
    match super::adopt_job_source_document(config, db, &job) {
        Ok(document_id) => document_id,
        Err(error) => {
            error!("library: adopt source pdf of job {job_id} failed: {error}");
            None
        }
    }
}

fn next_active_job(db: &Db, document_id: &str, finished_job_id: &str) -> Option<String> {
    use super::active_job::{active_job_after_success, ActiveCandidate};
    fn candidate(job: &JobSnapshot) -> ActiveCandidate<'_> {
        ActiveCandidate {
            job_id: &job.job_id,
            created_at: &job.created_at,
            workflow: &job.workflow,
            status: &job.status,
        }
    }
    let finished = db.get_job(finished_job_id).ok()?;
    let current = db
        .get_document(document_id)
        .ok()
        .and_then(|document| document.active_job_id)
        .filter(|id| !id.is_empty())
        .and_then(|id| db.get_job(&id).ok());
    let jobs = db.list_jobs_for_document(document_id, 500, 0).unwrap_or_default();
    let newest_translation = jobs
        .iter()
        .filter(|job| job.status == JobStatusKind::Succeeded && job.workflow != WorkflowKind::Ocr)
        .max_by(|a, b| (&a.created_at, &a.job_id).cmp(&(&b.created_at, &b.job_id)));
    active_job_after_success(
        current.as_ref().map(candidate),
        candidate(&finished),
        newest_translation.map(candidate),
    )
}
