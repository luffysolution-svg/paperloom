use serde::{Deserialize, Serialize};

use crate::models::JobStatusKind;

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq, Eq)]
pub struct JobStageTiming {
    pub stage: String,
    pub detail: Option<String>,
    pub enter_at: String,
    pub exit_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub terminal_status: Option<JobStatusKind>,
    /// 离开这个阶段时的进度,归档用。
    ///
    /// `stages.*.progress` 只反映当前活跃阶段的瞬时快照,阶段一结束就变回
    /// null——任务跑完再想知道「这次翻译了多少块」就没地方查了。进度记在
    /// 这里,`stages` 那边保持「现在怎么样」的单一语义,两者不互相污染。
    ///
    /// 旧记录没有这两个字段,`serde(default)` 让它们读成 None。
    #[serde(default)]
    pub progress_current: Option<i64>,
    #[serde(default)]
    pub progress_total: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq, Eq)]
pub struct JobRuntimeInfo {
    pub current_stage: Option<String>,
    pub stage_started_at: Option<String>,
    pub last_stage_transition_at: Option<String>,
    pub terminal_reason: Option<String>,
    pub last_error_at: Option<String>,
    pub total_elapsed_ms: Option<i64>,
    pub active_stage_elapsed_ms: Option<i64>,
    pub retry_count: u32,
    pub last_retry_at: Option<String>,
    pub stage_history: Vec<JobStageTiming>,
    pub final_failure_category: Option<String>,
    pub final_failure_summary: Option<String>,
}
