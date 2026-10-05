use crate::models::api::GlossaryUsageSummaryView;

pub(super) fn load_glossary_summary_from_json(
    payload: &serde_json::Value,
) -> Option<GlossaryUsageSummaryView> {
    let summary: GlossaryUsageSummaryView =
        serde_json::from_value(payload.get("glossary")?.clone()).ok()?;
    if summary.enabled
        || summary.entry_count > 0
        || !summary.glossary_id.is_empty()
        || !summary.glossary_name.is_empty()
    {
        Some(summary)
    } else {
        None
    }
}
