//! book 任务的 OCR 在 `<id>-ocr` 子任务里跑，派发记录写在子任务名下。进程死在「请求已发出、
//! 回执还没落库」之间时，重启对账要把这条停在 intent 的记录标成 ambiguous，并且用户看到的
//! 父任务编号要能找到它——否则重试会再向服务商提交一次，重复计费。
//!
//! 走真实的 `run_job_with_ocr`（父任务 → 建子任务 → Paddle 提交），服务商是个只接连接、
//! 永不应答的假服务；等派发记录落库后把整条 future 丢掉（等价于进程死亡），再做启动对账。

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;

use super::run_job_with_ocr;
use crate::job_runner::pipeline_plan::PipelinePlan;
use crate::job_runner::process_runner::tests::test_runtime_deps;
use crate::job_runner::reconcile_stale_running_jobs;
use crate::models::domain::{now_iso, JobSnapshot, JobStatusKind, UploadRecord, WorkflowKind};
use crate::models::request::CreateJobInput;

fn minimal_pdf() -> Vec<u8> {
    use lopdf::{dictionary, Document, Object, Stream};
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let content_id = doc.add_object(Stream::new(dictionary! {}, b"BT ET".to_vec()));
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => content_id,
        "MediaBox" => vec![0.into(), 0.into(), 200.into(), 200.into()],
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(
            dictionary! { "Type" => "Pages", "Kids" => vec![page_id.into()], "Count" => 1 },
        ),
    );
    let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    doc.trailer.set("Root", catalog_id);
    let mut bytes = Vec::new();
    doc.save_to(&mut bytes).unwrap();
    bytes
}

/// 只接连接、读请求、永不应答的假 Paddle。
async fn silent_server() -> (String, Arc<AtomicUsize>) {
    use tokio::io::AsyncReadExt;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let connections = Arc::new(AtomicUsize::new(0));
    let counter = connections.clone();
    tokio::spawn(async move {
        loop {
            let Ok((mut socket, _)) = listener.accept().await else {
                return;
            };
            counter.fetch_add(1, Ordering::SeqCst);
            tokio::spawn(async move {
                let mut buf = vec![0_u8; 8192];
                while matches!(socket.read(&mut buf).await, Ok(read) if read > 0) {}
                tokio::time::sleep(Duration::from_secs(3600)).await;
            });
        }
    });
    (base, connections)
}

#[tokio::test]
async fn crash_during_a_book_jobs_ocr_submit_leaves_an_ambiguous_dispatch_the_parent_can_find() {
    let deps = test_runtime_deps(1);
    let (paddle_url, connections) = silent_server().await;

    let pdf_bytes = minimal_pdf();
    let upload_dir = deps.config.uploads_dir.join("up-crash");
    std::fs::create_dir_all(&upload_dir).unwrap();
    let pdf = upload_dir.join("input.pdf");
    std::fs::write(&pdf, &pdf_bytes).unwrap();
    deps.db
        .save_upload(&UploadRecord {
            upload_id: "up-crash".into(),
            filename: "input.pdf".into(),
            stored_path: pdf.to_string_lossy().into_owned(),
            bytes: pdf_bytes.len() as u64,
            page_count: 1,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: String::new(),
        })
        .unwrap();
    let mut input = CreateJobInput {
        workflow: WorkflowKind::Book,
        ..Default::default()
    };
    input.source.upload_id = "up-crash".into();
    input.ocr.provider = "paddle".into();
    input.ocr.paddle_token = "paddle-test-token".into();
    input.ocr.paddle_api_url = paddle_url;
    let mut parent = JobSnapshot::new("job-crash".into(), input, vec![]);
    parent.upload_id = Some("up-crash".into());
    deps.db.save_job(&parent).unwrap();

    let run = tokio::spawn(run_job_with_ocr(
        deps.clone(),
        parent.into_runtime(),
        PipelinePlan::book_with_ocr(),
    ));
    // 等请求发到服务商、派发记录已经落库。
    tokio::time::timeout(Duration::from_secs(20), async {
        loop {
            let recorded = deps
                .db
                .latest_pipeline_dispatch("job-crash-ocr", "ocr-submit")
                .unwrap()
                .is_some();
            if recorded && connections.load(Ordering::SeqCst) >= 1 {
                return;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .expect("the OCR child should record its dispatch and call the provider");
    // 进程死亡：整条 future 连同内存里的一切被丢掉，库里的行停在半途。
    run.abort();
    let _ = run.await;
    assert_eq!(
        deps.db
            .latest_pipeline_dispatch("job-crash-ocr", "ocr-submit")
            .unwrap()
            .unwrap()
            .status,
        "intent"
    );
    assert_eq!(deps.db.get_job("job-crash").unwrap().status, JobStatusKind::Running);

    // 重启对账。
    reconcile_stale_running_jobs(&deps.config, &deps.db).unwrap();

    assert_eq!(deps.db.get_job("job-crash").unwrap().status, JobStatusKind::Failed);
    assert_eq!(deps.db.get_job("job-crash-ocr").unwrap().status, JobStatusKind::Failed);
    let child_record = deps
        .db
        .latest_pipeline_dispatch("job-crash-ocr", "ocr-submit")
        .unwrap()
        .unwrap();
    assert_eq!(
        child_record.status, "ambiguous",
        "没拿到回执就死了：请求有没有送到服务商说不清，必须标成 ambiguous"
    );
    let seen_by_parent = deps
        .db
        .latest_ocr_dispatch_for_job("job-crash")
        .unwrap()
        .expect("the user-visible parent id must lead to the child's dispatch");
    assert_eq!(seen_by_parent.job_id, "job-crash-ocr");
    assert_eq!(seen_by_parent.status, "ambiguous");
    assert_eq!(connections.load(Ordering::SeqCst), 1, "只向服务商提交过一次");
}
