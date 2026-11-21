use std::path::Path;
use std::sync::Arc;

use retainpdf_data::db::Db;
use retainpdf_files::DownloadGeneration;

pub(crate) use self::deps::DownloadJobsDeps;

// Keep this file as the small public facade for job downloads. Concrete
// handlers live in submodules so PDF, preview, and artifact behavior can evolve
// without turning one route helper into another large grab bag. Markdown lives
// in `reader/markdown.rs`, the AI documents and board in `ai/`.
mod artifact_deps;
mod catalog;
mod deps;
mod files;
mod paths;
mod pdf;
mod service;
mod stored;

#[cfg(all(test, unix))]
mod tests;
#[cfg(all(unix, any(test, feature = "test-fixtures")))]
pub(crate) mod fixture;

pub use catalog::{job_files_view, FileGroup, JobFilesView};
pub use files::{Disposition, JobFile};
pub use stored::{stored_path, StoredFile};
/// 文件句柄的类型定义在下载调度里（它调度的就是这个），这里转出去，任务这边照旧这么叫。
pub use retainpdf_files::FileDownload;

/// Download capabilities contain no launcher, upload, control, or replay state.
pub struct JobDownloads<'a> {
    pub(crate) deps: DownloadJobsDeps<'a>,
}

impl<'a> JobDownloads<'a> {
    pub fn new(
        db: &'a Db,
        data_root: &'a Path,
        downloads_dir: &'a Path,
        download_generation: &'a Arc<DownloadGeneration>,
        python_bin: &'a str,
        pipeline_command: &'a str,
    ) -> Self {
        Self {
            deps: DownloadJobsDeps {
                db,
                data_root,
                downloads_dir,
                download_generation,
                python_bin,
                pipeline_command,
            },
        }
    }
}

