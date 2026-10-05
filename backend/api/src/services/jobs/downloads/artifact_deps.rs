use crate::services::derived_artifacts::DerivedArtifactDeps;

use super::DownloadJobsDeps;

pub(super) fn derived_artifact_deps<'a>(deps: &'a DownloadJobsDeps<'a>) -> DerivedArtifactDeps<'a> {
    DerivedArtifactDeps::with_pipeline_command(deps.python_bin, deps.pipeline_command)
}
