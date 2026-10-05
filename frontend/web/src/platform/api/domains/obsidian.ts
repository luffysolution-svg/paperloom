// Obsidian 联动：库发现、默认设置、写入库。
// 直接用 web 层 http 封装，不经 @retainpdf/api（那边 dist 随仓库提交，改动成本高）。
import { isMockMode } from "@/platform/config/runtime.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { buildApiEndpoint, fetchProtected } from "./http.js";

export type ObsidianVault = {
  id: string;
  name: string;
  path: string;
  source: "obsidian" | "mounted";
  available: boolean;
};

export type ObsidianSettings = {
  default_vault_id: string | null;
  folder: string;
  include_source: boolean;
  folder_by_collection: boolean;
};

export type ObsidianIntegration = {
  vaults: ObsidianVault[];
  settings: ObsidianSettings;
  obsidian_config_path: string | null;
  mounted_vaults_dir: string | null;
};

export type ObsidianConflictPolicy = "ask" | "rename" | "overwrite" | "skip";

export type ObsidianExportResult = {
  status: "created" | "updated" | "conflict" | "skipped";
  vault_id: string;
  vault_name: string;
  note_path: string;
  source_note_path: string | null;
  files_written: number;
  assets_removed: number;
  obsidian_uri: string | null;
};

export type ObsidianBatchExportItem = {
  document_id: string;
  job_id: string | null;
  result: ObsidianExportResult | null;
  message: string | null;
};

export type ObsidianBatchExportResult = {
  items: ObsidianBatchExportItem[];
  written: number;
  conflicts: number;
  skipped: number;
  failed: number;
};

async function readEnvelope<T>(resp: Response, fallback: string): Promise<T> {
  const envelope: any = await resp.json().catch(() => null);
  if (!resp.ok)
    throw new Error(`${envelope?.message || fallback}(${resp.status})`);
  return (envelope?.data ?? envelope) as T;
}

export async function getObsidianIntegration(): Promise<ObsidianIntegration> {
  if (isMockMode()) {
    return {
      vaults: [],
      settings: {
        default_vault_id: null,
        folder: "PaperLoom",
        include_source: true,
        folder_by_collection: false,
      },
      obsidian_config_path: null,
      mounted_vaults_dir: null,
    };
  }
  const resp = await fetchProtected(
    buildApiEndpoint(API_PREFIX, "integrations/obsidian"),
  );
  return readEnvelope(resp, "读取 Obsidian 库失败，请稍后重试。");
}

export async function exportJobToObsidian(
  jobId: string,
  payload: {
    vault_id: string;
    folder: string;
    include_source: boolean;
    folder_by_collection?: boolean;
    on_conflict?: ObsidianConflictPolicy;
  },
): Promise<ObsidianExportResult> {
  if (isMockMode()) throw new Error("演示模式不支持写入 Obsidian 库。");
  const resp = await fetchProtected(
    buildApiEndpoint(
      API_PREFIX,
      `jobs/${encodeURIComponent(jobId)}/obsidian/export`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return readEnvelope(resp, "写入 Obsidian 库失败，请稍后重试。");
}

export async function exportDocumentsToObsidian(
  documentIds: string[],
  payload: {
    vault_id: string;
    folder: string;
    include_source: boolean;
    folder_by_collection?: boolean;
    on_conflict?: ObsidianConflictPolicy;
  },
): Promise<ObsidianBatchExportResult> {
  if (isMockMode()) throw new Error("演示模式不支持写入 Obsidian 库。");
  const resp = await fetchProtected(
    buildApiEndpoint(API_PREFIX, "integrations/obsidian/export-batch"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds, ...payload }),
    },
  );
  return readEnvelope(resp, "批量写入 Obsidian 库失败，请稍后重试。");
}
