use retainpdf_core::config::{JobRunnerConfig, JobSnapshotRuntimeConfig};
use retainpdf_data::db::Db;
use crate::lifecycle::launcher::JobLaunchDeps;
use crate::runtime_gateway::{JobRuntime, RuntimeControl};
use std::path::Path;

#[derive(Clone)]
pub struct SnapshotBuildDeps<'a> {
    pub(crate) db: &'a Db,
    pub(crate) config: JobSnapshotRuntimeConfig<'a>,
}

impl<'a> SnapshotBuildDeps<'a> {
    pub fn new(db: &'a Db, config: JobSnapshotRuntimeConfig<'a>) -> Self {
        Self { db, config }
    }
}

#[derive(Clone)]
pub struct JobSubmitDeps<'a> {
    pub(crate) snapshot: SnapshotBuildDeps<'a>,
    pub launcher: JobLaunchDeps<'a>,
}

impl<'a> JobSubmitDeps<'a> {
    pub fn new(snapshot: SnapshotBuildDeps<'a>, launcher: JobLaunchDeps<'a>) -> Self {
        Self { snapshot, launcher }
    }
}

#[derive(Clone)]
pub struct ControlDeps<'a> {
    pub(crate) db: &'a Db,
    pub(crate) job_runner: &'a JobRunnerConfig,
    pub(crate) data_root: &'a Path,
    pub(crate) output_root: &'a Path,
    pub(crate) runtime: RuntimeControl<'a>,
}

impl<'a> ControlDeps<'a> {
    pub fn new(
        db: &'a Db,
        job_runner: &'a JobRunnerConfig,
        data_root: &'a Path,
        output_root: &'a Path,
        job_runtime: &'a JobRuntime,
    ) -> Self {
        Self {
            db,
            job_runner,
            data_root,
            output_root,
            runtime: RuntimeControl::new(job_runtime),
        }
    }
}

#[derive(Clone)]
pub struct CommandJobsDeps<'a> {
    pub(crate) db: &'a Db,
    pub(crate) submit: JobSubmitDeps<'a>,
    pub(crate) control: ControlDeps<'a>,
}

impl<'a> CommandJobsDeps<'a> {
    pub fn new(db: &'a Db, submit: JobSubmitDeps<'a>, control: ControlDeps<'a>) -> Self {
        Self {
            db,
            submit,
            control,
        }
    }
}
