use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::api_tests::jobs_common::{read_json, test_state};
use crate::app::build_app;
use crate::models::{JobArtifacts, JobStatusKind};

use super::common::{
    seed_ocr_checkpoint_files, seed_translation_result_files, source_job_with_artifacts,
};

#[tokio::test]
async fn resource_admission_keeps_the_previous_pdf_when_rerun_is_refused() {
    for (reason, status) in [
        ("insufficient_storage", StatusCode::SERVICE_UNAVAILABLE),
        ("queue_full", StatusCode::TOO_MANY_REQUESTS),
    ] {
        let mut state = test_state(reason);
        let id = "resource-admission-source";
        let mut source = source_job_with_artifacts(
            id,
            JobArtifacts {
                source_pdf: Some(format!("jobs/{id}/source/input.pdf")),
                normalized_document_json: Some(format!("jobs/{id}/ocr/document.v1.json")),
                translations_dir: Some(format!("jobs/{id}/translated")),
                output_pdf: Some(format!("jobs/{id}/rendered/out.pdf")),
                ..JobArtifacts::default()
            },
        );
        source.status = JobStatusKind::Succeeded;
        seed_translation_result_files(&state, &source);
        let pdf = state
            .config
            .data_root
            .join(format!("jobs/{id}/rendered/out.pdf"));
        std::fs::create_dir_all(pdf.parent().unwrap()).unwrap();
        std::fs::write(&pdf, b"previous translated PDF").unwrap();
        state.db.save_job(&source).unwrap();
        let mut config = (*state.config).clone();
        if reason == "insufficient_storage" {
            config.min_free_disk_bytes = u64::MAX;
        } else {
            config.job_runner.max_queued_jobs = 1;
            let waiting = crate::models::JobSnapshot::new(
                "waiting".into(),
                crate::models::CreateJobInput::default(),
                vec![],
            );
            state.db.save_job(&waiting).unwrap();
        }
        state.config = std::sync::Arc::new(config);
        let response = build_app(state.clone())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/v1/jobs/{id}/rerun"))
                    .header("X-API-Key", "test-key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), status);
        assert_eq!(
            read_json(response).await["error"]["details"]["reason"],
            reason
        );
        assert_eq!(std::fs::read(pdf).unwrap(), b"previous translated PDF");
        assert_eq!(
            state.db.get_job(id).unwrap().status,
            JobStatusKind::Succeeded
        );
        let root = state.config.project_root.clone();
        drop(state);
        std::fs::remove_dir_all(root).unwrap();
    }
}

#[tokio::test]
async fn rerun_route_prefers_render_when_translations_are_available() {
    let state = test_state("rerun-render");
    let mut source_job = source_job_with_artifacts(
        "job-rerun-render-source",
        JobArtifacts {
            source_pdf: Some("jobs/source/source/input.pdf".to_string()),
            normalized_document_json: Some("jobs/source/ocr/document.v1.json".to_string()),
            translations_dir: Some("jobs/source/translated".to_string()),
            ..JobArtifacts::default()
        },
    );
    source_job.status = JobStatusKind::Succeeded;
    seed_translation_result_files(&state, &source_job);
    state.db.save_job(&source_job).expect("save source job");

    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/jobs/job-rerun-render-source/rerun")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("rerun request"),
        )
        .await
        .expect("rerun response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = read_json(response).await;
    assert_eq!(payload["data"]["workflow"], "render");
    let rerun_job_id = payload["data"]["job_id"].as_str().expect("job id");
    assert_eq!(rerun_job_id, "job-rerun-render-source");
    let rerun_job = state.db.get_job(rerun_job_id).expect("rerun job");
    assert_eq!(rerun_job.workflow, crate::models::WorkflowKind::Render);
    assert_eq!(rerun_job.status, JobStatusKind::Queued);
    assert_eq!(
        rerun_job.request_payload.source.artifact_job_id,
        "job-rerun-render-source"
    );
    assert_eq!(
        rerun_job.request_payload.runtime.job_id,
        "job-rerun-render-source"
    );
}

#[tokio::test]
async fn rerun_route_uses_book_when_only_ocr_checkpoint_is_available() {
    let state = test_state("rerun-book");
    let mut source_job = source_job_with_artifacts(
        "job-rerun-book-source",
        JobArtifacts {
            source_pdf: Some("jobs/source/source/input.pdf".to_string()),
            normalized_document_json: Some("jobs/source/ocr/document.v1.json".to_string()),
            ..JobArtifacts::default()
        },
    );
    source_job.status = JobStatusKind::Failed;
    seed_ocr_checkpoint_files(&state, &source_job);
    state.db.save_job(&source_job).expect("save source job");

    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/jobs/job-rerun-book-source/rerun")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("rerun request"),
        )
        .await
        .expect("rerun response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = read_json(response).await;
    assert_eq!(payload["data"]["workflow"], "book");
    let rerun_job_id = payload["data"]["job_id"].as_str().expect("job id");
    let rerun_job = state.db.get_job(rerun_job_id).expect("rerun job");
    assert_eq!(rerun_job.workflow, crate::models::WorkflowKind::Book);
    assert_eq!(
        rerun_job.request_payload.source.artifact_job_id,
        "job-rerun-book-source"
    );
}
