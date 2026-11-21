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

    /// 同上，另外告诉假生成器输入文件在哪（`success-replacing-input` 模式要在生成期间换掉它）。
    fn command_with_input(&self, output: &Path, mode: &str, input: &Path) -> Command {
        let mut command = self.command(output, mode);
        command.env("RETAIN_FAKE_PDF_INPUT", input);
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
        "timeout-with-grandchild" => {
            // 像 Word 导出那样再起一层子进程（pipeline 起 node）。超时只杀直接子进程的话，
            // 孙进程会活下来，继续占着 CPU 往产物目录里写。
            let grandchild_pid = PathBuf::from(std::env::var_os("RETAIN_FAKE_PDF_PID").unwrap())
                .with_file_name("grandchild-pid");
            Command::new(std::env::current_exe().unwrap())
                .args(["--ignored", "fake_pdf_builder", "--nocapture"])
                .env("RETAIN_FAKE_PDF_MODE", "sleep")
                .env("RETAIN_FAKE_PDF_PID", grandchild_pid)
                .stdout(Stdio::null())
                .spawn()
                .unwrap();
            std::thread::sleep(Duration::from_secs(60));
        }
        "sleep" => std::thread::sleep(Duration::from_secs(60)),
        "success-replacing-input" => {
            // 生成读完输入以后、产物落盘之前，输入被换掉（原地重渲染写完了新的 translated.pdf）。
            let input = PathBuf::from(std::env::var_os("RETAIN_FAKE_PDF_INPUT").unwrap());
            let replacement = input.with_extension("replacement");
            std::fs::write(&replacement, b"%PDF-rerendered-during-build").unwrap();
            std::fs::rename(&replacement, &input).unwrap();
            std::fs::write(output, b"%PDF-built-from-old-input").unwrap();
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
    let error = build_with_command(&output, "layout-docx", Duration::from_secs(10), &[], |temporary| {
        fixture.command(temporary, "failure-with-stderr")
    })
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
    let error = build_with_command(&output, "side-by-side", Duration::from_secs(30), &[], |temporary| {
        fixture.command(temporary, "noisy-failure")
    })
    .unwrap_err();
    let message = format!("{error:?}");
    assert!(message.contains("FINAL LINE MARKER"), "带的不是尾部：{message}");
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
        let error = build_with_command(&output, "side-by-side", Duration::from_secs(10), &[], |temporary| {
            fixture.command(temporary, mode)
        })
        .unwrap_err();
        let message = format!("{error:?}");
        assert!(message.contains("failed to build side-by-side"), "{mode}: {message}");
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
        build_with_command(&output, "side-by-side", Duration::from_secs(10), &[], |temporary| {
            assert_eq!(temporary.parent(), output.parent());
            temporary_paths.push(temporary.to_path_buf());
            fixture.command(temporary, "success")
        })
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
        let result = build_with_command(&output, "side-by-side", deadline, &[], |temporary| {
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

#[cfg(unix)]
fn process_is_gone(pid: i32) -> bool {
    // 被杀的孙进程由 init 回收，可能要一小会儿；在那之前 kill(pid, 0) 对僵尸照样成功。
    let deadline = Instant::now() + Duration::from_secs(3);
    while Instant::now() < deadline {
        if unsafe { libc::kill(pid, 0) } == -1
            && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
        {
            return true;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    false
}

#[cfg(unix)]
#[test]
fn a_timed_out_build_kills_the_whole_process_tree() {
    let fixture = Fixture::new();
    let output = fixture.0.join("output.docx");
    let started = Instant::now();
    // 2 秒：并行跑测试时起两层进程要几百毫秒，太短的话孙进程还没起来就超时了，测不到它。
    let error = build_with_command(&output, "layout-docx", Duration::from_secs(2), &[], |temporary| {
        fixture.command(temporary, "timeout-with-grandchild")
    })
    .unwrap_err();
    assert!(format!("{error:?}").contains("layout-docx builder timed out"), "{error:?}");
    assert!(started.elapsed() < Duration::from_secs(6));
    let grandchild: i32 = std::fs::read_to_string(fixture.0.join("grandchild-pid"))
        .ok()
        .and_then(|pid| pid.parse().ok())
        .expect("孙进程没有写下 pid（2 秒内没起来？）");
    let gone = process_is_gone(grandchild);
    if !gone {
        unsafe { libc::kill(grandchild, libc::SIGKILL) };
    }
    assert!(gone, "超时只杀了直接子进程，孙进程 {grandchild} 还活着");
}

#[test]
fn an_input_replaced_during_the_build_leaves_the_output_stale() {
    // 对照 PDF / Word 要几十秒到十分钟。期间原地重渲染写完新的 translated.pdf，生成结束
    // rename 出来的产物比新输入还晚，以前按修改时间就被当成新鲜的，内容却来自旧 PDF。
    let fixture = Fixture::new();
    let input = fixture.0.join("translated.pdf");
    std::fs::write(&input, b"%PDF-old").unwrap();
    let output = fixture.0.join("job-side-by-side.pdf");
    build_with_command(&output, "side-by-side", Duration::from_secs(10), &[&input], |temporary| {
        fixture.command_with_input(temporary, "success-replacing-input", &input)
    })
    .unwrap();
    assert_eq!(std::fs::read(&output).unwrap(), b"%PDF-built-from-old-input");
    assert!(
        !cached_output_is_fresh(&output, &[&input]).unwrap(),
        "生成期间输入被换掉了，产物却被当成新鲜的",
    );
}

#[test]
fn an_input_replaced_within_the_same_tick_is_noticed() {
    // 秒级（Linux 上是一个时钟 tick）精度的文件系统上，产物生成完、同一秒里输入又被重写，
    // 两边修改时间相等，以前的 `>=` 判成新鲜。
    let fixture = Fixture::new();
    let input = fixture.0.join("translated.pdf");
    std::fs::write(&input, b"%PDF-old").unwrap();
    let output = fixture.0.join("job-side-by-side.pdf");
    build_with_command(&output, "side-by-side", Duration::from_secs(10), &[&input], |temporary| {
        fixture.command(temporary, "success")
    })
    .unwrap();
    assert!(cached_output_is_fresh(&output, &[&input]).unwrap(), "刚生成完应该是新鲜的");
    let output_modified = std::fs::metadata(&output).unwrap().modified().unwrap();
    std::fs::write(&input, b"%PDF-rerendered").unwrap();
    std::fs::File::options()
        .write(true)
        .open(&input)
        .unwrap()
        .set_modified(output_modified)
        .unwrap();
    assert!(
        !cached_output_is_fresh(&output, &[&input]).unwrap(),
        "输入和产物修改时间相同，但输入已经换了内容",
    );
}

#[test]
fn caches_without_an_input_record_still_follow_modification_times() {
    // 这次改动之前生成的缓存没有记录文件：照旧按修改时间判断，不让所有旧缓存一起重建。
    let fixture = Fixture::new();
    let input = fixture.0.join("translated.pdf");
    let output = fixture.0.join("job-side-by-side.pdf");
    std::fs::write(&input, b"%PDF").unwrap();
    std::fs::write(&output, b"%PDF-cached").unwrap();
    let now = std::time::SystemTime::now();
    let set = |path: &Path, time| {
        std::fs::File::options().write(true).open(path).unwrap().set_modified(time).unwrap()
    };
    set(&input, now - Duration::from_secs(60));
    set(&output, now);
    assert!(cached_output_is_fresh(&output, &[&input]).unwrap());
    set(&input, now + Duration::from_secs(60));
    assert!(!cached_output_is_fresh(&output, &[&input]).unwrap());
}

#[test]
fn an_output_replaced_from_elsewhere_falls_back_to_modification_times() {
    // 多设备同步把另一台机器生成的产物拷过来：记录里的产物戳对不上，说明不了这份产物。
    // 当作过期的话两台设备会轮流重建、互相同步，所以退回修改时间。
    let fixture = Fixture::new();
    let input = fixture.0.join("translated.pdf");
    std::fs::write(&input, b"%PDF").unwrap();
    let output = fixture.0.join("job-side-by-side.pdf");
    build_with_command(&output, "side-by-side", Duration::from_secs(10), &[&input], |temporary| {
        fixture.command(temporary, "success")
    })
    .unwrap();
    let copied = fixture.0.join("synced.pdf");
    std::fs::write(&copied, b"%PDF-from-the-other-device").unwrap();
    std::fs::rename(&copied, &output).unwrap();
    let now = std::time::SystemTime::now();
    let set = |path: &Path, time| {
        std::fs::File::options().write(true).open(path).unwrap().set_modified(time).unwrap()
    };
    set(&input, now - Duration::from_secs(60));
    set(&output, now);
    assert!(cached_output_is_fresh(&output, &[&input]).unwrap(), "拷过来的产物比输入新，照修改时间算新鲜");
    set(&input, now + Duration::from_secs(60));
    assert!(!cached_output_is_fresh(&output, &[&input]).unwrap());
}

#[test]
fn an_unreadable_input_record_means_stale() {
    let fixture = Fixture::new();
    let input = fixture.0.join("translated.pdf");
    std::fs::write(&input, b"%PDF").unwrap();
    let output = fixture.0.join("job-side-by-side.pdf");
    build_with_command(&output, "side-by-side", Duration::from_secs(10), &[&input], |temporary| {
        fixture.command(temporary, "success")
    })
    .unwrap();
    assert!(cached_output_is_fresh(&output, &[&input]).unwrap());
    std::fs::write(fixture.0.join(".job-side-by-side.pdf.inputs.json"), b"{not json").unwrap();
    assert!(!cached_output_is_fresh(&output, &[&input]).unwrap());
}
