//! 进程监督器（AI 服务、jobsd）的状态码。监督器在 retainpdf-api 的 `runtime` 里写状态，
//! 平台的健康检查读状态；两边都往下用这里，谁也不依赖谁。

pub const SUPERVISOR_DISABLED: u8 = 0;
pub const SUPERVISOR_STARTING: u8 = 1;
pub const SUPERVISOR_HEALTHY: u8 = 2;
pub const SUPERVISOR_UNHEALTHY: u8 = 3;

pub fn supervisor_status_label(status: u8) -> &'static str {
    match status {
        SUPERVISOR_STARTING => "starting",
        SUPERVISOR_HEALTHY => "healthy",
        SUPERVISOR_UNHEALTHY => "unhealthy",
        _ => "unsupervised",
    }
}
