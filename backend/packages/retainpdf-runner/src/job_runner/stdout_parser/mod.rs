use crate::models::domain::JobSnapshot;

mod artifact_fields;
mod artifact_rules;
#[cfg(test)]
mod contract_lock;
mod durable_rules;
mod failure;
mod labels;
mod metric_rules;
mod stage_rules;
mod state;

pub(crate) use artifact_rules::{parse_artifact_published_line, PublishedArtifactLine};
pub(crate) use durable_rules::{
    parse_pipeline_checkpoint_line, parse_pipeline_stage_observation_line,
    PipelineCheckpointObservation, PipelineStageObservationLine,
};
pub use failure::attach_provider_failure;
pub use labels::{
    STDOUT_LABEL_EVENTS_JSONL, STDOUT_LABEL_JOB_ROOT, STDOUT_LABEL_LAYOUT_JSON,
    STDOUT_LABEL_NORMALIZATION_REPORT_JSON, STDOUT_LABEL_NORMALIZED_DOCUMENT_JSON,
    STDOUT_LABEL_OUTPUT_PDF, STDOUT_LABEL_PROVIDER_RAW_DIR, STDOUT_LABEL_PROVIDER_SUMMARY_JSON,
    STDOUT_LABEL_PROVIDER_ZIP, STDOUT_LABEL_SCHEMA_VERSION, STDOUT_LABEL_SOURCE_PDF,
    STDOUT_LABEL_SUMMARY, STDOUT_LABEL_TRANSLATIONS_DIR,
};
pub(crate) use state::{job_artifacts_mut, ocr_provider_diagnostics_mut, parse_labeled_value};

pub fn apply_line(job: &mut JobSnapshot, line: &str) {
    let stripped = line.trim();
    if stripped.is_empty() {
        return;
    }
    job.append_log(stripped);

    artifact_rules::apply_artifact_line(job, stripped);
    metric_rules::apply_metric_line(job, stripped);
    stage_rules::apply_stage_line(job, stripped);
}

#[cfg(test)]
mod tests;
