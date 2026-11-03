import { API_PREFIX } from "@/platform/config/api-constants.js";
import { isMockMode } from "@/platform/config/runtime.js";
import { buildApiEndpoint, fetchProtected } from "./http.js";

export type BatchExportFormat = "translated" | "comparison" | "source" | "markdown" | "obsidian";
export type BatchExportResult = {
  name: string | null;
  exported: number;
  failed: number;
  items: { document_id: string; title: string; folder: string | null; message: string | null }[];
};
type Destination = { createWritable(): Promise<WritableStream<Uint8Array>> } | null;

async function checked(response: Response) {
  if (response.ok) return response;
  const body = await response.json().catch(() => null);
  throw new Error(body?.message || `批量导出失败（HTTP ${response.status}）`);
}

export const batchExportApi = {
  async export(documentIds: string[], format: BatchExportFormat, includeSource: boolean): Promise<BatchExportResult> {
    if (isMockMode()) throw new Error("演示模式不能导出文献，请连接本地服务。");
    const response = await checked(await fetchProtected(buildApiEndpoint(API_PREFIX, "documents/export-batch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds, format, include_source: includeSource }),
    }));
    return (await response.json()).data;
  },
  async pickDestination(): Promise<Destination> {
    const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<NonNullable<Destination>> }).showSaveFilePicker;
    return picker ? picker.call(window, {
      suggestedName: "paperloom-export.zip",
      types: [{ description: "文献导出包", accept: { "application/zip": [".zip"] } }],
    }) : null;
  },
  async download(name: string, destination: Destination, onProgress: (loaded: number, total: number | null) => void): Promise<void> {
    const response = await checked(await fetchProtected(buildApiEndpoint(API_PREFIX, `documents/export-batch/${encodeURIComponent(name)}`)));
    let loaded = 0;
    const total = Number(response.headers.get("Content-Length")) || null;
    const stream = response.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        onProgress(loaded, total);
        controller.enqueue(chunk);
      },
    }));
    if (destination && stream) {
      await stream.pipeTo(await destination.createWritable());
      return;
    }
    const blob = await (stream ? new Response(stream).blob() : response.blob());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
