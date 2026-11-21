use std::path::{Path, PathBuf};
use std::sync::Arc;

use retainpdf_data::db::Db;
use retainpdf_files::DownloadGeneration;

pub(crate) struct DownloadJobsDeps<'a> {
    pub(crate) db: &'a Db,
    pub(crate) data_root: &'a Path,
    pub(crate) downloads_dir: &'a Path,
    pub(crate) download_generation: &'a Arc<DownloadGeneration>,
    pub(crate) python_bin: &'a str,
    pub(crate) pipeline_command: &'a str,
}

/// An admitted blocking task owns only the resources needed to read or generate
/// its artifact. Its lifetime never captures the application or job executor.
pub(crate) struct OwnedDownloadJobsDeps {
    db: Db,
    data_root: PathBuf,
    downloads_dir: PathBuf,
    download_generation: Arc<DownloadGeneration>,
    python_bin: String,
    pipeline_command: String,
}

impl DownloadJobsDeps<'_> {
    pub(crate) fn owned(&self) -> OwnedDownloadJobsDeps {
        OwnedDownloadJobsDeps {
            db: self.db.clone(),
            data_root: self.data_root.into(),
            downloads_dir: self.downloads_dir.into(),
            download_generation: self.download_generation.clone(),
            python_bin: self.python_bin.into(),
            pipeline_command: self.pipeline_command.into(),
        }
    }
}

impl OwnedDownloadJobsDeps {
    pub(crate) fn borrowed(&self) -> DownloadJobsDeps<'_> {
        DownloadJobsDeps {
            db: &self.db,
            data_root: &self.data_root,
            downloads_dir: &self.downloads_dir,
            download_generation: &self.download_generation,
            python_bin: &self.python_bin,
            pipeline_command: &self.pipeline_command,
        }
    }
}
