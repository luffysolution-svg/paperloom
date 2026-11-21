//! 壳 ↔ 任务运行时的唯一接缝（ADR-002：壳 + 后端进程组）。
//!
//! 这里是全仓**唯一**知道"任务到底跑在哪个进程里"的地方。上层（routes /
//! services/jobs）只看见 `JobRuntimeLauncher` 与 `RuntimeControl` 两个门面，
//! 换落点不影响它们一行代码。
//!
//! 两种落点：
//! - `InProcess`（默认）：闭包直调 `spawn_job`，与拆分前逐字节同行为
//! - `Remote`：经内部 HTTP 交给 retain-jobsd 进程
//!   （契约 backend-root/contracts/jobs-control.v1.schema.json）
//!
//! 取消/清理刻意保持返回 `()`：进程内实现本就不会失败，远端失败只记日志而
//! 不改变上层控制流——否则"取消"这个高频路径会因 jobsd 抖动而向用户报错，
//! 而任务终态本来就由 DB 轮询兜底。终止进程树保留 `Result`，因为调用方
//! （control.rs）本就依赖它的失败来决定是否继续走强制终态。

use std::collections::HashSet;
use std::sync::Arc;

use tokio::sync::RwLock;

use retainpdf_core::config::{JobRunnerConfig, JobsServiceConfig};
use retainpdf_api_base::error::AppError;
use retainpdf_data::db::Db;
use retainpdf_runner::job_runner::{
    clear_cancel_request_with_registry, recorded_worker_is_ours, request_cancel_with_registry,
};
pub use retainpdf_runner::job_runner::{
    translation_artifacts_are_ready, translation_checkpoint_candidate_is_ready, JobDriverRegistry,
};
use retainpdf_proc::terminate_job_process_tree;

/// 远端发射失败后的重试间隔（共重试 3 次，加上第一次一共 4 次尝试）。
const LAUNCH_RETRY_DELAYS: [std::time::Duration; 3] = [
    std::time::Duration::from_millis(300),
    std::time::Duration::from_millis(1_000),
    std::time::Duration::from_millis(3_000),
];

/// 连 jobsd 的连接超时。jobsd 只听回环，连不上就是没起来，不用多等。
const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(2);
/// 一次请求的总超时。launch、cancel 都是受理即返回；jobsd 卡住时不能让取消、强删、发射跟着一直挂着。
/// terminate 要等 jobsd 把进程树停完，在这上面再加 `worker_terminate_grace_secs`。
const REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// 内部 HTTP 客户端：把接缝操作转发给 retain-jobsd。
#[derive(Clone)]
pub struct JobsClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    request_timeout: std::time::Duration,
}

impl JobsClient {
    pub fn new(config: &JobsServiceConfig, api_key: String) -> Self {
        Self::with_timeouts(config, api_key, CONNECT_TIMEOUT, REQUEST_TIMEOUT)
    }

    /// jobsd 只听回环：不走系统代理。用户设了 HTTP_PROXY/ALL_PROXY 而 NO_PROXY 没写 127.0.0.1 时，
    /// 默认客户端会把这些请求也发给代理。
    fn with_timeouts(
        config: &JobsServiceConfig,
        api_key: String,
        connect_timeout: std::time::Duration,
        request_timeout: std::time::Duration,
    ) -> Self {
        let client = reqwest::Client::builder()
            .no_proxy()
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .build()
            .unwrap_or_else(|error| panic!("build jobsd client: {error}"));
        Self {
            client,
            base_url: config.base_url(),
            api_key,
            request_timeout,
        }
    }

    async fn post(&self, path: &str) -> Result<(), AppError> {
        self.send(reqwest::Method::POST, path).await
    }

    async fn delete(&self, path: &str) -> Result<(), AppError> {
        self.send(reqwest::Method::DELETE, path).await
    }

    async fn send(&self, method: reqwest::Method, path: &str) -> Result<(), AppError> {
        let status = self.send_for_status(method, path, self.request_timeout).await?;
        if !status.is_success() {
            return Err(AppError::internal(format!(
                "任务服务拒绝了请求（{path}）：HTTP {status}"
            )));
        }
        Ok(())
    }

    async fn send_for_status(
        &self,
        method: reqwest::Method,
        path: &str,
        timeout: std::time::Duration,
    ) -> Result<reqwest::StatusCode, AppError> {
        let url = format!("{}{path}", self.base_url);
        let response = self
            .client
            .request(method, &url)
            .timeout(timeout)
            .header("X-API-Key", &self.api_key)
            .send()
            .await
            .map_err(|error| {
                AppError::service_unavailable(format!("任务服务不可用（{path}）：{error}"))
            })?;
        Ok(response.status())
    }
}

