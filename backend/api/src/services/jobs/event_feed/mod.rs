//! Durable read projection. Source identity, delivery position, and display
//! order are deliberately separate. No task-execution capability lives here.
mod cursor;
mod files;
mod sync;

use std::path::Path;

use super::presentation::redact_job_events;
use crate::db::Db;
use crate::error::AppError;
use crate::models::api::{
    JobEventFeedItem, JobEventListView, JobEventRecord, ListJobEventsQuery, ListJobEventsStart,
};
use crate::models::domain::JobSnapshot;

use sync::synchronize;

pub(crate) fn read_events(
    db: &Db,
    data_root: &Path,
    job_id: &str,
    query: &ListJobEventsQuery,
    ocr_only: bool,
) -> Result<JobEventListView, AppError> {
    // Scope/layout errors precede cursor validation, including OCR-only 404.
    let job = if ocr_only {
        super::query::load_ocr_job_with_supported_layout(db, data_root, job_id)?
    } else {
        super::query::load_supported_job(db, data_root, job_id)?
    };
    if query.cursor.is_some() && query.start.is_some() {
        return Err(AppError::bad_request("cursor and start cannot be combined"));
    }
    let cursor = query
        .cursor
        .as_deref()
        .map(|raw| cursor::Cursor::decode(raw, job_id, ocr_only))
        .transpose()?;
    let state = synchronize(db, data_root, &job)?;
    let limit = query.limit.clamp(1, 500);
    let (after, upper, tail) = match cursor {
        Some(cursor) => {
            if cursor.epoch != state.epoch {
                return Err(expired());
            }
            if cursor.position > state.high_seq || cursor.upper > state.high_seq {
                return Err(AppError::bad_request(
                    "event cursor is beyond the feed watermark",
                ));
            }
            let upper = if cursor.position >= cursor.upper {
                state.high_seq
            } else {
                cursor.upper
            };
            (cursor.position, upper, false)
        }
        None => (
            0,
            state.high_seq,
            !matches!(query.start, Some(ListJobEventsStart::Head)),
        ),
    };
    let result = if tail {
        db.read_event_feed_tail(job_id, &state.epoch, upper, limit)
    } else {
        db.read_event_feed_page(job_id, &state.epoch, after, upper, limit)
    };
    let rows = result.map_err(|error| {
        if error.to_string().contains("epoch changed") {
            expired()
        } else {
            error.into()
        }
    })?;
    let position = rows.last().map(|row| row.seq).unwrap_or(upper);
    // Initial tail must pin exactly the snapshot captured before fetching its
    // rows: newly appended rows belong to the next request, not this cursor.
    let rows: Vec<_> = rows.into_iter().filter(|row| row.seq <= upper).collect();
    let position = position.min(upper);
    let has_more = if tail {
        false
    } else {
        !db.read_event_feed_page(job_id, &state.epoch, position, upper, 1)
            .map_err(|error| {
                if error.to_string().contains("epoch changed") {
                    expired()
                } else {
                    error.into()
                }
            })?
            .is_empty()
    };
    let next_position = if has_more { position } else { upper };
    let mut ids = Vec::with_capacity(rows.len());
    let mut events = Vec::with_capacity(rows.len());
    for row in rows {
        let mut event: JobEventRecord = serde_json::from_value(row.payload)
            .map_err(|_| AppError::internal("invalid stored event projection"))?;
        event.seq = row.seq;
        event.user_stage = event.display_stage.clone();
        ids.push(row.event_id);
        events.push(event);
    }
    let items = ids
        .into_iter()
        .zip(redact_job_events(&job, data_root, events))
        .map(|(event_id, event)| JobEventFeedItem { event_id, event })
        .collect();
    Ok(JobEventListView {
        protocol_version: 2,
        items,
        limit,
        has_more,
        next_cursor: cursor::Cursor::new(job_id, ocr_only, state.epoch, next_position, upper)
            .encode()?,
    })
}

fn expired() -> AppError {
    AppError::event_cursor_expired("event history changed; reload from head or tail")
}

pub(super) fn live_snapshot(
    db: &Db,
    root: &Path,
    job: &JobSnapshot,
) -> Option<super::live_stage::LiveStageSnapshot> {
    let feed = synchronize(db, root, job).ok()?;
    let checkpoints: sync::Checkpoints = serde_json::from_value(feed.checkpoints).ok()?;
    super::live_stage::select_live_stage_snapshot(&checkpoints.stage_basis, &job.status)
}

pub(super) fn live_snapshots(
    db: &Db,
    root: &Path,
    jobs: &[JobSnapshot],
) -> std::collections::HashMap<String, super::live_stage::LiveStageSnapshot> {
    let ids: Vec<_> = jobs.iter().map(|job| job.job_id.as_str()).collect();
    let inputs = db.load_event_projection_inputs(&ids).ok();
    jobs.iter()
        .filter_map(|job| {
            let basis = inputs.as_ref().and_then(|inputs| {
                sync::cached_stage_basis(root, &job.job_id, inputs)
                    .ok()
                    .flatten()
            });
            let live = match basis {
                Some(basis) => super::live_stage::select_live_stage_snapshot(&basis, &job.status),
                None => live_snapshot(db, root, job),
            };
            live.map(|live| (job.job_id.clone(), live))
        })
        .collect()
}

#[cfg(test)]
mod batch_tests;
#[cfg(test)]
mod tests;
