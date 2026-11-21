use retainpdf_api_base::error::AppError;
use crate::views::JobFilesQuery;
use crate::files::downloads::FileDownload;

use crate::files::downloads::catalog::{named_file, FileGroup};
use crate::files::downloads::files::{generation_key, open_job_file, Disposition, JobFile};
use crate::files::downloads::JobDownloads;

impl<'a> JobDownloads<'a> {
    /// 任务文件的唯一下载入口。读文件、按需生成都放进 `download_generation`：
    /// 同一份产物同时被请求时只生成一次，也不占着异步运行时。
    pub async fn open(
        &self,
        job_id: &str,
        file: JobFile,
        disposition: Disposition,
    ) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let key = generation_key(job_id, &file);
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(key, move || {
                open_job_file(&deps.borrowed(), &job_id, &file, disposition)
            })
            .await
    }

    /// 新地址 `/jobs/:id/files/<组>/<文件名>`：默认在浏览器里打开，`?download=1` 直接下载。
    pub async fn open_named(
        &self,
        job_id: &str,
        group: FileGroup,
        name: &str,
        query: &JobFilesQuery,
    ) -> Result<FileDownload, AppError> {
        let file = named_file(group, name, query)?;
        let disposition = if query.wants_download() {
            Disposition::Attachment
        } else {
            Disposition::Inline
        };
        let mut download = self.open(job_id, file, disposition).await?;
        // 中间产物下载时叫地址里的名字（`ocr-provider/result.json` → `ocr-provider-result.json`），
        // 不叫磁盘上的原名（`paddle_result.json`）。给用户的成品用带书名的名字，不在这里改。
        if group == FileGroup::Internal {
            let name = name.replace('/', "-");
            if download.download_name.is_some() {
                download.download_name = Some(name);
            } else if download.inline_name.is_some() {
                download.inline_name = Some(name);
            }
        }
        Ok(download)
    }
}
