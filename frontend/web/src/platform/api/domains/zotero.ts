// Zotero 联动（桌面端本地 API / Docker 数据目录）：状态、分类、条目浏览，以及把选中的 PDF 导入书库。
import { isMockMode } from "@/platform/config/runtime.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { buildApiEndpoint, fetchProtected } from "./http.js";

export type ZoteroLibrary = { id: string; name: string; kind: "user" | "group" };

export type ZoteroStatus = {
  reachable: boolean;
  version: string | null;
  supported: boolean;
  api_base: string;
  libraries: ZoteroLibrary[];
  message: string | null;
  mode: "local_api" | "data_dir";
  /** 可用但需提醒，如读的是 Zotero 自动备份、数据可能滞后。 */
  notice: string | null;
};

export type ZoteroCollection = { key: string; name: string; parent_key: string | null };

export type ZoteroAttachment = {
  key: string;
  title: string;
  available: boolean;
  size: number | null;
  document_id: string | null;
};

export type ZoteroItem = {
  key: string;
  title: string;
  creators: string;
  year: string | null;
  item_type: string;
  attachments: ZoteroAttachment[];
};

export type ZoteroItemPage = { items: ZoteroItem[]; total: number };

export type ZoteroImportResult = {
  item_key: string;
  attachment_key: string;
  status: "imported" | "existing" | "failed";
  document_id: string | null;
  title: string;
  translation_job_id: string | null;
  message: string | null;
};

async function readEnvelope<T>(resp: Response, fallback: string): Promise<T> {
  const envelope: any = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`${envelope?.message || fallback}(${resp.status})`);
  return (envelope?.data ?? envelope) as T;
}

function endpoint(path: string, params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, `${value}`);
  }
  const qs = query.toString();
  return `${buildApiEndpoint(API_PREFIX, `integrations/zotero${path}`)}${qs ? `?${qs}` : ""}`;
}

export async function getZoteroStatus(): Promise<ZoteroStatus> {
  if (isMockMode()) {
    return {
      reachable: false,
      version: null,
      supported: false,
      api_base: "",
      libraries: [],
      message: "演示模式不连接 Zotero。",
      mode: "local_api",
      notice: null,
    };
  }
  return readEnvelope(await fetchProtected(endpoint("")), "读取 Zotero 状态失败。");
}

export async function listZoteroCollections(libraryId: string): Promise<ZoteroCollection[]> {
  return readEnvelope(
    await fetchProtected(endpoint("/collections", { library_id: libraryId })),
    "读取 Zotero 分类失败。",
  );
}

export async function listZoteroItems(params: {
  library_id: string;
  collection_key?: string;
  q?: string;
  start?: number;
  limit?: number;
}): Promise<ZoteroItemPage> {
  return readEnvelope(await fetchProtected(endpoint("/items", params)), "读取 Zotero 文献失败。");
}

export type ZoteroWritebackResult = {
  status: "created" | "updated";
  attachment_key: string;
  filename: string;
  zotero_uri: string;
};

export async function writeTranslatedPdfToZotero(jobId: string): Promise<ZoteroWritebackResult> {
  if (isMockMode()) throw new Error("演示模式不支持写入 Zotero。");
  const resp = await fetchProtected(
    buildApiEndpoint(API_PREFIX, `jobs/${encodeURIComponent(jobId)}/zotero/writeback`),
    { method: "POST" },
  );
  return readEnvelope(resp, "写回 Zotero 失败。");
}

export type ZoteroBatchWritebackResult = {
  created: number;
  updated: number;
  failed: number;
  items: Array<{
    document_id: string;
    title: string;
    job_id: string | null;
    result: ZoteroWritebackResult | null;
    message: string | null;
  }>;
};

export async function writeDocumentsToZotero(documentIds: string[]): Promise<ZoteroBatchWritebackResult> {
  if (isMockMode()) throw new Error("演示模式不支持写入 Zotero。");
  return readEnvelope(await fetchProtected(endpoint("/writeback-batch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_ids: documentIds }),
  }), "批量写回 Zotero 失败。");
}

export async function importZoteroAttachments(payload: {
  library_id: string;
  collection_key?: string;
  attachments: Array<{ item_key: string; attachment_key: string }>;
}): Promise<ZoteroImportResult[]> {
  const resp = await fetchProtected(endpoint("/import"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readEnvelope(resp, "导入 Zotero 文献失败。");
}
