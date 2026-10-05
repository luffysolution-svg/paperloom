use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::error::AppError;
use crate::models::domain::JobSnapshot;

use super::{cached_output_is_fresh, job_artifacts_dir, DerivedArtifactDeps};

/// 比 side-by-side 宽：每页都要把源 PDF 渲成背景位图，整本几百页时这是大头。
const BUILD_TIMEOUT: Duration = Duration::from_secs(600);

pub(crate) const DEFAULT_BACKGROUND_DPI: u32 = 180;

#[derive(Clone, Copy)]
pub(crate) struct LayoutDocxOptions {
    pub(crate) dpi: u32,
}

impl Default for LayoutDocxOptions {
    fn default() -> Self {
        Self {
            dpi: DEFAULT_BACKGROUND_DPI,
        }
    }
}

impl LayoutDocxOptions {
    /// 缓存键的一部分：换了 DPI 就是另一份产物，不能命中上一份。
    pub(crate) fn cache_suffix(&self) -> String {
        format!("dpi{}", self.dpi)
    }
}

pub(crate) fn ensure_layout_docx(
    deps: DerivedArtifactDeps<'_>,
    data_root: &Path,
    job: &JobSnapshot,
    job_root: &Path,
    source_pdf: &Path,
    translated_pdf: Option<&Path>,
    options: LayoutDocxOptions,
) -> Result<PathBuf, AppError> {
    let output_dir = job_artifacts_dir(data_root, job)?;
    let output_docx = output_dir.join(format!(
        "{}-layout-{}.docx",
        job.job_id,
        options.cache_suffix()
    ));
    // 译文 PDF 在的时候也算输入:收敛后的字号和行距是从它里面读回来的（见 Python 侧
    // `typography_readback`），它一重渲染这份 docx 就过期了。不在的时候导出走
    // `html_fit`，只跟着源 PDF 和译文变。
    let mut inputs: Vec<&Path> = vec![source_pdf];
    inputs.extend(translated_pdf);
    if !cached_output_is_fresh(&output_docx, &inputs)? {
        super::side_by_side::build_with_command(
            &output_docx,
            "layout-docx",
            BUILD_TIMEOUT,
            |temporary| {
                let mut command = std::process::Command::new(deps.pipeline_command);
                command
                    .arg("layout-docx")
                    .arg("--job-root")
                    .arg(job_root)
                    .arg("--output-docx")
                    .arg(temporary)
                    .arg("--dpi")
                    .arg(options.dpi.to_string())
                    // 把已经解析好的路径传过去，别让 Python 靠 job_root 再猜一遍。
                    // translate-only 的任务自己的 source/ 是空的，源 PDF 在上游 OCR
                    // 任务目录里——这边 resolve_source_pdf 找得到，那边按 job_root 找
                    // 不到，表现是整条导出 500 而报错里看不出原因。
                    .arg("--source-pdf")
                    .arg(source_pdf);
                if let Some(path) = translated_pdf {
                    command.arg("--translated-pdf").arg(path);
                }
                command
            },
        )?;
    }
    Ok(output_docx)
}

#[cfg(test)]
#[path = "word_tests.rs"]
mod tests;
