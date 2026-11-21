//! 备份，以及模型用量（和备份一样是「设置」页的数据；一个任务的用量在 jobs 的 reports 里）。

use std::sync::atomic::Ordering;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;

use crate::app::AppState;
use crate::error::AppError;
use crate::routes::{backups, token_usage};

crate::endpoints! {
    state: AppState;
    /// 全部模型用量
    GET "/api/v1/usage" => token_usage::all_usage_route, signed;
    /// 一本书的模型用量
    GET "/api/v1/documents/:document_id/usage" => token_usage::document_usage_route, signed;
    /// 备份与恢复状态
    GET "/api/v1/backups" => backups::status, admin;
    /// 创建本地迁移包备份
    POST "/api/v1/backups" => backups::create, admin;
    /// 导入迁移包备份
    POST "/api/v1/backups/import" => backups::import, admin [unlimited_body];
    /// 下载本地迁移包备份
    GET "/api/v1/backups/download/:name" => backups::download, admin;
    /// 读取刚恢复的前端配置
    GET "/api/v1/backups/restored-config" => backups::restored_config, admin;
    /// 把云端 WebDAV 备份同步到本地
    POST "/api/v1/backups/webdav/files/:name/sync" => backups::sync_remote, admin;
    /// 删除本地迁移包备份
    DELETE "/api/v1/backups/files/:name" => backups::delete_local, admin;
    /// 从本地迁移包恢复
    POST "/api/v1/backups/restore" => backups::restore_local, admin;
    /// 取消待恢复的迁移包
    DELETE "/api/v1/backups/pending" => backups::cancel, admin;
    /// 保存 WebDAV 备份设置
    PUT "/api/v1/backups/webdav/settings" => backups::save_settings, admin;
    /// 测试 WebDAV 连接
    POST "/api/v1/backups/webdav/test" => backups::test_webdav, admin;
    /// 列出 WebDAV 云端备份
    GET "/api/v1/backups/webdav/files" => backups::list_remote, admin;
    /// 删除 WebDAV 云端备份
    DELETE "/api/v1/backups/webdav/files/:name" => backups::delete_remote, admin;
    /// 备份并上传到 WebDAV
    POST "/api/v1/backups/webdav/backup" => backups::backup_remote, admin;
    /// 从 WebDAV 下载并恢复备份
    POST "/api/v1/backups/webdav/restore" => backups::restore_remote, admin;
}

pub(super) async fn maintenance_access(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let mutation = !matches!(request.method().as_str(), "GET" | "HEAD" | "OPTIONS");
    if !mutation || path == "/api/v1/backups" || path.starts_with("/api/v1/backups/") {
        return next.run(request).await;
    }
    let guard = state.backups.gate.clone().read_owned().await;
    if state.backups.pending.load(Ordering::SeqCst) {
        return AppError::service_unavailable(
            "迁移包已暂存，请重启应用完成恢复，或在设置中取消恢复后继续操作",
        )
        .into_response();
    }
    let response = next.run(request).await;
    let (parts, body) = response.into_parts();
    let stream = futures_util::stream::unfold(
        (body.into_data_stream(), guard),
        |(mut stream, guard)| async move {
            stream.next().await.map(|chunk| (chunk, (stream, guard)))
        },
    );
    Response::from_parts(parts, Body::from_stream(stream))
}
