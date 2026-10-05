use std::path::Path;

use serde_json::json;

use super::build_artifacts_display;
use crate::models::api::{build_artifact_links, ArtifactLinksView};
use crate::models::domain::JobSnapshot;
use crate::models::request::CreateJobInput;

fn display_links() -> ArtifactLinksView {
    let job = JobSnapshot::new("artifact-display".into(), CreateJobInput::default(), vec![]);
    let mut links = build_artifact_links(
        &job,
        "https://api.example",
        Path::new("."),
        false,
        false,
        false,
    );
    // Nested resources own display readiness; top-level compatibility flags and
    // legacy URLs deliberately disagree so they cannot silently take precedence.
    links.pdf_url = "https://legacy.example/pdf".into();
    links.markdown_url = "https://legacy.example/markdown".into();
    links.bundle_url = "https://legacy.example/bundle".into();
    links.normalized_document_url = "https://legacy.example/document".into();
    links.normalization_report_url = "https://legacy.example/report".into();
    links.pdf.ready = true;
    links.pdf.url = "https://api.example/output.pdf".into();
    links.pdf.file_name = Some("译文.pdf".into());
    links.pdf.size_bytes = Some(123);
    links.markdown.ready = true;
    links.markdown.raw_url = "https://api.example/markdown?raw=true".into();
    links.markdown.json_url = "https://api.example/markdown.json".into();
    links.markdown.file_name = Some("document.md".into());
    links.markdown.size_bytes = Some(0);
    links.bundle.ready = true;
    links.bundle.url = "https://api.example/bundle.zip".into();
    links.bundle.file_name = None;
    links.bundle.size_bytes = None;
    links.normalized_document.ready = true;
    links.normalized_document.url = "https://api.example/document.v1.json".into();
    links.normalized_document.file_name = Some("document.v1.json".into());
    links.normalized_document.size_bytes = Some(456);
    links.normalization_report.ready = true;
    links.normalization_report.url = "https://api.example/document.v1.report.json".into();
    links.normalization_report.file_name = Some("document.v1.report.json".into());
    links.normalization_report.size_bytes = Some(789);
    links
}

#[test]
fn artifacts_display_preserves_wire_fields_labels_order_and_nested_urls() {
    let links = display_links();
    let display = serde_json::to_value(build_artifacts_display(&links)).unwrap();
    assert_eq!(
        display,
        json!([
            {
                "key": "output_pdf", "label": "译文 PDF", "kind": "pdf",
                "ready": true, "file_name": "译文.pdf", "size_bytes": 123,
                "download_url": "https://api.example/output.pdf"
            },
            {
                "key": "markdown", "label": "Markdown", "kind": "markdown",
                "ready": true, "file_name": "document.md", "size_bytes": 0,
                "download_url": "https://api.example/markdown?raw=true"
            },
            {
                "key": "bundle", "label": "任务打包文件", "kind": "zip",
                "ready": true, "file_name": null, "size_bytes": null,
                "download_url": "https://api.example/bundle.zip"
            },
            {
                "key": "normalized_document", "label": "标准化 OCR 文档", "kind": "json",
                "ready": true, "file_name": "document.v1.json", "size_bytes": 456,
                "download_url": "https://api.example/document.v1.json"
            },
            {
                "key": "normalization_report", "label": "OCR 标准化报告", "kind": "json",
                "ready": true, "file_name": "document.v1.report.json", "size_bytes": 789,
                "download_url": "https://api.example/document.v1.report.json"
            }
        ])
    );
}

#[test]
fn artifacts_display_only_hides_download_urls_when_not_ready() {
    for readiness in 0u8..32 {
        let mut links = display_links();
        let before = serde_json::to_value(build_artifacts_display(&links)).unwrap();
        links.pdf.ready = readiness & 1 != 0;
        links.markdown.ready = readiness & 2 != 0;
        links.bundle.ready = readiness & 4 != 0;
        links.normalized_document.ready = readiness & 8 != 0;
        links.normalization_report.ready = readiness & 16 != 0;
        links.pdf_ready = !links.pdf.ready;
        links.markdown_ready = !links.markdown.ready;
        links.bundle_ready = !links.bundle.ready;
        let mut expected = before;
        for (index, item) in expected.as_array_mut().unwrap().iter_mut().enumerate() {
            let ready = readiness & (1 << index) != 0;
            item["ready"] = json!(ready);
            if !ready {
                item["download_url"] = serde_json::Value::Null;
            }
        }
        assert_eq!(
            serde_json::to_value(build_artifacts_display(&links)).unwrap(),
            expected,
            "readiness bitmask {readiness:05b}"
        );
    }
}
