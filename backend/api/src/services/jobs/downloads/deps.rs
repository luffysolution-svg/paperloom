use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::db::Db;
use crate::services::download_generation::DownloadGeneration;

pub(super) struct DownloadJobsDeps<'a> {
    pub(super) db: &'a Db,
    pub(super) data_root: &'a Path,
    pub(super) downloads_dir: &'a Path,
    pub(super) download_generation: &'a Arc<DownloadGeneration>,
    pub(super) python_bin: &'a str,
    pub(super) pipeline_command: &'a str,
    pub(super) public_base_url: Option<&'a str>,
}

/// An admitted blocking task owns only the resources needed to read or generate
/// its artifact. Its lifetime never captures the application or job executor.
pub(super) struct OwnedDownloadJobsDeps {
    db: Db,
    data_root: PathBuf,
    downloads_dir: PathBuf,
    download_generation: Arc<DownloadGeneration>,
    python_bin: String,
    pipeline_command: String,
    public_base_url: Option<String>,
}

impl DownloadJobsDeps<'_> {
    pub(super) fn owned(&self) -> OwnedDownloadJobsDeps {
        OwnedDownloadJobsDeps {
            db: self.db.clone(),
            data_root: self.data_root.into(),
            downloads_dir: self.downloads_dir.into(),
            download_generation: self.download_generation.clone(),
            python_bin: self.python_bin.into(),
            pipeline_command: self.pipeline_command.into(),
            public_base_url: self.public_base_url.map(str::to_string),
        }
    }
}

impl OwnedDownloadJobsDeps {
    pub(super) fn borrowed(&self) -> DownloadJobsDeps<'_> {
        DownloadJobsDeps {
            db: &self.db,
            data_root: &self.data_root,
            downloads_dir: &self.downloads_dir,
            download_generation: &self.download_generation,
            python_bin: &self.python_bin,
            pipeline_command: &self.pipeline_command,
            public_base_url: self.public_base_url.as_deref(),
        }
    }
}
