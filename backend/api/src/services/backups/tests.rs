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
        .import(futures_util::stream::iter(vec![Ok::<_, ()>(Bytes::from(
            bytes,
        ))]))
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
                let bytes = to_bytes(request.into_body(), 10 * 1024 * 1024)
                    .await
                    .unwrap();
                files.lock().unwrap().insert(name, bytes.to_vec());
                axum::http::StatusCode::CREATED.into_response()
            }
            "GET" => {
                let bytes = files.lock().unwrap().get(&name).unwrap().clone();
                Body::from(bytes).into_response()
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
    let view = state
        .backups
        .clone()
        .restore(
            RestoreInput {
                name: item.name,
                confirm_replace: true,
            },
            true,
        )
        .await
        .unwrap();
    assert!(view.restart_required);
    state.backups.clone().cancel().await.unwrap();
    server.abort();
    let root = state.config.project_root.clone();
    drop(state);
    fs::remove_dir_all(root).unwrap();
}
