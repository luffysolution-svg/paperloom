
use crate::views::JobSubmissionView;
use retainpdf_core::models::domain::{JobSnapshot, JobStatusKind, WorkflowKind};

use crate::support::build_submission_view;
use crate::deps::{CommandJobsDeps, QueryJobsDeps};

#[derive(Clone)]
pub struct JobsFacade<'a> {
    pub(crate) command: CommandJobsDeps<'a>,
    pub(crate) query: QueryJobsDeps<'a>,
}

impl<'a> JobsFacade<'a> {
    pub(crate) fn new(command: CommandJobsDeps<'a>, query: QueryJobsDeps<'a>) -> Self {
        Self { command, query }
    }

    pub(crate) fn build_submission_view(
        &self,
        base_url: &str,
        job: &JobSnapshot,
        status: JobStatusKind,
        workflow: WorkflowKind,
    ) -> JobSubmissionView {
        build_submission_view(job, status, workflow, base_url)
    }
}

pub fn build_jobs_facade<'a>(
    command: CommandJobsDeps<'a>,
    query: QueryJobsDeps<'a>,
) -> JobsFacade<'a> {
    JobsFacade::new(command, query)
}
