use crate::app::AppState;
use crate::error::AppError;

/// 处理函数里同步碰库、读写文件的部分放进阻塞线程，不占异步工作线程：库被锁（`busy_timeout` 最长 5 秒）、
/// 磁盘慢的时候，同一个工作线程上的事件流、进度、下载会跟着卡（服务端工程审查 H2）。
/// 带走一份 `AppState`（里面都是 `Arc`），在阻塞线程里照旧建 deps；返回和错误原样不变，
/// 只有阻塞任务本身异常（panic）才变成 500 `<what> task failed`。
/// 书库、凭据、术语表、字体有各自只带走所需依赖的版本（`run_library_blocking` 等）。
pub async fn run_state_blocking<T: Send + 'static>(
    state: &AppState,
    what: &'static str,
    work: impl FnOnce(&AppState) -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    let state = state.clone();
    let work = move || work(&state);
    // 测试用的开发默认模型按线程设（见 `DevDefaultsGuard`），跟着带进阻塞线程。
    #[cfg(test)]
    let work = crate::test_support::blocking::carry_test_overrides(work);
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|_| AppError::internal(format!("{what} task failed")))?
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use super::*;
    use crate::api_tests::jobs_common::test_state;

    /// 单线程运行时（`#[tokio::test]` 默认）上也成立：阻塞的活在别的线程上，
    /// 同时挂着的计时器照常走完，不等它。直接在处理函数里做同步活的话，计时器要等满 400ms。
    #[tokio::test]
    async fn blocking_work_does_not_hold_the_async_thread() {
        let state = test_state("run-state-blocking");
        let started = Instant::now();
        let work = run_state_blocking(&state, "slow work", |_| {
            std::thread::sleep(Duration::from_millis(400));
            Ok(7)
        });
        let timer = async {
            tokio::time::sleep(Duration::from_millis(20)).await;
            started.elapsed()
        };
        let (value, timer_elapsed) = tokio::join!(work, timer);
        assert_eq!(value.unwrap(), 7);
        assert!(timer_elapsed < Duration::from_millis(300), "timer waited {timer_elapsed:?}");
    }

    #[tokio::test]
    async fn errors_come_back_unchanged_and_panics_become_internal_errors() {
        let state = test_state("run-state-blocking-errors");
        let error = run_state_blocking::<()>(&state, "lookup", |_| Err(AppError::not_found("job missing")))
            .await
            .unwrap_err();
        assert!(matches!(error, AppError::NotFound(_)), "{error:?}");
        let error = run_state_blocking::<()>(&state, "lookup", |_| panic!("boom")).await.unwrap_err();
        assert!(matches!(&error, AppError::Internal(message) if message == "lookup task failed"), "{error:?}");
    }
}