/// 任务运行时落点。壳启动时装配一次，此后只读。
pub enum JobRuntime {
    InProcess {
        canceled_jobs: Arc<RwLock<HashSet<String>>>,
    },
    Remote {
        client: JobsClient,
    },
}

impl JobRuntime {
    pub fn in_process(canceled_jobs: Arc<RwLock<HashSet<String>>>) -> Self {
        Self::InProcess { canceled_jobs }
    }

    pub fn remote(config: &JobsServiceConfig, api_key: String) -> Self {
        Self::Remote {
            client: JobsClient::new(config, api_key),
        }
    }

    /// 远端发射：把任务交给 jobsd（受理即返回，任务在 jobsd 里异步跑）。
    /// 进程内模式不走这里——它需要应用装配层的运行时依赖，闭包在
    /// app/jobs.rs 就地构造（服务层不得触碰应用状态，见架构门禁）。
    ///
    /// 转发失败（jobsd 重启中、连接抖动）会重试几次；仍失败就把错误交回调用方，由它把任务落成
    /// 失败——不能只打一行日志，否则行停在 queued，没人会去跑它。
    pub async fn launch_remote(&self, job_id: String) -> Result<(), AppError> {
        let Self::Remote { client } = self else {
            return Err(AppError::internal(format!(
                "launch_remote 被进程内运行时调用，任务未发射 job={job_id}"
            )));
        };
        let path = format!("/internal/v1/jobs/{job_id}/launch");
        for (attempt, delay) in LAUNCH_RETRY_DELAYS.iter().enumerate() {
            match client.post(&path).await {
                Ok(()) => return Ok(()),
                Err(error) => {
                    tracing::error!(
                        "launch 转发任务服务失败 job={job_id}（第 {} 次）: {error}",
                        attempt + 1
                    );
                    tokio::time::sleep(*delay).await;
                }
            }
        }
        match client.post(&path).await {
            Ok(()) => Ok(()),
            Err(error) => {
                tracing::error!("launch 转发任务服务最终失败 job={job_id}: {error}");
                Err(error)
            }
        }
    }

    async fn request_cancel(&self, job_id: &str) {
        match self {
            Self::InProcess { canceled_jobs } => {
                request_cancel_with_registry(canceled_jobs, job_id).await
            }
            Self::Remote { client } => {
                if let Err(error) = client
                    .post(&format!("/internal/v1/jobs/{job_id}/cancel"))
                    .await
                {
                    tracing::warn!("cancel 转发任务服务失败 job={job_id}: {error}");
                }
            }
        }
    }

    async fn clear_cancel(&self, job_id: &str) {
        match self {
            Self::InProcess { canceled_jobs } => {
                clear_cancel_request_with_registry(canceled_jobs, job_id).await
            }
            Self::Remote { client } => {
                if let Err(error) = client
                    .delete(&format!("/internal/v1/jobs/{job_id}/cancel"))
                    .await
                {
                    tracing::warn!("clear-cancel 转发任务服务失败 job={job_id}: {error}");
                }
            }
        }
    }

    async fn terminate_process(&self, pid: u32, config: &JobRunnerConfig) -> Result<(), AppError> {
        match self {
            Self::InProcess { .. } => terminate_job_process_tree(
                pid,
                config.worker_terminate_grace_secs,
                config.worker_terminate_poll_ms,
            )
            .await
            .map_err(|e| AppError::internal(format!("failed to terminate job process tree: {e}"))),
            // 远端模式下 worker 是 jobsd 的子进程：必须由 jobsd 组杀，壳直接
            // 杀会绕过它的进程组记账。
            //
            // jobsd 只杀它登记过、身份核对得上的 worker；404（not_a_registered_worker）说明这个
            // pid 已经不是任何 running 任务的 worker 了（刚退出、号被复用），没有东西要杀，不算失败。
            Self::Remote { client } => {
                let path = format!("/internal/v1/processes/{pid}/terminate");
                let timeout = client.request_timeout
                    + std::time::Duration::from_secs(config.worker_terminate_grace_secs);
                match client
                    .send_for_status(reqwest::Method::POST, &path, timeout)
                    .await?
                {
                    status if status.is_success() => Ok(()),
                    reqwest::StatusCode::NOT_FOUND => {
                        tracing::warn!(
                            "jobsd: pid={pid} is not a registered worker any more; nothing to terminate"
                        );
                        Ok(())
                    }
                    status => Err(AppError::internal(format!(
                        "任务服务拒绝了请求（{path}）：HTTP {status}"
                    ))),
                }
            }
        }
    }
}

#[derive(Clone)]
pub struct JobRuntimeLauncher {
    launch_job: Arc<dyn Fn(String) + Send + Sync + 'static>,
}

impl JobRuntimeLauncher {
    pub fn new(launch_job: Arc<dyn Fn(String) + Send + Sync + 'static>) -> Self {
        Self { launch_job }
    }

