use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::domain::JobSnapshot;

use super::freshness::{remember_inputs, InputStamps, Stamp};
use super::{cached_output_is_fresh, job_artifacts_dir, DerivedArtifactDeps};

const BUILD_TIMEOUT: Duration = Duration::from_secs(120);
const POLL_INTERVAL: Duration = Duration::from_millis(10);

struct TemporaryOutput(PathBuf);

impl TemporaryOutput {
    fn create(output_path: &Path, label: &str) -> Result<Self, AppError> {
        let extension = output_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("tmp");
        Self::create_with_extension(output_path, label, extension)
    }

    fn create_with_extension(
        output_path: &Path,
        label: &str,
        extension: &str,
    ) -> Result<Self, AppError> {
        let parent = output_path
            .parent()
            .ok_or_else(|| AppError::internal("output has no parent"))?;
        for _ in 0..16 {
            let path = parent.join(format!(
                ".{label}-{:016x}.{extension}.tmp",
                fastrand::u64(..)
            ));
            match std::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
            {
                Ok(_) => return Ok(Self(path)),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(error.into()),
            }
        }
        Err(AppError::internal("could not reserve a temporary output file"))
    }
}

impl Drop for TemporaryOutput {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

pub fn ensure_side_by_side_pdf(
    deps: DerivedArtifactDeps<'_>,
    data_root: &Path,
    job: &JobSnapshot,
    source_pdf: &Path,
    translated_pdf: &Path,
) -> Result<PathBuf, AppError> {
    let output_dir = job_artifacts_dir(data_root, job)?;
    let output_pdf = output_dir.join(super::side_by_side_file_name(&job.job_id));
    if !cached_output_is_fresh(&output_pdf, &[source_pdf, translated_pdf])? {
        build_side_by_side_pdf(deps, source_pdf, translated_pdf, &output_pdf)?;
    }
    Ok(output_pdf)
}

fn build_side_by_side_pdf(
    deps: DerivedArtifactDeps<'_>,
    source_pdf: &Path,
    translated_pdf: &Path,
    output_pdf: &Path,
) -> Result<(), AppError> {
    let inputs = [source_pdf, translated_pdf];
    build_with_command(output_pdf, "side-by-side", BUILD_TIMEOUT, &inputs, |tmp_pdf| {
        let mut command = side_by_side_command(deps);
        command
            .arg("--source-pdf")
            .arg(source_pdf)
            .arg("--translated-pdf")
            .arg(translated_pdf)
            .arg("--output-pdf")
            .arg(tmp_pdf);
        command
    })
}

/// `label` 只用来给临时文件命名和给报错定位——几条派生链路（对照 PDF、Word、线性化、
/// 页预览、封面）共用这段进程监管，失败信息里必须能看出是哪一条挂了。
///
/// `inputs` 是产物依赖的文件。它们的戳在起子进程**之前**取、生成完记在产物旁边，
/// [`cached_output_is_fresh`] 拿它判断缓存还能不能用（见 `freshness.rs`）。传空表示不记。
pub(super) fn build_with_command(
    output_path: &Path,
    label: &str,
    timeout: Duration,
    inputs: &[&Path],
    command_for_output: impl FnOnce(&Path) -> Command,
) -> Result<(), AppError> {
    build_with_command_and_exit_check(output_path, label, timeout, inputs, command_for_output, |_| None)
}

/// 同 [`build_with_command`]，子进程失败退出时先交给 `exit_error` 看一眼退出状态：返回
/// `Some` 就用它代替笼统的 "failed to build X"（页预览用它把「页码越界」变成 404）。
pub(super) fn build_with_command_and_exit_check(
    output_path: &Path,
    label: &str,
    timeout: Duration,
    inputs: &[&Path],
    command_for_output: impl FnOnce(&Path) -> Command,
    exit_error: impl FnOnce(std::process::ExitStatus) -> Option<AppError>,
) -> Result<(), AppError> {
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let input_stamps = InputStamps::capture(inputs);
    let temporary = TemporaryOutput::create(output_path, label)?;
    let command = command_for_output(&temporary.0);
    let (status, diagnostics) = run_supervised(output_path, label, timeout, command)?;
    if !status.success() {
        if let Some(error) = exit_error(status) {
            return Err(error);
        }
    }
    if !status.success() || !temporary.0.is_file() || std::fs::metadata(&temporary.0)?.len() == 0 {
        return Err(diagnostics.error(format!("failed to build {label}")));
    }
    let file = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(&temporary.0)?;
    file.sync_all()?;
    drop(file);
    // 换名不改 inode 和修改时间，所以产物的戳在临时文件上取。
    let output_stamp = Stamp::of(&temporary.0);
    std::fs::rename(&temporary.0, output_path)?;
    if let (Some(output_stamp), false) = (output_stamp, input_stamps.is_empty()) {
        remember_inputs(output_path, output_stamp, input_stamps);
    }
    Ok(())
}

/// 起子进程、轮询到退出或超时，stderr 落到 `anchor` 旁边的临时文件。
///
/// 从 `build_with_command` 里拆出来，是因为合并译文要产出**一个目录**而不是一个文件，
/// 临时产物和原子替换的方式不同，但进程监管（超时杀进程、不留没人读的管道、失败时带回
/// stderr 尾部）完全一样。返回诊断文件的句柄，调用方失败时用它拼错误信息。
pub fn run_supervised(
    anchor: &Path,
    label: &str,
    timeout: Duration,
    mut command: Command,
) -> Result<(std::process::ExitStatus, Diagnostics), AppError> {
    // 子进程的 stderr 落到一个临时文件，失败时把尾部带进错误。
    //
    // 不能用 `Stdio::piped()`:没人读的管道写满就会把子进程卡死，而我们这里是轮询
    // `try_wait()`、根本没在读。文件没有这个问题——写多少都落盘，而且进程退出后
    // 我们才去读。
    //
    // 以前这里是 `Stdio::null()`。代价是任何失败都只剩一句 "failed to build X"：
    // 排查 translate-only 任务导不出 Word 时，真正的原因（源 PDF 不在 job_root 下，
    // Python 侧报的是 "expected exactly one PDF in .../source, found 0"）整条被吞掉，
    // 只能手动重跑 CLI 才看得见。
    let diagnostics = TemporaryOutput::create_with_extension(anchor, label, "log")?;
    let diagnostics_sink = std::fs::OpenOptions::new()
        .write(true)
        .open(&diagnostics.0)?;
    // 子进程自成一个进程组，超时按组杀：Word 导出、合并译文这些 pipeline 子命令还会再起
    // 子进程（node、typst…），只杀直接子进程的话孙进程会活下来，继续占着 CPU 往产物目录里写。
    #[cfg(unix)]
    std::os::unix::process::CommandExt::process_group(&mut command, 0);
    // Do not inherit provider output or hold unread pipes that can deadlock.
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::from(diagnostics_sink))
        .spawn()
        .map_err(|error| AppError::internal(format!("failed to start {label} builder: {error}")))?;
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < timeout => {
                std::thread::sleep(POLL_INTERVAL.min(timeout.saturating_sub(started.elapsed())));
            }
            result => {
                // Reap only after a successful kill (or an already exited child),
                // never block waiting on a process we failed to terminate.
                if kill_process_tree(&mut child) {
                    let _ = child.wait();
                } else {
                    let _ = child.try_wait();
                }
                let reason = if result.is_err() {
                    format!("failed to monitor {label} builder")
                } else {
                    format!("{label} builder timed out")
                };
                return Err(AppError::internal(with_diagnostics(reason, &diagnostics.0)));
            }
        }
    };
    Ok((status, Diagnostics(diagnostics)))
}

