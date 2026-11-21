use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Shared by every launcher in one owning runtime, including startup recovery.
///
/// 登记的是 `任务编号 -> 这个 driver 所属的运行代次`（`jobs.run_generation`）。同一个代次只许一个
/// driver（重复发射去重）；而任务被原地重跑之后代次变大，新一次运行的发射不能因为上一次运行的
/// driver 还在收尾、登记还没释放就被丢掉——见 [`JobDriverRegistry::holder_generation`]。
#[derive(Default)]
pub struct JobDriverRegistry {
    jobs: Mutex<HashMap<String, u64>>,
}

impl JobDriverRegistry {
    /// 认领 `job_id` 的这次运行。已经有 driver（不管哪个代次）登记着就返回 None。
    pub(super) fn claim(self: &Arc<Self>, job_id: &str, generation: u64) -> Option<JobDriverGuard> {
        let mut jobs = self.jobs.lock().unwrap_or_else(|error| error.into_inner());
        if jobs.contains_key(job_id) {
            return None;
        }
        jobs.insert(job_id.to_owned(), generation);
        Some(JobDriverGuard {
            registry: self.clone(),
            job_id: job_id.to_owned(),
        })
    }

    /// 当前登记着的 driver 属于哪个运行代次；没有 driver 返回 None。
    pub(super) fn holder_generation(&self, job_id: &str) -> Option<u64> {
        self.jobs
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .get(job_id)
            .copied()
    }

    /// 这个任务现在有没有 driver 在管（运行期巡检用）。
    pub fn is_live(&self, job_id: &str) -> bool {
        self.holder_generation(job_id).is_some()
    }
}

pub(super) struct JobDriverGuard {
    registry: Arc<JobDriverRegistry>,
    job_id: String,
}

impl Drop for JobDriverGuard {
    fn drop(&mut self) {
        self.registry
            .jobs
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .remove(&self.job_id);
    }
}
