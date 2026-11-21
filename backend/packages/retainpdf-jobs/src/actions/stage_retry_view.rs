use serde_json::{json, Value};

use retainpdf_files::build_job_actions;
use crate::views::{
    build_job_links_with_workflow, AmbiguousRequestPolicy, EscalatedItemView, LastRefineView,
    RetryStageKind, LAST_REFINE_ESCALATED_LIMIT, RetryStageSubmissionView, StageActionsView,
    StageRetryActionLinkView, StageRetryActionView,
};
use retainpdf_core::models::domain::{JobSnapshot, JobStatusKind, WorkflowKind};
use crate::actions::stage_plan::{stage_name, stage_plans, JobStagePlan};

pub(super) fn build_stage_actions_view(
    base_url: &str,
    job: &JobSnapshot,
    data_root: &Path,
) -> StageActionsView {
    StageActionsView {
        job_id: job.job_id.clone(),
        stages: stage_plans(job, data_root)
            .into_iter()
            .map(|plan| {
                let refine = matches!(plan.stage, RetryStageKind::Refine);
                let mut view = build_stage_action(base_url, job, plan);
                if refine {
                    view.last_refine = last_refine(job, data_root);
                }
                view
            })
            .collect(),
    }
}

pub(super) fn build_retry_stage_submission_view(
    base_url: &str,
    source_job_id: &str,
    job: &JobSnapshot,
    stage: RetryStageKind,
    reused_artifacts: Vec<String>,
    rerun_stages: Vec<String>,
    workflow: WorkflowKind,
    ambiguous_request_policy: AmbiguousRequestPolicy,
) -> RetryStageSubmissionView {
    let mut view_job = job.clone();
    view_job.workflow = workflow.clone();
    RetryStageSubmissionView {
        job_id: job.job_id.clone(),
        source_job_id: source_job_id.to_string(),
        status: JobStatusKind::Queued,
        workflow: workflow.clone(),
        rerun_from_stage: stage,
        reused_artifacts,
        rerun_stages,
        ambiguous_request_policy,
        links: build_job_links_with_workflow(&job.job_id, &workflow, base_url),
        actions: build_job_actions(&view_job, base_url, false, false, false),
    }
}

fn build_stage_action(
    base_url: &str,
    job: &JobSnapshot,
    plan: JobStagePlan,
) -> StageRetryActionView {
    let action = plan.can_retry.then(|| StageRetryActionLinkView {
        method: "POST".to_string(),
        url: absolute_url(
            base_url,
            &format!("/api/v1/jobs/{}/actions/retry-stage", job.job_id),
        ),
        body: if matches!(plan.stage, RetryStageKind::Refine) {
            // 精修只支持原地执行；body 直接给出能用的默认请求（全书、挑错并修改）。
            json!({
                "stage": stage_name(&plan.stage),
                "create_new_job": false,
                "ambiguous_request_policy": "block",
                "refine": {"mode": "review_and_fix"}
            })
        } else {
            json!({
                "stage": stage_name(&plan.stage),
                "ambiguous_request_policy": "block"
            })
        },
    });
    StageRetryActionView {
        stage: plan.stage,
        label: plan.label,
        can_retry: plan.can_retry,
        reason: plan.disabled_reason.clone(),
        disabled_reason: plan.disabled_reason,
        disabled_code: plan.disabled_code,
        action,
        will_reuse: plan.will_reuse,
        will_rerun: plan.will_rerun,
        danger: plan.danger,
        last_refine: None,
    }
}

/// 上次精修报告的摘要;没有或读不了为 None(读不了不影响能不能精修)。
fn last_refine(job: &JobSnapshot, data_root: &Path) -> Option<LastRefineView> {
    let path = retainpdf_core::storage_paths::resolve_refine_report(job, data_root)?;
    let report: Value = serde_json::from_slice(&std::fs::read(path).ok()?).ok()?;
    let int = |value: &Value| value.as_i64().unwrap_or(0);
    let review = &report["review"];
    let candidate = int(&review["candidate_item_count"]);
    let escalated = report["editorial"]["escalated"].as_array().cloned().unwrap_or_default();
    let reviewed = int(&review["reviewed_item_count"]);
    Some(LastRefineView {
        status: report["status"].as_str().unwrap_or("").to_string(),
        generated_at: report["generated_at"].as_str().unwrap_or("").to_string(),
        finding_count: int(&review["summary"]["finding_count"]),
        applied: int(&report["fix_summary"]["applied"]),
        reviewed_item_count: reviewed,
        candidate_item_count: candidate,
        unreviewed_item_count: review["unreviewed_item_count"]
            .as_i64()
            .unwrap_or((candidate - reviewed).max(0)),
        next_page: review["next_page"].as_i64(),
        stopped_reason: report["stopped_reason"].as_str().map(str::to_string),
        mode: report["mode"].as_str().unwrap_or("").to_string(),
        escalated_count: escalated.len() as i64,
        escalated: escalated
            .iter()
            .take(LAST_REFINE_ESCALATED_LIMIT)
            .map(|row| EscalatedItemView {
                item_id: row["item_id"].as_str().unwrap_or("").to_string(),
                page_number: int(&row["page_number"]),
                reason: row["reason"].as_str().unwrap_or("").to_string(),
            })
            .collect(),
    })
}

fn absolute_url(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}
use std::path::Path;

#[cfg(test)]
mod tests {
    use retainpdf_core::models::domain::{JobSnapshot, WorkflowKind};
    use retainpdf_core::models::request::CreateJobInput;

    use super::*;
    use crate::views::RetryStageRequest;

    /// GET actions 给出的 `action.body` 必须能原样 POST 回 retry-stage：
    /// `RetryStageRequest` 拒绝不认识的字段，这里钉住后端自己给的 body 不会被自己拒绝。
    #[test]
    fn returned_action_bodies_are_accepted_by_the_strict_request_type() {
        let job = JobSnapshot::new("job-body-roundtrip".to_string(), CreateJobInput::default(), Vec::new());
        for stage in [
            RetryStageKind::Ocr,
            RetryStageKind::Translation,
            RetryStageKind::Render,
            RetryStageKind::Refine,
        ] {
            let plan = JobStagePlan {
                stage: stage.clone(),
                label: String::new(),
                can_retry: true,
                disabled_reason: String::new(),
                disabled_code: None,
                will_reuse: Vec::new(),
                will_rerun: Vec::new(),
                retry_workflow: WorkflowKind::Render,
                danger: false,
            };
            let view = build_stage_action("http://api.test", &job, plan);
            let body = view.action.expect("enabled stage has an action").body;
            let request: RetryStageRequest = serde_json::from_value(body.clone())
                .unwrap_or_else(|error| panic!("{stage:?} body {body} rejected: {error}"));
            assert_eq!(request.stage, stage);
        }
    }

    #[test]
    fn retry_stage_request_rejects_unknown_fields() {
        let error = serde_json::from_value::<RetryStageRequest>(
            serde_json::json!({"stage": "render", "createNewJob": false}),
        )
        .expect_err("unknown field must be rejected");
        assert!(error.to_string().contains("unknown field `createNewJob`"), "{error}");
    }
}
