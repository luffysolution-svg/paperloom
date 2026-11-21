//! 数据库备份的接口视图(/api/v1/backups)。2026-10-18 从核心包挪到平台包。

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct BackupItemView {
    pub id: String,
    /// auto(每天自动)、manual(手动)、before-restore(恢复前)、before-upgrade(升级前)。
    pub kind: String,
    pub created_at: String,
    /// 备份时数据库的结构版本。
    pub schema_version: i64,
    /// 压缩后的大小。
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupStatusView {
    /// 备份放在哪个目录。
    pub dir: String,
    /// 自动备份间隔(小时);0 表示关掉了自动备份。
    pub auto_interval_hours: u64,
    pub last_auto_at: Option<String>,
    /// 正在备份或恢复。
    pub running: bool,
    /// 现在恢复的话要先等什么(空表示可以恢复)。
    pub restore_blockers: Vec<String>,
    /// 最近一次恢复(不论成败;2026-10-22 加)。恢复的请求断开了,刷新后凭它知道结果。只在
    /// 内存里,服务重启后为 null。
    pub last_restore: Option<LastRestoreView>,
    /// 新的在前。
    pub items: Vec<BackupItemView>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupRestoreView {
    pub restored: String,
    /// 恢复前自动存的那份(恢复错了用它退回)。
    pub safety_backup: String,
    pub status: BackupStatusView,
}

/// 最近一次恢复的结果(`GET /backups` 的 `last_restore`)。
#[derive(Debug, Clone, Serialize)]
pub struct LastRestoreView {
    /// 要恢复的那份。
    pub backup_id: String,
    pub ok: bool,
    /// 恢复前自动存的那份;没走到那一步(被拒、出错在前)时为 null。
    pub safety_backup: Option<String>,
    /// 被拒时的稳定原因:`restore_blocked`、`backup_damaged`、`backup_newer`(和 409 的
    /// `error.details.reason` 一样)、`not_found`;成功或内部错误为 null。
    pub reason: Option<String>,
    /// 失败时给人看的说明;成功为 null。
    pub error: Option<String>,
    pub started_at: String,
    pub finished_at: String,
}
