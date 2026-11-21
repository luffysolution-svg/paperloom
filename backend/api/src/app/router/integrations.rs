use crate::app::AppState;
use crate::routes::{integrations, zotero};

crate::endpoints! {
    state: AppState;
    /// 读取 Obsidian 库与默认导出设置
    GET "/api/v1/integrations/obsidian" => integrations::get_obsidian_integration, admin;
    /// 保存 Obsidian 默认导出设置
    PUT "/api/v1/integrations/obsidian/settings" => integrations::put_obsidian_settings, admin;
    /// 导出任务笔记到 Obsidian 库
    POST "/api/v1/jobs/:job_id/obsidian/export" => integrations::export_job_to_obsidian, admin;
    /// 下载任务的 Obsidian Markdown 笔记包
    GET "/api/v1/jobs/:job_id/markdown/export" => integrations::download_markdown_export, signed;
    /// 批量导出文献到 Obsidian 库
    POST "/api/v1/integrations/obsidian/export-batch" => integrations::export_documents_to_obsidian, admin;
    /// 批量打包导出文献
    POST "/api/v1/documents/export-batch" => integrations::export_documents_route, admin;
    /// 下载批量导出的文献包
    GET "/api/v1/documents/export-batch/:name" => integrations::download_document_export_route, admin;
    /// 读取 Zotero 连接状态与文献库
    GET "/api/v1/integrations/zotero" => zotero::get_zotero_status, admin;
    /// 列出 Zotero 分类
    GET "/api/v1/integrations/zotero/collections" => zotero::list_zotero_collections, admin;
    /// 列出 Zotero 文献条目与附件
    GET "/api/v1/integrations/zotero/items" => zotero::list_zotero_items, admin;
    /// 从 Zotero 导入 PDF 附件到书库
    POST "/api/v1/integrations/zotero/import" => zotero::import_zotero_attachments, admin;
    /// 将任务译文 PDF 写回 Zotero 条目
    POST "/api/v1/jobs/:job_id/zotero/writeback" => zotero::write_translated_pdf_to_zotero, admin;
    /// 批量将文献译文 PDF 写回 Zotero 条目
    POST "/api/v1/integrations/zotero/writeback-batch" => zotero::write_documents_to_zotero, admin;
}
