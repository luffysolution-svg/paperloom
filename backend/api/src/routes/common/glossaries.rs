use crate::app::AppState;
use crate::error::AppError;
use crate::services::glossaries::GlossaryApiDeps;

pub fn build_glossary_route_deps(state: &AppState) -> GlossaryApiDeps<'_> {
    GlossaryApiDeps::new(state.db.as_ref())
}

/// 术语表的同步活（SQLite 读写）放进阻塞线程，不占异步工作线程。只带走数据库；返回和错误原样不变。
pub async fn run_glossary_blocking<T: Send + 'static>(
    state: &AppState,
    work: impl for<'a> FnOnce(&GlossaryApiDeps<'a>) -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || work(&GlossaryApiDeps::new(db.as_ref())))
        .await
        .map_err(|_| AppError::internal("glossary task failed"))?
}
