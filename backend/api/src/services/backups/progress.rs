use std::sync::{Arc, Mutex};

use serde::Serialize;

use crate::error::AppError;

#[derive(Clone, Serialize)]
pub(crate) struct BackupProgress {
    pub state: &'static str,
    pub phase: &'static str,
    pub completed: u64,
    pub total: Option<u64>,
    pub unit: &'static str,
    pub message: Option<String>,
}

#[derive(Clone, Default)]
pub(super) struct Progress(Arc<Mutex<Option<BackupProgress>>>);

impl Progress {
    pub fn snapshot(&self) -> Option<BackupProgress> {
        self.0.lock().unwrap().clone()
    }

    pub fn phase(&self, phase: &'static str, total: Option<u64>, unit: &'static str) {
        *self.0.lock().unwrap() = Some(BackupProgress {
            state: "running",
            phase,
            completed: 0,
            total,
            unit,
            message: None,
        });
    }

    pub fn advance(&self, count: u64) {
        if let Some(progress) = self.0.lock().unwrap().as_mut() {
            progress.completed += count;
        }
    }

    pub async fn track<T>(
        &self,
        phase: &'static str,
        work: impl std::future::Future<Output = Result<T, AppError>>,
    ) -> Result<T, AppError> {
        self.phase(phase, None, "bytes");
        let result = work.await;
        if let Some(progress) = self.0.lock().unwrap().as_mut() {
            progress.state = if result.is_ok() {
                "completed"
            } else {
                "failed"
            };
            progress.message = result.as_ref().err().map(ToString::to_string);
        }
        result
    }
}
