//! retainpdf-runner：作业运行时层（job_runner）。
//!
//! 链式 re-export retainpdf-core / retainpdf-data 的模块，使搬入文件中的
//! `crate::models`、`crate::db`、`crate::ocr_provider` 等路径原样解析，无需改写。

pub use retainpdf_core::{config, job_failure, models, storage_paths};
pub use retainpdf_data::{db, job_events, ocr_provider, worker_command};

pub mod job_runner;
