use super::*;

fn state(keys: &[&str]) -> JobsdState {
    let root = std::env::temp_dir().join(format!(
        "paperloom-jobsd-auth-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
    ));
    let config = Arc::new(
        AppConfig::from_desktop(
            root.clone(),
            root.join("data"),
            "python".into(),
            41000,
            42000,
            "test-key".into(),
        )
        .unwrap(),
    );
    JobsdState {
        db: Arc::new(Db::new(
            config.jobs_db_path.clone(),
            config.data_root.clone(),
        )),
        config,
        canceled_jobs: Arc::new(RwLock::new(HashSet::new())),
        job_slots: Arc::new(Semaphore::new(1)),
        job_drivers: Arc::new(retain_jobs::job_runner::JobDriverRegistry::default()),
        api_keys: Arc::new(keys.iter().map(|key| (*key).to_owned()).collect()),
    }
}

#[test]
fn no_configured_keys_never_authorizes_a_request() {
    let state = state(&[]);
    assert!(!authorized(&state, &HeaderMap::new()));
    let mut headers = HeaderMap::new();
    headers.insert("X-API-Key", "anything".parse().unwrap());
    assert!(!authorized(&state, &headers));
    assert!(state.config.project_root.starts_with(std::env::temp_dir()));
    std::fs::remove_dir_all(&state.config.project_root).unwrap();
}

#[test]
fn only_exact_configured_keys_authorize_after_header_trimming() {
    let state = state(&["first-key", "second-key"]);
    assert!(!authorized(&state, &HeaderMap::new()));
    for candidate in ["", "First-key", "first-ke", "first-key-extra", "wrong-key"] {
        let mut headers = HeaderMap::new();
        headers.insert("X-API-Key", candidate.parse().unwrap());
        assert!(!authorized(&state, &headers), "{candidate:?}");
    }
    for candidate in ["first-key", "second-key", " second-key "] {
        let mut headers = HeaderMap::new();
        headers.insert("X-API-Key", candidate.parse().unwrap());
        assert!(authorized(&state, &headers), "{candidate:?}");
    }
    assert!(state.config.project_root.starts_with(std::env::temp_dir()));
    std::fs::remove_dir_all(&state.config.project_root).unwrap();
}
