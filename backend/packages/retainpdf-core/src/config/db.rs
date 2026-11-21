use std::time::Duration;

use super::env_vars::{env_bool, env_u64};

#[derive(Clone, Debug)]
pub struct DbConfig {
    pub busy_timeout: Duration,
    /// 结构升级前的备份没存成时拒绝升级、不启动（`RUST_API_DB_REQUIRE_UPGRADE_BACKUP`，默认关：
    /// 只记 `error` 照常升级，备份目录写不进去不该让程序起不来）。
    pub require_upgrade_backup: bool,
}

impl DbConfig {
    pub fn from_env() -> Self {
        Self {
            busy_timeout: Duration::from_millis(env_u64("RUST_API_DB_BUSY_TIMEOUT_MS", 5000)),
            require_upgrade_backup: env_bool("RUST_API_DB_REQUIRE_UPGRADE_BACKUP", false),
        }
    }
}

impl Default for DbConfig {
    fn default() -> Self {
        Self::from_env()
    }
}
