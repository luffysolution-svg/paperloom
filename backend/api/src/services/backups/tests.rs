use super::*;
use crate::api_tests::jobs_common::test_state;
use crate::models::domain::UploadRecord;
use std::io::{Read, Write};

fn library(state: &crate::AppState) {
    let root = &state.config.data_root;
    fs::create_dir_all(root.join("uploads/u1")).unwrap();
    fs::write(root.join("uploads/u1/论文.pdf"), b"%PDF-1.4 original").unwrap();
    fs::create_dir_all(root.join("jobs/j1/rendered")).unwrap();
    fs::write(
        root.join("jobs/j1/rendered/out.pdf"),
        b"%PDF-1.4 translated",
    )
    .unwrap();
    state
        .db
        .save_upload_with_document(&UploadRecord {
            upload_id: "u1".into(),
            filename: "论文.pdf".into(),
            stored_path: root
                .join("uploads/u1/论文.pdf")
                .to_string_lossy()
                .into_owned(),
            bytes: 17,
            page_count: 1,
            uploaded_at: chrono::Utc::now().to_rfc3339(),
            developer_mode: false,
            content_hash: "fixture-hash".into(),
        })
        .unwrap();
    rusqlite::Connection::open(&state.config.jobs_db_path)
        .unwrap()
        .execute(
            "INSERT INTO collections VALUES ('c1','课题文献',NULL,0,'now')",
            [],
        )
        .unwrap();
    fs::create_dir_all(root.join("secrets")).unwrap();
    fs::write(root.join("secrets/credentials.json"), b"model-secret").unwrap();
    fs::create_dir_all(root.join("backups")).unwrap();
    fs::write(
        root.join("backups/webdav.json"),
        br#"{"url":"https://example.com/dav/","username":"user","password":"dav-secret"}"#,
    )
    .unwrap();
}

async fn create(state: &crate::AppState, credentials: bool) -> BackupItem {
    state
        .backups
        .clone()
        .create(
            CreateBackupInput {
                include_credentials: credentials,
                ..Default::default()
            },
            false,
        )
        .await
        .unwrap()
}

fn rewrite(
    source: &std::path::Path,
    destination: &std::path::Path,
    change: impl FnOnce(&mut archive::Manifest),
) {
    let mut zip = zip::ZipArchive::new(fs::File::open(source).unwrap()).unwrap();
    let mut manifest: archive::Manifest =
        serde_json::from_reader(zip.by_name("manifest.json").unwrap()).unwrap();
    change(&mut manifest);
    let mut output = zip::ZipWriter::new(fs::File::create(destination).unwrap());
    for index in 0..zip.len() {
        let mut file = zip.by_index(index).unwrap();
        output
            .start_file(file.name(), zip::write::FileOptions::default())
            .unwrap();
        if file.name() == "manifest.json" {
            output
                .write_all(&serde_json::to_vec(&manifest).unwrap())
                .unwrap();
        } else {
            std::io::copy(&mut file, &mut output).unwrap();
        }
    }
    output.finish().unwrap();
}

