use crate::models::api::InvocationSummaryView;

pub(super) fn load_invocation_summary_from_json(
    payload: &serde_json::Value,
) -> Option<InvocationSummaryView> {
    let summary: InvocationSummaryView =
        serde_json::from_value(payload.get("invocation")?.clone()).ok()?;
    if !summary.stage.is_empty()
        || !summary.input_protocol.is_empty()
        || !summary.stage_spec_schema_version.is_empty()
    {
        Some(summary)
    } else {
        None
    }
}
