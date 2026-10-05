use super::*;

const MAX_DOCUMENTS: usize = 200;

#[derive(Debug, Deserialize)]
pub(crate) struct ZoteroBatchWritebackRequest {
    pub document_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct ZoteroBatchWritebackItem {
    document_id: String,
    title: String,
    job_id: Option<String>,
    result: Option<zotero::writeback::ZoteroWritebackResult>,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct ZoteroBatchWritebackView {
    items: Vec<ZoteroBatchWritebackItem>,
    created: usize,
    updated: usize,
    failed: usize,
}

fn latest_translated_pdf_job_id(
    db: &Db,
    data_root: &Path,
    document_id: &str,
) -> Result<Option<String>, AppError> {
    db.get_document(document_id)
        .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
    let job_ids = db
        .job_ids_for_document(document_id)
        .map_err(|error| AppError::internal(error.to_string()))?;
    for job_id in job_ids.into_iter().rev() {
        let Ok(job) = db.get_job(&job_id) else {
            continue;
        };
        if job.status == JobStatusKind::Succeeded
            && job.workflow != WorkflowKind::Ocr
            && resolve_output_pdf(&job, data_root).is_some_and(|path| path.is_file())
        {
            return Ok(Some(job_id));
        }
    }
    Ok(None)
}

pub(crate) async fn write_documents_to_zotero_view(
    deps: &IntegrationApiDeps<'_>,
    request: &ZoteroBatchWritebackRequest,
) -> Result<ZoteroBatchWritebackView, AppError> {
    if request.document_ids.is_empty() || request.document_ids.len() > MAX_DOCUMENTS {
        return Err(AppError::bad_request("请选择 1–200 篇文献"));
    }
    let mut document_ids = Vec::new();
    for id in &request.document_ids {
        let id = id.trim();
        if id.is_empty() {
            return Err(AppError::bad_request("document id must not be empty"));
        }
        if !document_ids.iter().any(|existing| existing == id) {
            document_ids.push(id.to_string());
        }
    }
    let mut view = ZoteroBatchWritebackView {
        items: Vec::with_capacity(document_ids.len()),
        created: 0,
        updated: 0,
        failed: 0,
    };
    for document_id in document_ids {
        let title = deps
            .db
            .get_document(&document_id)
            .map(|doc| doc.title)
            .unwrap_or_default();
        let mut item = ZoteroBatchWritebackItem {
            document_id: document_id.clone(),
            title,
            job_id: None,
            result: None,
            message: None,
        };
        let outcome = match latest_translated_pdf_job_id(deps.db, deps.data_root, &document_id) {
            Ok(Some(job_id)) => {
                item.job_id = Some(job_id.clone());
                write_translated_pdf_to_zotero_view(deps, &job_id).await
            }
            Ok(None) => Err(AppError::conflict("没有可写回的已完成译文 PDF")),
            Err(error) => Err(error),
        };
        match outcome {
            Ok(result) => {
                if result.status == "created" {
                    view.created += 1;
                } else {
                    view.updated += 1;
                }
                item.result = Some(result);
            }
            Err(error) => {
                view.failed += 1;
                item.message = Some(error.to_string());
            }
        }
        view.items.push(item);
    }
    Ok(view)
}
