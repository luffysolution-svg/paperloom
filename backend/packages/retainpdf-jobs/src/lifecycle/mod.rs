//! 任务：建任务（唯一入口 `submit_job`）、校验、发射、列表和详情，删任务（`deletion`）和删后清理凭据。

pub(crate) mod creation;
pub(crate) mod deletion;
pub mod launcher;
pub(crate) mod managed_credential_gc;
pub(crate) mod ocr_artifact_reuse;
mod queries;
pub mod snapshot_factory;
mod submission;
pub mod validation;

pub use creation::with_dev_translation_defaults;
#[cfg(any(test, feature = "test-fixtures"))]
pub use creation::{carry_dev_defaults_override, DevDefaultsGuard, DevTranslationDefaults};
