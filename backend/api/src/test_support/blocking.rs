//! 跟着活一起带进阻塞线程的测试设置。

/// 测试用的开发默认模型按线程设（`DevDefaultsGuard`），`run_state_blocking` 把活放进阻塞线程时用这个带过去。
pub(crate) fn carry_test_overrides<T>(work: impl FnOnce() -> T) -> impl FnOnce() -> T {
    crate::services::jobs::carry_dev_defaults_override(work)
}
