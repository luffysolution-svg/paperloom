use std::path::Path;

use crate::app::AppState;
use crate::db::Db;
use crate::error::AppError;

/// 凭据库的活（读写 `secrets/credentials.json`、进程内锁和跨进程 `flock`、`fsync`，删除时数 SQLite 里的引用）
/// 放进阻塞线程，不占异步工作线程：建任务拿着共享锁、另一个后端进程拿着锁时，写请求会一直等 `flock`。
/// 只带走数据库和数据目录；返回和错误原样不变。照 `20261019-书库读错和阻塞线程.md` 的写法。
pub async fn run_credentials_blocking<T: Send + 'static>(
    state: &AppState,
    work: impl FnOnce(&Db, &Path) -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    let db = state.db.clone();
    let data_root = state.config.data_root.clone();
    tokio::task::spawn_blocking(move || work(&db, &data_root))
        .await
        .map_err(|_| AppError::internal("credential task failed"))?
}
