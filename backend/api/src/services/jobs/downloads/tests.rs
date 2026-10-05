use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use crate::db::Db;
use crate::error::AppError;
use crate::models::api::PagePreviewQuery;
use crate::models::domain::{CreateJobInput, JobArtifacts, JobSnapshot};
use crate::services::download_generation::DownloadGeneration;

use super::JobDownloads;

const JOB_ID: &str = "preview-job";

struct Fixture {
    root: PathBuf,
    db: Db,
    generation: Arc<DownloadGeneration>,
    renderer: String,
}

impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("retain-download-test-{}", fastrand::u64(..)));
        let job_root = root.join("jobs").join(JOB_ID);
        fs::create_dir_all(&job_root).unwrap();
        fs::write(job_root.join("source.pdf"), b"source").unwrap();
        fs::write(job_root.join("translated.pdf"), b"translated").unwrap();
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        let mut job = JobSnapshot::new(JOB_ID.into(), CreateJobInput::default(), vec![]);
        job.artifacts = Some(JobArtifacts {
            job_root: Some(format!("jobs/{JOB_ID}")),
            source_pdf: Some(format!("jobs/{JOB_ID}/source.pdf")),
            output_pdf: Some(format!("jobs/{JOB_ID}/translated.pdf")),
            ..Default::default()
        });
        db.save_job(&job).unwrap();

        // Exercise the actual subprocess boundary without requiring PyMuPDF.
        // The bounded release barrier also makes a runtime-blocking regression
        // fail instead of hanging the test indefinitely.
        let renderer = root.join("renderer");
        fs::write(
            &renderer,
            r#"#!/bin/sh
printf 'render\n' >> "$0.calls"
remaining=250
while [ ! -f "$0.release" ]; do
    remaining=$((remaining - 1))
    [ "$remaining" -gt 0 ] || exit 1
    sleep 0.02
done
printf 'offline preview bytes' > "$4"
"#,
        )
        .unwrap();
        fs::set_permissions(&renderer, fs::Permissions::from_mode(0o755)).unwrap();
        Self {
            root,
            db,
            generation: Arc::new(DownloadGeneration::default()),
            renderer: renderer.to_string_lossy().into_owned(),
        }
    }

    fn downloads(&self) -> JobDownloads<'_> {
        JobDownloads::new(
            &self.db,
            &self.root,
            &self.root,
            &self.generation,
            &self.renderer,
            "unused-pipeline",
            None,
        )
    }

    async fn wait_started(&self) {
        tokio::time::timeout(Duration::from_secs(3), async {
            while !self.root.join("renderer.calls").exists() {
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await
        .expect("renderer starts");
    }

    async fn release_when_started(&self) {
        self.wait_started().await;
        // This timer must run even with a single Tokio worker and a waiting
        // subprocess. The renderer only exits successfully after this write.
        tokio::time::sleep(Duration::from_millis(10)).await;
        fs::write(self.root.join("renderer.release"), b"release").unwrap();
    }

    fn render_count(&self) -> usize {
        fs::read_to_string(self.root.join("renderer.calls"))
            .unwrap_or_default()
            .lines()
            .count()
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn preview(kind: &str, width: u32, dpi: u32) -> PagePreviewQuery {
    PagePreviewQuery {
        kind: kind.into(),
        width: Some(width),
        dpi: Some(dpi),
    }
}

#[tokio::test(flavor = "current_thread")]
async fn same_normalized_preview_shares_cache_miss_and_keeps_runtime_responsive() {
    let fixture = Fixture::new();
    let downloads = fixture.downloads();
    let wide = preview(" SOURCE ", 9999, 999);
    let normalized = preview("source", 2400, 300);
    let (first, second, ()) = tokio::join!(
        downloads.page_preview_download(JOB_ID, 1, &wide),
        downloads.page_preview_download(JOB_ID, 1, &normalized),
        fixture.release_when_started(),
    );
    let first = first.unwrap();
    assert_eq!(first.path, second.unwrap().path);
    assert_eq!(
        first.path.file_name().unwrap(),
        "preview-source-p0001-w2400-d300.jpg"
    );
    assert_eq!(fixture.render_count(), 1);
    let cached = downloads
        .page_preview_download(JOB_ID, 1, &normalized)
        .await
        .unwrap();
    assert_eq!(cached.path, first.path);
    assert_eq!(
        fixture.render_count(),
        1,
        "completed requests use the file cache"
    );
}

#[tokio::test]
async fn different_preview_specs_never_share_results() {
    let fixture = Fixture::new();
    let downloads = fixture.downloads();
    let source = preview("source", 1200, 0);
    let translated = preview("translated", 1200, 0);
    let (first, second, ()) = tokio::join!(
        downloads.page_preview_download(JOB_ID, 1, &source),
        downloads.page_preview_download(JOB_ID, 1, &translated),
        fixture.release_when_started(),
    );
    let first = first.unwrap().path;
    assert_ne!(first, second.unwrap().path);
    let other_page = downloads
        .page_preview_download(JOB_ID, 2, &source)
        .await
        .unwrap()
        .path;
    let other_width = downloads
        .page_preview_download(JOB_ID, 1, &preview("source", 1600, 0))
        .await
        .unwrap()
        .path;
    let other_dpi = downloads
        .page_preview_download(JOB_ID, 1, &preview("source", 1200, 72))
        .await
        .unwrap()
        .path;
    let paths = [first, other_page, other_width, other_dpi]
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(paths.len(), 4);
    assert_eq!(fixture.render_count(), 5);
}

#[tokio::test(flavor = "current_thread")]
async fn cover_and_thumbnail_share_duplicate_requests_but_not_each_other() {
    let fixture = Fixture::new();
    let downloads = fixture.downloads();
    let (cover, duplicate_cover, thumbnail, ()) = tokio::join!(
        downloads.cover_download(JOB_ID),
        downloads.cover_download(JOB_ID),
        downloads.thumbnail_download(JOB_ID),
        fixture.release_when_started(),
    );
    let cover = cover.unwrap().path;
    assert_eq!(cover, duplicate_cover.unwrap().path);
    assert_ne!(cover, thumbnail.unwrap().path);
    assert_eq!(fixture.render_count(), 2);
    downloads.cover_download(JOB_ID).await.unwrap();
    downloads.thumbnail_download(JOB_ID).await.unwrap();
    assert_eq!(fixture.render_count(), 2);
}

#[tokio::test]
async fn canceled_preview_request_leaves_one_live_writer_for_next_caller() {
    let fixture = Arc::new(Fixture::new());
    let owner = fixture.clone();
    let first = tokio::spawn(async move {
        owner
            .downloads()
            .page_preview_download(JOB_ID, 1, &preview("source", 1200, 0))
            .await
    });
    fixture.wait_started().await;
    first.abort();
    assert!(first.await.unwrap_err().is_cancelled());
    let downloads = fixture.downloads();
    let query = preview("source", 1200, 0);
    let (joined, ()) = tokio::join!(
        downloads.page_preview_download(JOB_ID, 1, &query),
        fixture.release_when_started(),
    );
    assert!(joined.unwrap().path.is_file());
    assert_eq!(fixture.render_count(), 1);
}

#[tokio::test]
async fn preview_validation_keeps_job_scope_before_parameter_errors() {
    let fixture = Fixture::new();
    let downloads = fixture.downloads();
    let invalid = preview("invalid", 0, 0);
    assert!(matches!(
        downloads
            .page_preview_download("missing", 0, &invalid)
            .await,
        Err(AppError::NotFound(_))
    ));
    assert!(matches!(
        downloads.page_preview_download(JOB_ID, 0, &invalid).await,
        Err(AppError::BadRequest(_))
    ));
    assert!(matches!(
        downloads
            .page_preview_download(JOB_ID, 0, &preview("source", 1200, 0))
            .await,
        Err(AppError::BadRequest(_))
    ));
    assert_eq!(fixture.render_count(), 0);
}

#[tokio::test(flavor = "current_thread")]
async fn document_images_use_the_same_bounded_generation_without_jobs() {
    use crate::config::AssetConfig;
    use crate::models::domain::{now_iso, UploadRecord};
    use crate::services::library::api::{document_cover_download, document_thumbnail_download};
    use crate::services::library::LibraryDeps;

    let fixture = Fixture::new();
    let document_id = crate::db::documents::sha256_hex(b"source");
    fixture
        .db
        .save_upload_with_document(&UploadRecord {
            upload_id: "document-upload".into(),
            filename: "source.pdf".into(),
            stored_path: fixture
                .root
                .join("jobs")
                .join(JOB_ID)
                .join("source.pdf")
                .to_string_lossy()
                .into_owned(),
            bytes: 6,
            page_count: 1,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: document_id.clone(),
        })
        .unwrap();
    let asset_config = AssetConfig::default();
    let deps = LibraryDeps {
        db: &fixture.db,
        data_root: &fixture.root,
        output_root: &fixture.root,
        downloads_dir: &fixture.root,
        scripts_dir: &fixture.root,
        python_bin: &fixture.renderer,
        asset_config: &asset_config,
    };
    let (first, duplicate, thumbnail, ()) = tokio::join!(
        document_cover_download(&deps, &fixture.generation, &document_id),
        document_cover_download(&deps, &fixture.generation, &document_id),
        document_thumbnail_download(&deps, &fixture.generation, &document_id),
        fixture.release_when_started(),
    );
    let cover_path = first.unwrap().path;
    assert_eq!(cover_path, duplicate.unwrap().path);
    let document_root = fixture.root.join("documents").join(document_id);
    assert_eq!(cover_path, document_root.join("cover.jpg"));
    assert_eq!(thumbnail.unwrap().path, document_root.join("thumbnail.jpg"));
    assert_eq!(fixture.render_count(), 2);
}
