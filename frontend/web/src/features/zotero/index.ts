// zotero —— 从 Zotero 选择文献导入书库并提交翻译（桌面端，读 Zotero 本地 API）。
//
// 这是本功能对外的唯一出口。
// ui/     ZoteroImportDialog 选择对话框
// domain/ 分组导入 / 逐篇提交翻译的流程

export { ZoteroImportDialog } from "./ui/ZoteroImportDialog.jsx";
export {
  orderCollections,
  runZoteroImport,
  selectionKey,
} from "./domain/import-flow.js";
export type { ZoteroImportSummary, ZoteroSelection } from "./domain/import-flow.js";
