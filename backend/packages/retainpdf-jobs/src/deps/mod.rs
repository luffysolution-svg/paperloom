//! Narrow dependencies assembled by app/jobs, independent of job creation implementation.

mod command;
mod query;
mod replay;

pub use command::{
    CommandJobsDeps, ControlDeps, JobSubmitDeps, SnapshotBuildDeps,
};
pub use query::QueryJobsDeps;
pub use replay::ReplayDeps;
