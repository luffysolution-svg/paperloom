use crate::app::AppState;
use crate::config::AppConfig;
use crate::db::Db;
use crate::error::AppError;
use crate::services::library::LibraryDeps;

pub struct LibraryRouteDeps<'a> {
    pub library: LibraryDeps<'a>,
    pub default_port: u16,
    pub bind_host: String,
}

fn library_deps<'a>(db: &'a Db, config: &'a AppConfig) -> LibraryDeps<'a> {
    LibraryDeps {
        db,
        data_root: &config.data_root,
        output_root: &config.output_root,
        downloads_dir: &config.downloads_dir,
        scripts_dir: &config.scripts_dir,
        python_bin: &config.python_bin,
        pipeline_command: &config.pipeline_command,
    }
}

/// Ordinary library requests need no job runtime. Routes that operate on jobs
/// compose these resources with the existing jobs route dependencies explicitly.
pub fn build_library_route_deps(state: &AppState) -> LibraryRouteDeps<'_> {
    LibraryRouteDeps {
        library: library_deps(state.db.as_ref(), &state.config),
        default_port: state.config.port,
        bind_host: state.config.bind_host.clone(),
    }
}

/// 书库的同步活（SQLite 查询、删目录）放进阻塞线程，不占异步工作线程（库被锁、删大书时
/// 同一线程上的事件流、进度会跟着卡）。只带走数据库和配置，不带任务运行时；返回和错误原样不变。
pub async fn run_library_blocking<T: Send + 'static>(
    state: &AppState,
    work: impl for<'a> FnOnce(&LibraryDeps<'a>) -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    let db = state.db.clone();
    let config = state.config.clone();
    tokio::task::spawn_blocking(move || work(&library_deps(&db, &config)))
        .await
        .map_err(|_| AppError::internal("library task failed"))?
}
