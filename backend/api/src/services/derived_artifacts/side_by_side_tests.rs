use super::*;

struct Fixture(PathBuf);

impl Fixture {
    fn new() -> Self {
        let path =
            std::env::temp_dir().join(format!("retain-pdf-builder-{:016x}", fastrand::u64(..)));
        std::fs::create_dir(&path).unwrap();
        Self(path)
    }

    fn command(&self, output: &Path, mode: &str) -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .args(["--ignored", "fake_pdf_builder", "--nocapture"])
            .env("RETAIN_FAKE_PDF_MODE", mode)
            .env("RETAIN_FAKE_PDF_OUTPUT", output)
            .env("RETAIN_FAKE_PDF_PID", self.0.join("pid"));
        command
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[test]
#[ignore = "subprocess fixture, invoked only by PDF builder tests"]
fn fake_pdf_builder() {
    let Some(mode) = std::env::var_os("RETAIN_FAKE_PDF_MODE") else {
        return;
    };
    let output = PathBuf::from(std::env::var_os("RETAIN_FAKE_PDF_OUTPUT").unwrap());
    std::fs::write(
        std::env::var_os("RETAIN_FAKE_PDF_PID").unwrap(),
        std::process::id().to_string(),
    )
    .unwrap();
    match mode.to_str().unwrap() {
        "success" => std::fs::write(output, b"%PDF-new").unwrap(),
        "failure" => {
            std::fs::write(output, b"partial").unwrap();
            std::process::exit(7);
        }
        "failure-with-stderr" => {
            eprintln!("Traceback (most recent call last):");
            eprintln!("RuntimeError: expected exactly one PDF in /jobs/x/source, found 0");
            std::process::exit(7);
        }
        "whitespace-stderr-failure" => {
            // 只吐空白的子进程。`length == 0` 那道闸拦不住它，靠的是 trim 之后的判空。
            eprint!("\n\n   \n\t");
            std::process::exit(7);
        }
        "noisy-failure" => {
            // 刷屏的子进程:错误里只该带回尾部，不该把几十万字塞进 HTTP 响应。
            for index in 0..20_000 {
                eprintln!("noise line {index}");
            }
            eprintln!("FINAL LINE MARKER");
            std::process::exit(7);
        }
        "timeout" => {
            std::fs::write(output, b"partial").unwrap();
            std::thread::sleep(Duration::from_secs(60));
        }
        "missing" => {}
        _ => panic!("unexpected fixture mode"),
    }
}

#[test]
fn uses_the_installed_pipeline_command() {
    let deps = DerivedArtifactDeps::with_pipeline_command(
        "python3",
        "/opt/retainpdf/bin/retainpdf-pipeline",
    );
    let command = side_by_side_command(deps);
    assert_eq!(
        command.get_program(),
        "/opt/retainpdf/bin/retainpdf-pipeline"
    );
    assert_eq!(
        command.get_args().collect::<Vec<_>>(),
        vec![std::ffi::OsStr::new("side-by-side-pdf")]
    );
}

#[test]
fn a_failed_build_carries_the_child_stderr_into_the_error() {
    // 以前子进程的 stderr 直接丢进 /dev/null，任何失败都只剩一句 "failed to build X"。
    // 排查 translate-only 任务导不出 Word 时，真正的原因整条被吞掉，只能手动重跑
    // CLI 才看得见。
    let fixture = Fixture::new();
    let output = fixture.0.join("output.pdf");
    std::fs::write(&output, b"old").unwrap();
    let error = build_with_command(
        &output,
        "layout-docx",
        Duration::from_secs(10),
        |temporary| fixture.command(temporary, "failure-with-stderr"),
    )
    .unwrap_err();
    let message = format!("{error:?}");
    assert!(message.contains("failed to build layout-docx"), "{message}");
    assert!(
        message.contains("expected exactly one PDF"),
        "子进程的 stderr 没有带进错误：{message}",
    );
}

#[test]
fn a_noisy_failure_only_carries_the_tail() {
    let fixture = Fixture::new();
    let output = fixture.0.join("output.pdf");
    std::fs::write(&output, b"old").unwrap();
    let error = build_with_command(
        &output,
        "side-by-side",
        Duration::from_secs(30),
        |temporary| fixture.command(temporary, "noisy-failure"),
    )
    .unwrap_err();
    let message = format!("{error:?}");
    assert!(
        message.contains("FINAL LINE MARKER"),
        "带的不是尾部：{message}"
    );
    assert!(
        message.len() < 8 * 1024,
        "把整段刷屏都塞进错误里了（{} 字节）",
        message.len(),
    );
}

#[test]
fn a_failure_without_useful_stderr_does_not_grow_a_trailing_separator() {
    // 两种「没东西可报」都要覆盖:一个字节都没写（走 length == 0 那道闸），以及只写了
    // 空白（那道闸拦不住，靠 trim 之后判空）。第一版只测了前者，把后一道闸拆掉也不变红。
    for mode in ["failure", "whitespace-stderr-failure"] {
        let fixture = Fixture::new();
        let output = fixture.0.join("output.pdf");
        std::fs::write(&output, b"old").unwrap();
        let error = build_with_command(
            &output,
            "side-by-side",
            Duration::from_secs(10),
            |temporary| fixture.command(temporary, mode),
        )
        .unwrap_err();
        let message = format!("{error:?}");
        assert!(
            message.contains("failed to build side-by-side"),
            "{mode}: {message}"
        );
        assert!(
            !message.contains("side-by-side: "),
            "{mode}: 没有可报的 stderr，却接了分隔符：{message}",
        );
    }
}

#[test]
fn successful_builder_atomically_replaces_old_output_and_uses_unique_temps() {
    let fixture = Fixture::new();
    let output = fixture.0.join("output.pdf");
    std::fs::write(&output, b"old").unwrap();
    let mut temporary_paths = Vec::new();
    for _ in 0..2 {
        build_with_command(
            &output,
            "side-by-side",
            Duration::from_secs(10),
            |temporary| {
                assert_eq!(temporary.parent(), output.parent());
                temporary_paths.push(temporary.to_path_buf());
                fixture.command(temporary, "success")
            },
        )
        .unwrap();
        assert_eq!(std::fs::read(&output).unwrap(), b"%PDF-new");
    }
    assert_ne!(temporary_paths[0], temporary_paths[1]);
    assert!(temporary_paths.iter().all(|path| !path.exists()));
    // 临时文件名带 label 和真实扩展名：两条派生链路（side-by-side PDF / layout DOCX）
    // 共用这段监管，产物目录里必须看得出临时文件是谁的。
    assert!(temporary_paths.iter().all(|path| {
        let name = path.file_name().unwrap().to_str().unwrap();
        name.starts_with(".side-by-side-") && name.ends_with(".pdf.tmp")
    }));
}

#[test]
fn failed_missing_and_timed_out_builds_preserve_old_output_and_cleanup() {
    for mode in ["failure", "missing", "timeout", "spawn-failure"] {
        let fixture = Fixture::new();
        let output = fixture.0.join("output.pdf");
        std::fs::write(&output, b"old-good-pdf").unwrap();
        let mut temporary_path = PathBuf::new();
        let started = Instant::now();
        let deadline = if mode == "timeout" {
            Duration::from_millis(300)
        } else {
            Duration::from_secs(10)
        };
        let result = build_with_command(&output, "side-by-side", deadline, |temporary| {
            temporary_path = temporary.to_path_buf();
            if mode == "spawn-failure" {
                Command::new(fixture.0.join("does-not-exist"))
            } else {
                fixture.command(temporary, mode)
            }
        });
        assert!(result.is_err(), "{mode}");
        assert_eq!(std::fs::read(&output).unwrap(), b"old-good-pdf", "{mode}");
        assert!(!temporary_path.exists(), "{mode}");
        // stderr 的临时日志也要清掉，别在产物目录里留一地 .log.tmp。
        let leftovers: Vec<_> = std::fs::read_dir(&fixture.0)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "{mode} 留下了临时文件：{leftovers:?}");
        if mode == "timeout" {
            assert!(started.elapsed() < Duration::from_secs(5));
            #[cfg(unix)]
            if let Ok(pid) = std::fs::read_to_string(fixture.0.join("pid")) {
                // A reaped child must not remain even as a zombie.
                assert_eq!(unsafe { libc::kill(pid.parse().unwrap(), 0) }, -1);
                assert_eq!(
                    std::io::Error::last_os_error().raw_os_error(),
                    Some(libc::ESRCH)
                );
            }
        }
    }
}
