use super::*;
use serde_json::json;

fn pair() -> (crate::AppState, Vec<String>) {
    let state = setup("batch-download", true);
    let first = link_export_job_to_document(&state);
    let mut first_job = state.db.get_job(JOB_ID).unwrap();
    first_job.artifacts.as_mut().unwrap().source_pdf =
        Some("uploads/batch-export/paper.pdf".into());
    state.db.save_job(&first_job).unwrap();
    let upload = UploadRecord {
        upload_id: "second-upload".into(),
        filename: "Batch export.pdf".into(),
        stored_path: state
            .config
            .uploads_dir
            .join("second.pdf")
            .to_string_lossy()
            .into_owned(),
        bytes: 10,
        page_count: 1,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: "second-document".into(),
    };
    fs::write(&upload.stored_path, b"%PDF second").unwrap();
    state.db.save_upload(&upload).unwrap();
    state.db.upsert_document_from_upload(&upload).unwrap();
    let mut job = state.db.get_job(JOB_ID).unwrap();
    let second_id = "batch-second-job";
    let second_root = state.config.output_root.join(second_id);
    copy_dir(&state.config.output_root.join(JOB_ID), &second_root);
    fs::write(
        second_root.join("md/images/page-1/chart a.png"),
        b"second-image",
    )
    .unwrap();
    job.job_id = second_id.into();
    job.request_payload.runtime.job_id = second_id.into();
    job.request_payload.source.upload_id = upload.upload_id.clone();
    let artifacts = job.artifacts.as_mut().unwrap();
    artifacts.job_root = Some(format!("jobs/{second_id}"));
    artifacts.normalized_document_json =
        Some(format!("jobs/{second_id}/ocr/normalized/document.v1.json"));
    artifacts.translations_dir = Some(format!("jobs/{second_id}/translated"));
    artifacts.output_pdf = Some(format!("jobs/{second_id}/rendered/out.pdf"));
    artifacts.source_pdf = Some("uploads/second.pdf".into());
    state.db.save_job(&job).unwrap();
    state
        .db
        .link_job_to_document(second_id, &upload.upload_id)
        .unwrap();
    (state, vec![first, upload.content_hash])
}

async fn download(state: &crate::AppState, view: &serde_json::Value) -> Vec<(String, Vec<u8>)> {
    let name = view["data"]["name"].as_str().unwrap();
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/documents/export-batch/{name}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    zip_entries(
        to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap()
            .to_vec(),
    )
}

