use crate::db::PipelineDispatchRecord;
use crate::models::api::{
    OcrAmbiguityReceiptFieldView, OcrAmbiguityResolutionKind, OcrAmbiguityView,
};

pub(crate) fn build_ocr_ambiguity_view(
    dispatch: &PipelineDispatchRecord,
) -> Option<OcrAmbiguityView> {
    if dispatch.stage_key != "ocr" || dispatch.status != "ambiguous" {
        return None;
    }
    let receipt_fields = receipt_field_contract(&dispatch.provider, &dispatch.operation)?;
    Some(OcrAmbiguityView {
        status: "ambiguous".to_string(),
        provider: dispatch.provider.clone(),
        operation: dispatch.operation.clone(),
        resolution_revision: dispatch.generation,
        allowed_resolutions: vec![
            OcrAmbiguityResolutionKind::BindExistingReceipt,
            OcrAmbiguityResolutionKind::AcceptDuplicateRisk,
        ],
        receipt_fields,
    })
}

fn receipt_field_contract(
    provider: &str,
    operation: &str,
) -> Option<Vec<OcrAmbiguityReceiptFieldView>> {
    let mut fields = match (provider, operation) {
        ("mineru", "apply_upload_url") => vec![
            receipt_field("batch_id", "Batch ID", true, false),
            receipt_field("upload_url", "Upload URL", true, true),
        ],
        ("mineru", "create_extract_task")
        | ("paddle", "submit_local_file" | "submit_remote_url") => {
            vec![receipt_field("task_id", "Task ID", true, false)]
        }
        _ => return None,
    };
    fields.push(receipt_field("trace_id", "Trace ID", false, false));
    Some(fields)
}

fn receipt_field(
    name: &str,
    label: &str,
    required: bool,
    secret: bool,
) -> OcrAmbiguityReceiptFieldView {
    OcrAmbiguityReceiptFieldView {
        name: name.to_string(),
        label: label.to_string(),
        required,
        secret,
    }
}
