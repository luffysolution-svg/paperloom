use std::sync::Arc;

use axum::body::to_bytes;

use crate::app::build_state;
use crate::test_support::config::TestDirs;

// 一页、指定尺寸的最小 PDF 在底座包里（书库包的测试也用），这里转一下，原有写法不变。
pub(crate) use retainpdf_api_base::test_fixtures::minimal_pdf_bytes;

pub(crate) fn test_state(test_name: &str) -> crate::AppState {
    let dirs = TestDirs::create(&format!(
        "rust-api-query-routes-{test_name}-{}",
        fastrand::u64(..)
    ));
    build_state(Arc::new(dirs.config())).expect("build state")
}

pub(crate) async fn read_json(response: axum::response::Response) -> serde_json::Value {
    serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("read body"),
    )
    .expect("parse json")
}


/// 一份合并阅读的虚拟任务：库里有它的基底任务 `job-base`，合并目录里有说明文件和 `translated/`。
/// 返回虚拟任务 id 和合并目录（没有 `artifacts/`、`logs/`）。
pub(crate) fn seed_virtual_job(state: &crate::AppState) -> (String, std::path::PathBuf) {
    use crate::models::{CreateJobInput, JobSnapshot};

    let base = JobSnapshot::new("job-base".to_string(), CreateJobInput::default(), vec![]);
    state.db.save_job(&base).expect("save base job");
    let id = crate::storage_paths::MergedJobId {
        document_id: "a".repeat(64),
        fingerprint: "0123456789abcdef".to_string(),
    };
    let root = id.root(&state.config.data_root);
    std::fs::create_dir_all(root.join("translated")).expect("merged dir");
    std::fs::write(
        root.join("reading.json"),
        serde_json::json!({
            "document_id": id.document_id,
            "base_job_id": "job-base",
            "contributing_job_ids": ["job-base"],
            "page_count": 2,
            "source_pdf": "uploads/up-1/book.pdf",
        })
        .to_string(),
    )
    .expect("sidecar");
    (id.format(), root)
}

/// 给任务建一个旧布局的目录（`originPDF/`），`load_supported_job` 会拒绝它。
pub(crate) fn seed_legacy_layout_job(state: &crate::AppState, job_id: &str) {
    use crate::models::domain::JobArtifacts;
    use crate::models::{CreateJobInput, JobSnapshot};

    let root = state.config.data_root.join("jobs").join(job_id);
    std::fs::create_dir_all(root.join("originPDF")).expect("legacy dir");
    let mut job = JobSnapshot::new(job_id.to_string(), CreateJobInput::default(), vec![]);
    job.artifacts = Some(JobArtifacts {
        job_root: Some(format!("jobs/{job_id}")),
        ..JobArtifacts::default()
    });
    state.db.save_job(&job).expect("save legacy job");
}
