use std::num::NonZeroU64;

use crate::app::AppState;
use crate::error::AppError;
use crate::services::platform::FontApiDeps;

const FONT_UPLOAD_MAX_BYTES: u64 = 64 * 1024 * 1024;

pub struct FontsRouteDeps<'a> {
    pub font_api: FontApiDeps<'a>,
    pub upload_max_bytes: NonZeroU64,
}

pub fn build_fonts_route_deps(state: &AppState) -> FontsRouteDeps<'_> {
    FontsRouteDeps {
        font_api: FontApiDeps::new(&state.config.project_root, &state.config.data_root),
        upload_max_bytes: NonZeroU64::new(FONT_UPLOAD_MAX_BYTES)
            .expect("font upload limit must be non-zero"),
    }
}

/// 字体扫描（`fc-list`、每个文件一次 `fc-query`）和上传后的 `fc-cache -f` 都是同步起子进程，
/// 放进阻塞线程，不占异步工作线程。返回和错误原样不变。
pub async fn run_fonts_blocking<T: Send + 'static>(
    state: &AppState,
    work: impl for<'a> FnOnce(&FontApiDeps<'a>) -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    let config = state.config.clone();
    tokio::task::spawn_blocking(move || work(&FontApiDeps::new(&config.project_root, &config.data_root)))
        .await
        .map_err(|_| AppError::internal("font task failed"))?
}
