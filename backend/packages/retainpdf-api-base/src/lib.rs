//! API 各领域包共用的底座，在 `services` 下面一层：
//!
//! - `disk_space`：数据目录所在磁盘还剩多少空间，上传、建任务前查一下；
//! - `error`：错误类型 `AppError`，以及它对外的 HTTP 错误契约（状态码、`code`、结构化原因）；
//! - `job_loading`：按编号读出任务、确认格式受支持，以及合并阅读的虚拟任务；
//! - `paging`：列表分页的共用校验（`limit` 越界 400）；
//! - `supervisor`：进程监督器（AI 服务、jobsd）的状态码；
//! - `test_fixtures`：只给测试用的小工具（找项目的 Python 环境、最小 PDF），挂在 `test-fixtures` 特性下。
//!
//! 以后按领域拆出去的包都往下依赖这里。它不依赖 `retainpdf-api`，也就用不了 `services`、`routes`
//! 和 `AppState`，这一条由编译器保证。

pub mod disk_space;
pub mod error;
pub mod job_loading;
pub mod paging;
pub mod supervisor;
#[cfg(any(test, feature = "test-fixtures"))]
pub mod test_fixtures;
