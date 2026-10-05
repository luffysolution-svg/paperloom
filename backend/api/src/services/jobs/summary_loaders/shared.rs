use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::models::api::{
    GlossaryUsageSummaryView, InvocationSummaryView, NormalizationSummaryView,
};
use crate::models::domain::JobSnapshot;
use crate::storage_paths::{
    resolve_data_path, resolve_normalization_report, resolve_translation_manifest,
};

/// A request owns this cache. Successful parses and failed reads are both
/// memoized; no mutable job artifact state survives into the next request.
#[derive(Default)]
pub(crate) struct SummaryCache {
    values: HashMap<PathBuf, Option<Value>>,
    #[cfg(test)]
    read_attempts: usize,
}

impl SummaryCache {
    #[cfg(test)]
    pub(crate) fn read_attempts(&self) -> usize {
        self.read_attempts
    }

    fn read(&mut self, path: PathBuf) -> Option<&Value> {
        self.values
            .entry(path)
            .or_insert_with_key(|path| {
                #[cfg(test)]
                {
                    self.read_attempts += 1;
                }
                let text = std::fs::read_to_string(path).ok()?;
                serde_json::from_str(&text).ok()
            })
            .as_ref()
    }

    pub(crate) fn normalization(
        &mut self,
        job: &JobSnapshot,
        data_root: &Path,
    ) -> Option<NormalizationSummaryView> {
        let path = resolve_normalization_report(job, data_root)?;
        super::normalization::load_normalization_summary_from_json(self.read(path)?)
    }

    pub(crate) fn glossary(
        &mut self,
        job: &JobSnapshot,
        data_root: &Path,
    ) -> Option<GlossaryUsageSummaryView> {
        self.manifest_or_summary(
            job,
            data_root,
            super::glossary::load_glossary_summary_from_json,
        )
    }

    pub(crate) fn invocation(
        &mut self,
        job: &JobSnapshot,
        data_root: &Path,
    ) -> Option<InvocationSummaryView> {
        self.manifest_or_summary(
            job,
            data_root,
            super::invocation::load_invocation_summary_from_json,
        )
    }

    fn manifest_or_summary<T>(
        &mut self,
        job: &JobSnapshot,
        data_root: &Path,
        project: impl Fn(&Value) -> Option<T>,
    ) -> Option<T> {
        let manifest = resolve_translation_manifest(job, data_root);
        if let Some(value) = manifest.and_then(|path| self.read(path)).and_then(&project) {
            return Some(value);
        }
        // Each field independently falls back, but the fallback file is not
        // opened at all when the manifest already contains a usable value.
        let summary = job.artifacts.as_ref()?.summary.as_ref()?;
        project(self.read(resolve_data_path(data_root, summary).ok()?)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::domain::{CreateJobInput, JobArtifacts};
    use crate::storage_paths::TRANSLATION_MANIFEST_FILE_NAME;
    use serde_json::json;

    struct Fixture {
        root: PathBuf,
        job: JobSnapshot,
    }

    impl Fixture {
        fn new(manifest: Value, summary: Value) -> Self {
            let root =
                std::env::temp_dir().join(format!("retain-summary-cache-{}", fastrand::u64(..)));
            std::fs::create_dir_all(root.join("translated")).unwrap();
            std::fs::write(
                root.join("translated").join(TRANSLATION_MANIFEST_FILE_NAME),
                manifest.to_string(),
            )
            .unwrap();
            std::fs::write(root.join("summary.json"), summary.to_string()).unwrap();
            let mut job = JobSnapshot::new("summary-job".into(), CreateJobInput::default(), vec![]);
            job.artifacts = Some(JobArtifacts {
                translations_dir: Some("translated".into()),
                summary: Some("summary.json".into()),
                normalization_report_json: Some("summary.json".into()),
                ..Default::default()
            });
            Self { root, job }
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn complete_manifest_never_reads_fallback_for_summary_fields() {
        let fixture = Fixture::new(
            json!({"glossary": {"enabled": true}, "invocation": {"stage": "manifest"}}),
            json!({"invocation": {"stage": "fallback"}}),
        );
        let mut cache = SummaryCache::default();
        assert!(cache.glossary(&fixture.job, &fixture.root).unwrap().enabled);
        assert_eq!(
            cache.invocation(&fixture.job, &fixture.root).unwrap().stage,
            "manifest"
        );
        assert_eq!(cache.read_attempts, 1);
        assert!(!cache
            .values
            .contains_key(&fixture.root.join("summary.json")));
    }

    #[test]
    fn fields_fall_back_independently_and_shared_paths_parse_once() {
        let fixture = Fixture::new(
            json!({"glossary": {"enabled": true}, "invocation": {}}),
            json!({"glossary": {"enabled": false, "glossary_name": "fallback"}, "invocation": {"stage": "fallback"}, "normalization": {"validation": {"page_count": 12}}}),
        );
        let mut cache = SummaryCache::default();
        assert!(cache.glossary(&fixture.job, &fixture.root).unwrap().enabled);
        assert_eq!(
            cache.invocation(&fixture.job, &fixture.root).unwrap().stage,
            "fallback"
        );
        assert_eq!(
            cache
                .normalization(&fixture.job, &fixture.root)
                .unwrap()
                .page_count,
            Some(12)
        );
        // Two fields and multiple jobs referencing the same files share reads.
        let mut another_job = fixture.job.clone();
        another_job.job_id = "another-job".into();
        assert!(cache.glossary(&another_job, &fixture.root).is_some());
        assert!(cache.invocation(&another_job, &fixture.root).is_some());
        assert_eq!(cache.read_attempts, 2);
    }

    #[test]
    fn malformed_manifest_is_cached_and_next_request_observes_repairs() {
        let fixture = Fixture::new(
            json!({}),
            json!({"invocation": {"stage": "fallback"}, "glossary": {"entry_count": 2}}),
        );
        let manifest = fixture
            .root
            .join("translated")
            .join(TRANSLATION_MANIFEST_FILE_NAME);
        std::fs::write(&manifest, "{").unwrap();
        let mut cache = SummaryCache::default();
        assert_eq!(
            cache.invocation(&fixture.job, &fixture.root).unwrap().stage,
            "fallback"
        );
        std::fs::write(
            &manifest,
            json!({"invocation": {"stage": "repaired"}}).to_string(),
        )
        .unwrap();
        assert_eq!(
            cache
                .glossary(&fixture.job, &fixture.root)
                .unwrap()
                .entry_count,
            2
        );
        assert_eq!(
            cache.invocation(&fixture.job, &fixture.root).unwrap().stage,
            "fallback"
        );
        assert_eq!(cache.read_attempts, 2);
        assert_eq!(
            SummaryCache::default()
                .invocation(&fixture.job, &fixture.root)
                .unwrap()
                .stage,
            "repaired"
        );
    }

    #[test]
    fn missing_summary_is_not_reopened_for_each_field() {
        let fixture = Fixture::new(json!({}), json!({}));
        std::fs::remove_file(fixture.root.join("summary.json")).unwrap();
        let mut cache = SummaryCache::default();
        assert!(cache.glossary(&fixture.job, &fixture.root).is_none());
        assert!(cache.invocation(&fixture.job, &fixture.root).is_none());
        assert!(cache.normalization(&fixture.job, &fixture.root).is_none());
        assert_eq!(cache.read_attempts, 2);
    }
}
