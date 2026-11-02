import { API_PREFIX } from "@/platform/config/api-constants.js";
import { isMockMode } from "@/platform/config/runtime.js";
import { buildApiEndpoint, fetchProtected } from "./http.js";

export type BackupItem = {
  id: string;
  name: string;
  created_at: string;
  bytes: number;
  file_count: number;
  includes_credentials: boolean;
};
export type WebDavSettings = { url: string; username: string; password_configured: boolean };
export type WebDavInput = { url: string; username: string; password?: string };
export type RemoteBackup = { name: string; bytes: number; modified_at: string };
export type BackupStatus = {
  items: BackupItem[];
  pending_restore: boolean;
  last_restore: { restored_at: string; previous_data_dir: string } | null;
  restore_supported: boolean;
  restore_hint: string | null;
  active_tasks: number;
  data_root: string;
  webdav: WebDavSettings;
};

async function request<T>(path = "", options: RequestInit = {}): Promise<T> {
  if (isMockMode()) throw new Error("演示模式不能备份或恢复数据，请连接本地服务。");
  const response = await fetchProtected(buildApiEndpoint(API_PREFIX, `backups${path}`), options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || `备份操作失败（HTTP ${response.status}）`);
  return body.data as T;
}

function json(method: string, payload: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
}

async function download(name: string): Promise<void> {
  if (isMockMode()) throw new Error("演示模式不能下载备份。");
  const picker = (window as Window & {
    showSaveFilePicker?: (options: unknown) => Promise<{ createWritable(): Promise<WritableStream<Uint8Array>> }>;
  }).showSaveFilePicker;
  // Ask for a destination while still in the user's click gesture, then stream to disk.
  const destination = picker ? await picker.call(window, { suggestedName: name, types: [{ description: "PaperLoom 迁移包", accept: { "application/zip": [".zip"] } }] }) : null;
  const response = await fetchProtected(buildApiEndpoint(API_PREFIX, `backups/download/${encodeURIComponent(name)}`));
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "下载备份失败，请重试。");
  }
  if (destination && response.body) {
    await response.body.pipeTo(await destination.createWritable());
    return;
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupApi = {
  status: () => request<BackupStatus>(),
  create: (includeCredentials: boolean) => request<BackupItem>("", json("POST", { include_credentials: includeCredentials })),
  download,
  import: (file: File) => request("/import", { method: "POST", headers: { "Content-Type": "application/zip", "X-Confirm-Replace": "true" }, body: file }),
  restore: (name: string, remote: boolean) => request(remote ? "/webdav/restore" : "/restore", json("POST", { name, confirm_replace: true })),
  cancel: () => request("/pending", { method: "DELETE" }),
  saveSettings: (settings: WebDavInput) => request<WebDavSettings>("/webdav/settings", json("PUT", settings)),
  test: (settings: WebDavInput) => request("/webdav/test", json("POST", settings)),
  listRemote: () => request<RemoteBackup[]>("/webdav/files"),
  backupRemote: (includeCredentials: boolean) => request<BackupItem>("/webdav/backup", json("POST", { include_credentials: includeCredentials })),
};

export type BackupClient = typeof backupApi;