    pub fn launch(&self, job_id: String) {
        (self.launch_job)(job_id);
    }
}

#[derive(Clone, Copy)]
pub struct RuntimeControl<'a> {
    runtime: &'a JobRuntime,
}

impl<'a> RuntimeControl<'a> {
    pub fn new(runtime: &'a JobRuntime) -> Self {
        Self { runtime }
    }

    /// 终止进程树与取消共用同一落点：远端模式下必须由 jobsd 组杀。
    pub fn job_runtime(&self) -> &'a JobRuntime {
        self.runtime
    }

    pub async fn request_cancel(&self, job_id: &str) {
        self.runtime.request_cancel(job_id).await;
    }

    /// Removes a pending cancel-request entry for `job_id` without waiting for
    /// a runner to consume it. Used when a cancel request races a job that
    /// has already reached a terminal state, so the in-memory registry does
    /// not accumulate orphaned entries that no runner will ever clear.
    pub async fn clear_cancel(&self, job_id: &str) {
        self.runtime.clear_cancel(job_id).await;
    }
}

pub async fn terminate_runtime_process(
    runtime: &JobRuntime,
    pid: u32,
    config: &JobRunnerConfig,
) -> Result<(), AppError> {
    runtime.terminate_process(pid, config).await
}

/// 终止任务 `job_id` 库里记的 worker `pid`，但先核对它还是这个任务的 worker（spawn 时记下的进程身份，
/// 见 retainpdf-runner 的 `worker_identity`）。worker 已经退出、库里 pid 还没清的窗口里，这个号可能已经
/// 归了别的进程，不能把它整组杀掉：核对不上就只打日志、返回成功。远端模式下 jobsd 收到 terminate
/// 还会按同一套规则再核对一次。
pub async fn terminate_job_worker(
    runtime: &JobRuntime,
    db: &Db,
    job_id: &str,
    pid: u32,
    config: &JobRunnerConfig,
) -> Result<(), AppError> {
    let ours = recorded_worker_is_ours(db, job_id, pid)
        .map_err(|error| AppError::internal(format!("check worker identity: {error:#}")))?;
    if !ours {
        tracing::warn!(
            "job {job_id}: recorded worker pid={pid} is gone or now belongs to another process; not signaling it"
        );
        return Ok(());
    }
    terminate_runtime_process(runtime, pid, config).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    /// 假 jobsd：每个连接读完请求后等 `delay` 再回 200；`delay` 为 None 就一直不回。
    async fn fake_jobsd(delay: Option<Duration>) -> JobsServiceConfig {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            loop {
                let (mut socket, _) = listener.accept().await.unwrap();
                tokio::spawn(async move {
                    let mut buf = [0u8; 4096];
                    let _ = socket.read(&mut buf).await;
                    let Some(delay) = delay else {
                        std::future::pending::<()>().await;
                        return;
                    };
                    tokio::time::sleep(delay).await;
                    let _ = socket
                        .write_all(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\n{}")
                        .await;
                });
            }
        });
        JobsServiceConfig {
            mode: retainpdf_core::config::JobsRuntimeMode::Remote,
            port,
            ..Default::default()
        }
    }

    fn remote(config: &JobsServiceConfig, request_timeout: Duration) -> JobRuntime {
        JobRuntime::Remote {
            client: JobsClient::with_timeouts(
                config,
                "test-key".into(),
                Duration::from_millis(500),
                request_timeout,
            ),
        }
    }

    #[tokio::test]
    async fn a_hung_jobsd_does_not_hold_the_request_forever() {
        let config = fake_jobsd(None).await;
        let JobRuntime::Remote { client } = remote(&config, Duration::from_millis(300)) else {
            unreachable!()
        };
        let result = tokio::time::timeout(
            Duration::from_secs(3),
            client.post("/internal/v1/jobs/job-1/cancel"),
        )
        .await
        .expect("request to a hung jobsd must give up on its own");
        assert!(result.is_err(), "hung jobsd must surface as an error");
    }

    #[tokio::test]
    async fn terminate_gets_the_worker_grace_on_top_of_the_request_timeout() {
        let config = fake_jobsd(Some(Duration::from_millis(900))).await;
        let runtime = remote(&config, Duration::from_millis(300));
        let with_grace = JobRunnerConfig {
            worker_terminate_grace_secs: 1,
            ..Default::default()
        };
        runtime
            .terminate_process(4242, &with_grace)
            .await
            .expect("jobsd answering within the grace is a success");

        let no_grace = JobRunnerConfig {
            worker_terminate_grace_secs: 0,
            ..Default::default()
        };
        assert!(runtime.terminate_process(4242, &no_grace).await.is_err());
    }
}