#[tokio::test]
async fn round_trip_to_different_root_preserves_database_files_and_old_library() {
    let source = test_state("backup-source");
    library(&source);
    let item = create(&source, false).await;
    let path = source.backups.download_path(&item.name).unwrap();
    let mut zip = zip::ZipArchive::new(fs::File::open(&path).unwrap()).unwrap();
    assert!(zip.by_name("data/secrets/credentials.json").is_err());
    assert!(zip.by_name("data/backups/webdav.json").is_err());
    drop(zip);

    let target = test_state("backup-target");
    fs::write(
        target.config.uploads_dir.join("previous.pdf"),
        b"old-library",
    )
    .unwrap();
    let bytes = fs::read(path).unwrap();
    let view = target
        .backups
        .clone()
        .import(
            futures_util::stream::iter(vec![Ok::<_, ()>(Bytes::from(bytes))]),
            None,
        )
        .await
        .unwrap();
    assert!(view.restart_required);
    assert!(target.config.uploads_dir.join("previous.pdf").exists());
    let config = target.config.clone();
    drop(target);
    apply_pending(&config).unwrap();
    let restored = crate::app::build_state(config.clone()).unwrap();
    let upload = restored.db.get_upload("u1").unwrap();
    assert_eq!(fs::read(upload.stored_path).unwrap(), b"%PDF-1.4 original");
    assert_eq!(
        fs::read(config.data_root.join("jobs/j1/rendered/out.pdf")).unwrap(),
        b"%PDF-1.4 translated"
    );
    let name: String = rusqlite::Connection::open(&config.jobs_db_path)
        .unwrap()
        .query_row(
            "SELECT name FROM collections WHERE collection_id='c1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(name, "课题文献");
    let status = restored.backups.status().await.unwrap();
    let previous = status.last_restore.unwrap()["previous_data_dir"]
        .as_str()
        .unwrap()
        .to_owned();
    assert_eq!(
        fs::read(PathBuf::from(previous).join("uploads/previous.pdf")).unwrap(),
        b"old-library"
    );
    assert!(!config.data_root.join("backups/pending").exists());
    apply_pending(&config).unwrap(); // completed restores are not replayed
    drop(restored);
    fs::remove_dir_all(config.project_root.clone()).unwrap();
    let source_root = source.config.project_root.clone();
    drop(source);
    fs::remove_dir_all(source_root).unwrap();
}

#[tokio::test]
async fn credentials_are_opt_in_and_webdav_password_is_never_exported() {
    let state = test_state("backup-secrets");
    library(&state);
    let item = create(&state, true).await;
    let mut zip = zip::ZipArchive::new(
        fs::File::open(state.backups.download_path(&item.name).unwrap()).unwrap(),
    )
    .unwrap();
    let mut secret = String::new();
    zip.by_name("data/secrets/credentials.json")
        .unwrap()
        .read_to_string(&mut secret)
        .unwrap();
    assert_eq!(secret, "model-secret");
    assert!(zip.by_name("data/backups/webdav.json").is_err());
    let serialized = serde_json::to_string(&state.backups.status().await.unwrap()).unwrap();
    assert!(!serialized.contains("dav-secret"));
    drop(zip);
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn frontend_ocr_and_translation_config_round_trips_only_when_requested() {
    let source = test_state("backup-frontend-source");
    let config = serde_json::json!({
        "browser_config": { "ocrProvider": "mineru", "paddleToken": "paddle-secret", "mineruToken": "mineru-secret", "modelApiKey": "translation-secret" },
        "developer_config": { "model": "custom-model", "baseUrl": "https://example.com/v1", "translationProfiles": { "custom": { "apiKey": "profile-secret", "model": "custom-model" } } }
    });
    for include_credentials in [false, true] {
        let item = source
            .backups
            .clone()
            .create(
                CreateBackupInput {
                    include_credentials,
                    frontend_config: Some(config.clone()),
                },
                false,
            )
            .await
            .unwrap();
        let path = source.backups.download_path(&item.name).unwrap();
        let mut zip = zip::ZipArchive::new(fs::File::open(&path).unwrap()).unwrap();
        assert_eq!(
            zip.by_name("data/secrets/frontend-config.json").is_ok(),
            include_credentials
        );
        drop(zip);
        if !include_credentials {
            continue;
        }
        let target = test_state("backup-frontend-target");
        target
            .backups
            .clone()
            .import(
                futures_util::stream::iter(vec![Ok::<_, ()>(Bytes::from(fs::read(path).unwrap()))]),
                None,
            )
            .await
            .unwrap();
        assert!(target
            .backups
            .clone()
            .restored_config()
            .await
            .unwrap()
            .is_none());
        let target_config = target.config.clone();
        drop(target);
        apply_pending(&target_config).unwrap();
        let restored = crate::app::build_state(target_config.clone()).unwrap();
        let restored_config = restored
            .backups
            .clone()
            .restored_config()
            .await
            .unwrap()
            .unwrap();
        assert_eq!(restored_config["config"], config);
        let status = serde_json::to_string(&restored.backups.status().await.unwrap()).unwrap();
        assert!(!status.contains("translation-secret"));
        assert!(!status.contains("mineru-secret"));
        drop(restored);
        fs::remove_dir_all(&target_config.project_root).unwrap();
    }
    let root = source.config.project_root.clone();
    drop(source);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn corrupt_newer_and_traversing_packages_never_publish_a_pending_restore() {
    let state = test_state("backup-invalid");
    library(&state);
    let item = create(&state, false).await;
    let source = state.backups.download_path(&item.name).unwrap();
    for kind in ["hash", "version", "path", "format"] {
        let damaged = state.config.project_root.join(format!("{kind}.zip"));
        rewrite(&source, &damaged, |manifest| match kind {
            "hash" => manifest.files[0].sha256 = "wrong".into(),
            "version" => manifest.schema_version = i64::MAX,
            "path" => manifest.files[0].path = "../escape".into(),
            _ => manifest.format = "unrelated-app".into(),
        });
        let work = state.backups.work_dir().unwrap();
        assert!(state.backups.stage_sync(damaged, work).is_err(), "{kind}");
        assert!(!state.config.data_root.join("backups/pending").exists());
        assert!(state.db.get_upload("u1").is_ok());
    }
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn portable_names_reject_posix_windows_and_alias_traversals() {
    for path in [
        "../x",
        "/tmp/x",
        "C:/data/x",
        "jobs\\..\\x",
        "jobs/a/../x",
        "jobs/CON",
        "jobs/x.",
        "jobs/x ",
        "jobs//x",
    ] {
        assert!(archive::safe_relative(path).is_err(), "{path}");
    }
    assert!(archive::safe_relative("jobs/论文/source.pdf").is_ok());
}

#[tokio::test]
async fn concurrent_mutations_block_snapshot_and_pending_restore_can_be_cancelled() {
    let state = test_state("backup-lock");
    let guard = state.backups.gate.read().await;
    assert!(state
        .backups
        .clone()
        .create(CreateBackupInput::default(), false)
        .await
        .is_err());
    drop(guard);
    let item = create(&state, false).await;
    state
        .backups
        .clone()
        .restore(
            RestoreInput {
                name: item.name,
                confirm_replace: true,
            },
            false,
        )
        .await
        .unwrap();
    assert!(state.backups.pending.load(Ordering::SeqCst));
    state.backups.clone().cancel().await.unwrap();
    assert!(!state.backups.pending.load(Ordering::SeqCst));
    assert!(!state.config.data_root.join("backups/pending").exists());
    rusqlite::Connection::open(&state.config.jobs_db_path).unwrap().execute(
        "INSERT INTO jobs(job_id,workflow,status_json,created_at,updated_at,command_json,request_json,log_tail_json) VALUES ('active','\"book\"','\"running\"','now','now','[]','{}','[]')", [],
    ).unwrap();
    assert!(state
        .backups
        .clone()
        .create(CreateBackupInput::default(), false)
        .await
        .is_err());
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn webdav_upload_list_and_download_use_the_same_portable_package() {
    use axum::{
        body::{to_bytes, Body},
        extract::{Request, State},
        response::IntoResponse,
        Router,
    };
    use std::collections::BTreeMap;
    type Files = Arc<std::sync::Mutex<BTreeMap<String, Vec<u8>>>>;
    async fn dav(State(files): State<Files>, request: Request) -> axum::response::Response {
        if request
            .headers()
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            != Some("Basic dXNlcjpzZWNyZXQ=")
        {
            return axum::http::StatusCode::UNAUTHORIZED.into_response();
        }
        let name = request
            .uri()
            .path()
            .strip_prefix("/dav/")
            .unwrap_or("")
            .to_owned();
        match request.method().as_str() {
            "PROPFIND" => {
                let mut xml = String::from("<d:multistatus xmlns:d='DAV:'>");
                for (name, bytes) in files.lock().unwrap().iter() {
                    xml.push_str(&format!("<d:response><d:href>/dav/{name}</d:href><d:propstat><d:prop><d:getcontentlength>{}</d:getcontentlength></d:prop></d:propstat></d:response>", bytes.len()));
                }
                xml.push_str("<d:response><d:href>https://foreign.example/paperloom-backup-x.zip</d:href></d:response></d:multistatus>");
                (axum::http::StatusCode::MULTI_STATUS, xml).into_response()
            }
            "PUT" => {
                assert_eq!(request.headers()["if-none-match"], "*");
                let declared = request.headers()["content-length"]
                    .to_str()
                    .unwrap()
                    .parse::<usize>()
                    .unwrap();
                assert!(request.headers().get("transfer-encoding").is_none());
                let bytes = to_bytes(request.into_body(), 10 * 1024 * 1024)
                    .await
                    .unwrap();
                assert_eq!(declared, bytes.len());
                files.lock().unwrap().insert(name, bytes.to_vec());
                axum::http::StatusCode::CREATED.into_response()
            }
            "GET" => {
                let bytes = files.lock().unwrap().get(&name).unwrap().clone();
                Body::from(bytes).into_response()
            }
            "DELETE" => {
                if files.lock().unwrap().remove(&name).is_some() {
                    axum::http::StatusCode::NO_CONTENT.into_response()
                } else {
                    axum::http::StatusCode::NOT_FOUND.into_response()
                }
            }
            _ => axum::http::StatusCode::METHOD_NOT_ALLOWED.into_response(),
        }
    }
    let files: Files = Arc::default();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let router = Router::new().fallback(dav).with_state(files.clone());
    let server = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    let state = test_state("backup-webdav");
    let settings = || SettingsInput {
        url: format!("http://{address}/dav/"),
        username: "user".into(),
        password: Some("secret".into()),
    };
    state
        .backups
        .clone()
        .save_settings(settings())
        .await
        .unwrap();
    state.backups.clone().test_webdav(settings()).await.unwrap();
    // A blank password in the UI is omitted; the backend retains the saved value.
    state
        .backups
        .clone()
        .save_settings(SettingsInput {
            password: None,
            ..settings()
        })
        .await
        .unwrap();
    let item = state
        .backups
        .clone()
        .create(CreateBackupInput::default(), true)
        .await
        .unwrap();
    let listed = state.backups.clone().list_remote().await.unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].name, item.name);
    assert_eq!(listed[0].bytes, item.bytes);
    let uploaded = state.backups.status().await.unwrap().operation.unwrap();
    assert_eq!(uploaded.state, "completed");
    assert_eq!(uploaded.phase, "upload");
    assert_eq!(uploaded.total, Some(item.bytes));
    assert_eq!(uploaded.completed, item.bytes);
    state
        .backups
        .clone()
        .delete(item.name.clone(), false)
        .await
        .unwrap();
    let synced = state
        .backups
        .clone()
        .sync_remote(item.name.clone())
        .await
        .unwrap();
    assert_eq!(synced.bytes, item.bytes);
    assert!(!state.backups.pending.load(Ordering::SeqCst));
    assert!(!state.config.data_root.join("backups/pending").exists());
    assert_eq!(state.backups.status().await.unwrap().items.len(), 1);
    assert!(state
        .backups
        .clone()
        .sync_remote(item.name.clone())
        .await
        .is_err());
    files.lock().unwrap().insert(
        "paperloom-backup-corrupt.zip".into(),
        b"invalid-zip".to_vec(),
    );
    assert!(state
        .backups
        .clone()
        .sync_remote("paperloom-backup-corrupt.zip".into())
        .await
        .is_err());
    assert_eq!(state.backups.status().await.unwrap().items.len(), 1);
    assert_eq!(
        state
            .backups
            .status()
            .await
            .unwrap()
            .operation
            .unwrap()
            .state,
        "failed"
    );
    files.lock().unwrap().remove("paperloom-backup-corrupt.zip");
    let view = state
        .backups
        .clone()
        .restore(
            RestoreInput {
                name: item.name.clone(),
                confirm_replace: true,
            },
            true,
        )
        .await
        .unwrap();
    assert!(view.restart_required);
    assert!(state
        .backups
        .clone()
        .delete(item.name.clone(), true)
        .await
        .is_err());
    state.backups.clone().cancel().await.unwrap();
    state
        .backups
        .clone()
        .delete(item.name.clone(), true)
        .await
        .unwrap();
    assert!(state
        .backups
        .clone()
        .list_remote()
        .await
        .unwrap()
        .is_empty());
    assert!(state.backups.download_path(&item.name).unwrap().is_file());
    server.abort();
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn webdav_creates_a_missing_folder_before_uploading_and_preserves_failed_packages() {
    use axum::{
        extract::{Request, State},
        response::IntoResponse,
        Router,
    };
    use std::sync::atomic::{AtomicBool, AtomicUsize};
    let folder = Arc::new((AtomicBool::new(false), AtomicUsize::new(0)));
    async fn dav(
        State(folder): State<Arc<(AtomicBool, AtomicUsize)>>,
        request: Request,
    ) -> axum::response::Response {
        match request.method().as_str() {
            "PROPFIND" if folder.0.load(Ordering::SeqCst) => {
                axum::http::StatusCode::MULTI_STATUS.into_response()
            }
            "PROPFIND" => axum::http::StatusCode::NOT_FOUND.into_response(),
            "MKCOL" => {
                folder.1.fetch_add(1, Ordering::SeqCst);
                folder.0.store(true, Ordering::SeqCst);
                axum::http::StatusCode::CREATED.into_response()
            }
            "PUT" => {
                // Drain the upload before responding so a connection reset cannot mask the 507.
                axum::body::to_bytes(request.into_body(), 10 * 1024 * 1024)
                    .await
                    .unwrap();
                axum::http::StatusCode::INSUFFICIENT_STORAGE.into_response()
            }
            _ => axum::http::StatusCode::METHOD_NOT_ALLOWED.into_response(),
        }
    }
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let router = Router::new().fallback(dav).with_state(folder.clone());
    let server = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    let state = test_state("backup-create-folder");
    state
        .backups
        .clone()
        .save_settings(SettingsInput {
            url: format!("http://{address}/dav/PaperLoom/"),
            username: "user".into(),
            password: Some("secret".into()),
        })
        .await
        .unwrap();
    let failure = state
        .backups
        .clone()
        .create(CreateBackupInput::default(), true)
        .await
        .unwrap_err();
    assert!(failure.to_string().contains("本地迁移包已保留"));
    assert!(failure.to_string().contains("507"), "{failure}");
    assert_eq!(folder.1.load(Ordering::SeqCst), 1);
    let status = state.backups.status().await.unwrap();
    assert_eq!(status.items.len(), 1);
    assert!(state
        .backups
        .download_path(&status.items[0].name)
        .unwrap()
        .is_file());
    server.abort();
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}
