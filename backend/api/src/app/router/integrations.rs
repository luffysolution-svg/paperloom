use axum::routing::{get, post, put};
use axum::Router;

use crate::app::AppState;
use crate::routes::{integrations, zotero};

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v1/integrations/obsidian",
            get(integrations::get_obsidian_integration),
        )
        .route(
            "/api/v1/integrations/obsidian/settings",
            put(integrations::put_obsidian_settings),
        )
        .route(
            "/api/v1/jobs/:job_id/obsidian/export",
            post(integrations::export_job_to_obsidian),
        )
        .route(
            "/api/v1/integrations/obsidian/export-batch",
            post(integrations::export_documents_to_obsidian),
        )
        .route(
            "/api/v1/integrations/zotero",
            get(zotero::get_zotero_status),
        )
        .route(
            "/api/v1/integrations/zotero/collections",
            get(zotero::list_zotero_collections),
        )
        .route(
            "/api/v1/integrations/zotero/items",
            get(zotero::list_zotero_items),
        )
        .route(
            "/api/v1/integrations/zotero/import",
            post(zotero::import_zotero_attachments),
        )
        .route(
            "/api/v1/jobs/:job_id/zotero/writeback",
            post(zotero::write_translated_pdf_to_zotero),
        )
        .route(
            "/api/v1/integrations/zotero/writeback-batch",
            post(zotero::write_documents_to_zotero),
        )
}