/// 连孙进程一起杀（子进程在 spawn 时自成一组）：用进程包的 `kill_std_child_process_tree`，
/// Windows 上也是整棵树（以前这里自己 `libc::kill`，Windows 只杀直接子进程）。
fn kill_process_tree(child: &mut std::process::Child) -> bool {
    retainpdf_proc::kill_std_child_process_tree(child)
}

/// 子进程 stderr 的临时文件；drop 时删除。
pub struct Diagnostics(TemporaryOutput);

impl Diagnostics {
    pub fn error(&self, reason: String) -> AppError {
        AppError::internal(with_diagnostics(reason, &self.0 .0))
    }
}

/// 最多带回来的 stderr 字节数。够看清一条 Python traceback 的最后几帧，又不至于把
/// 一个刷屏的子进程整段塞进 HTTP 错误里。
const DIAGNOSTICS_TAIL_BYTES: u64 = 4096;

/// 把子进程 stderr 的尾部接到错误信息后面。读不到就原样返回——诊断信息本身失败
/// 绝不能把真正的错误盖掉。
fn with_diagnostics(reason: String, diagnostics_path: &Path) -> String {
    let Ok(mut file) = std::fs::File::open(diagnostics_path) else {
        return reason;
    };
    let Ok(length) = file.metadata().map(|meta| meta.len()) else {
        return reason;
    };
    if length == 0 {
        return reason;
    }
    let skipped = length.saturating_sub(DIAGNOSTICS_TAIL_BYTES);
    if skipped > 0 && std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(skipped)).is_err() {
        return reason;
    }
    let mut tail = String::new();
    if std::io::Read::read_to_string(&mut file, &mut tail).is_err() {
        // 非 UTF-8 的输出直接放弃，不要为此丢掉 reason。
        return reason;
    }
    let tail = tail.trim();
    if tail.is_empty() {
        return reason;
    }
    let elided = if skipped > 0 { "…" } else { "" };
    format!("{reason}: {elided}{tail}")
}

fn side_by_side_command(deps: DerivedArtifactDeps<'_>) -> std::process::Command {
    let mut command = std::process::Command::new(deps.pipeline_command);
    command.arg("side-by-side-pdf");
    command
}

#[cfg(test)]
#[path = "side_by_side_tests.rs"]
mod tests;
