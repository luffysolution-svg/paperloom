use super::{note, AppError, DownloadJobsDeps, ExternalRefRecord};
use crate::models::api::DocumentRecord;
use regex::Regex;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::LazyLock;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct RelatedPdf {
    pub filename: String,
    pub path: PathBuf,
    pub supplement: bool,
    pub pages: std::collections::BTreeMap<String, usize>,
}

pub(crate) fn is_supplement(label: &str) -> bool {
    static SI: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?ix) \b(?:supplement(?:al|ary)?|supporting)[\s_.-]+(?:information|material[s]?|data|file[s]?|appendix|methods)\b | \badditional[ _-]*file | 补充材料|支持信息 | (?:^|[^a-z0-9])(?:mmc\d+|suppl|supplementary|supplemental)(?:\.pdf)?$ | (?-i:(?:^|[\s_.-])(?:SI|ESI|si|esi)(?:[\s_.-]|$)) ").unwrap()
    });
    SI.is_match(label)
}

pub(crate) fn attachment_name(key: &str, supplement: bool) -> String {
    format!(
        "{}-{}.pdf",
        if supplement { "SI" } else { "Main" },
        note::sanitize_file_name(key)
    )
}

pub(super) fn related_pdfs(
    deps: &DownloadJobsDeps<'_>,
    doc: &DocumentRecord,
    current: &ExternalRefRecord,
    extras: Option<&super::ZoteroExtras>,
) -> Result<Vec<RelatedPdf>, AppError> {
    let data: Value = serde_json::from_str(&current.metadata_json).unwrap_or_default();
    let current_si = data["supplement"].as_bool().unwrap_or_else(|| {
        is_supplement(&doc.source_filename)
            || data["attachment_title"].as_str().is_some_and(is_supplement)
            || extras.is_some_and(|e| {
                e.pdfs
                    .iter()
                    .any(|(k, l, _)| k == &current.attachment_key && is_supplement(l))
            })
    });
    let mut roles = std::collections::HashMap::new();
    let mut files = Vec::new();
    for other in deps.db.sibling_external_refs(current)? {
        let Some(upload) = deps.db.find_upload_for_document(&other.document_id)? else {
            continue;
        };
        let snapshot: Value = serde_json::from_str(&other.metadata_json).unwrap_or_default();
        let si = snapshot["supplement"].as_bool().unwrap_or_else(|| {
            is_supplement(&upload.filename)
                || snapshot["attachment_title"]
                    .as_str()
                    .is_some_and(is_supplement)
        });
        roles.insert(other.attachment_key.clone(), si);
        if si == current_si {
            continue;
        }
        let path = PathBuf::from(upload.stored_path);
        if path.is_file() {
            let mut pages = std::collections::BTreeMap::new();
            if si {
                for id in deps
                    .db
                    .job_ids_for_document(&other.document_id)?
                    .into_iter()
                    .rev()
                {
                    let Ok(job) = deps.db.get_job(&id) else {
                        continue;
                    };
                    let Some(doc) = crate::services::jobs::stored_path(
                        &job,
                        deps.data_root,
                        crate::services::jobs::StoredFile::NormalizedDocument,
                    )
                    .and_then(|p| std::fs::read(p).ok())
                    .and_then(|v| serde_json::from_slice::<Value>(&v).ok()) else {
                        continue;
                    };
                    for (index, pg) in doc["pages"].as_array().into_iter().flatten().enumerate() {
                        for block in pg["blocks"].as_array().into_iter().flatten() {
                            if block["layout_role"] == "caption" {
                                if let Some(key)=block.pointer("/content/text").and_then(Value::as_str).and_then(retainpdf_jobs::paper_markdown::references::supplement_caption) {
                                    pages.entry(key).or_insert(pg["page_index"].as_u64().map_or(index+1,|n|n as usize+1));
                                }
                            }
                        }
                    }
                    break;
                }
            }
            files.push(RelatedPdf {
                filename: attachment_name(&other.attachment_key, si),
                path,
                supplement: si,
                pages,
            });
        }
    }
    for (key, title, path) in extras.into_iter().flat_map(|e| &e.pdfs) {
        if key == &current.attachment_key || title.contains("PaperLoom") {
            continue;
        }
        let si = roles.get(key).copied().unwrap_or_else(|| {
            is_supplement(title)
                || path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(is_supplement)
        });
        let filename = attachment_name(key, si);
        if si != current_si && !files.iter().any(|f| f.filename == filename) {
            files.push(RelatedPdf {
                filename,
                path: path.clone(),
                supplement: si,
                pages: Default::default(),
            });
        }
    }
    files.sort_by(|a, b| a.filename.cmp(&b.filename));
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn supplement_labels_distinguish_silicon_and_supporting_information() {
        for label in [
            "Supporting Information",
            "paper-SI.pdf",
            "ESI.pdf",
            "mmc1.pdf",
            "补充材料",
        ] {
            assert!(is_supplement(label), "{label}");
        }
        assert!(!is_supplement("Nanoporous Si cathodes.pdf"));
    }
}
