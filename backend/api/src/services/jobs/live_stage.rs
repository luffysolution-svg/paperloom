use std::path::Path;

use crate::db::Db;
use crate::models::domain::JobSnapshot;

// Public live-stage projection stays here; event loading, child-event merging,
// and snapshot selection are split out to keep the progress contract auditable.
mod canonical_events;
mod pipeline_events;
mod snapshot;

pub(super) use canonical_events::canonicalize_job_event;
pub(super) use pipeline_events::parse_feed_line;
pub(super) use snapshot::{compact_stage_basis, select_live_stage_snapshot};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LiveStageSnapshot {
    pub display_stage: Option<String>,
    pub stage: Option<String>,
    pub substage: Option<String>,
    pub lane: Option<String>,
    pub stage_detail: Option<String>,
    pub progress_current: Option<i64>,
    pub progress_total: Option<i64>,
    pub progress_unit: Option<String>,
    pub background_stages: Vec<LiveStageSnapshot>,
}

pub(crate) fn load_live_stage_snapshot(
    db: &Db,
    job: &JobSnapshot,
    data_root: &Path,
) -> Option<LiveStageSnapshot> {
    super::event_feed::live_snapshot(db, data_root, job)
}

pub(crate) fn load_live_stage_snapshots(
    db: &Db,
    jobs: &[JobSnapshot],
    data_root: &Path,
) -> std::collections::HashMap<String, LiveStageSnapshot> {
    super::event_feed::live_snapshots(db, data_root, jobs)
}