#[tokio::test]
async fn batch_downloads_preserve_each_documents_markdown_images_and_report_partial_failure() {
    let (state, ids) = pair();
    let (status, view) = call(
        state.clone(),
        "POST",
        "/api/v1/documents/export-batch",
        Some(json!({
            "document_ids": [&ids[0], &ids[1], &ids[0], "missing"], "format": "markdown"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{view}");
    assert_eq!(view["data"]["exported"], 2, "{view}");
    assert_eq!(view["data"]["failed"], 1);
    let entries = download(&state, &view).await;
    for (index, bytes) in [b"png".as_slice(), b"second-image".as_slice()]
        .iter()
        .enumerate()
    {
        let folder = view["data"]["items"][index]["folder"].as_str().unwrap();
        let md = entries
            .iter()
            .find(|(name, _)| name == &format!("{folder}/full.md"))
            .unwrap();
        assert!(String::from_utf8_lossy(&md.1).contains("images/page-1/chart a.png"));
        assert_eq!(
            &entries
                .iter()
                .find(|(name, _)| name == &format!("{folder}/images/page-1/chart a.png"))
                .unwrap()
                .1,
            bytes
        );
    }
    assert!(!entries.iter().any(|(name, _)| name.ends_with(".pdf")));
    assert!(entries.iter().any(|(name, _)| name == "export-result.json"));
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn batch_downloads_obsidian_links_resolve_to_unique_notes_and_images() {
    let (state, ids) = pair();
    let (_, view) = call(
        state.clone(),
        "POST",
        "/api/v1/documents/export-batch",
        Some(json!({
            "document_ids": ids, "format": "obsidian", "include_source": true
        })),
    )
    .await;
    assert_eq!(view["data"]["exported"], 2, "{view}");
    let entries = download(&state, &view).await;
    let mut note_names = std::collections::HashSet::new();
    for (name, bytes) in entries.iter().filter(|(name, _)| name.ends_with(".md")) {
        assert!(note_names.insert(Path::new(name).file_name().unwrap().to_owned()));
        let parent = name.rsplit_once('/').unwrap().0;
        let text = String::from_utf8_lossy(bytes);
        for captures in regex::Regex::new(r"!?\[\[([^\]]+)\]\]")
            .unwrap()
            .captures_iter(&text)
        {
            let target = &captures[1];
            let target = if target.ends_with(".pdf") {
                target.to_owned()
            } else {
                format!("{target}.md")
            };
            let matches: Vec<_> = entries
                .iter()
                .filter(|(path, _)| path.ends_with(&format!("/{target}")))
                .collect();
            assert_eq!(
                matches.len(),
                1,
                "ambiguous or missing link {target} in {name}"
            );
            assert!(
                matches[0].0.starts_with(&format!("{parent}/")),
                "link escapes document: {target}"
            );
        }
        for captures in regex::Regex::new(r"!\[[^\]]*\]\(([^)]+)\)")
            .unwrap()
            .captures_iter(&text)
        {
            let encoded = format!("path={}", captures[1].replace('+', "%2B"));
            let (_, target) = url::form_urlencoded::parse(encoded.as_bytes())
                .next()
                .unwrap();
            assert!(
                entries
                    .iter()
                    .any(|(path, _)| path == &format!("{parent}/{target}")),
                "missing image {target} in {name}"
            );
        }
    }
    assert_eq!(note_names.len(), 4);
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn batch_downloads_source_needs_no_translation_and_other_formats_report_missing_outputs() {
    let (state, ids) = pair();
    for id in [JOB_ID, "batch-second-job"] {
        let directory = state.config.output_root.join(id).join("artifacts");
        fs::create_dir_all(&directory).unwrap();
        fs::write(
            directory.join(format!("{id}-side-by-side.pdf")),
            b"%PDF cached comparison",
        )
        .unwrap();
    }
    for format in ["source", "translated", "comparison"] {
        let (status, view) = call(
            state.clone(),
            "POST",
            "/api/v1/documents/export-batch",
            Some(json!({ "document_ids": ids, "format": format })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(view["data"]["exported"], 2, "{view}");
        let entries = download(&state, &view).await;
        assert_eq!(
            entries
                .iter()
                .filter(|(name, _)| name.ends_with(&format!("{format}.pdf")))
                .count(),
            2
        );
    }
    fs::remove_file(
        state
            .config
            .output_root
            .join(JOB_ID)
            .join("rendered/out.pdf"),
    )
    .unwrap();
    let (_, view) = call(
        state.clone(),
        "POST",
        "/api/v1/documents/export-batch",
        Some(json!({ "document_ids": [&ids[0]], "format": "comparison" })),
    )
    .await;
    assert_eq!(view["data"]["failed"], 1);
    assert!(view["data"]["name"].is_null());
    let mut job = state.db.get_job(JOB_ID).unwrap();
    job.status = JobStatusKind::Running;
    job.sync_runtime_state();
    state.db.save_job(&job).unwrap();
    let (_, source) = call(
        state.clone(),
        "POST",
        "/api/v1/documents/export-batch",
        Some(json!({ "document_ids": [&ids[0]], "format": "source" })),
    )
    .await;
    assert_eq!(
        source["data"]["exported"], 1,
        "source export works without a completed translation"
    );
    let (status, _) = call(
        state.clone(),
        "POST",
        "/api/v1/documents/export-batch",
        Some(json!({ "document_ids": [], "format": "source" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}
