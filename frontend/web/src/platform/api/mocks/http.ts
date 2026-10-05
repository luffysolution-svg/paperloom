// Mock-only adapter for legacy/http.ts. Real fetch/XHR branches removed;
// callers that need the network use @retainpdf/api/http directly.
import { submitMockJob, submitMockUpload } from "@/platform/mock/index.js";

export async function submitJson(url: string, payload: unknown): Promise<any> {
  void payload;
  if (/\/jobs(?:$|\?)/.test(url)) {
    return submitMockJob();
  }
  if (/\/cancel(?:$|\?)/.test(url)) {
    return { ok: true };
  }
  return { ok: true };
}

export function submitUploadRequest(
  url: string,
  form: FormData,
  onProgress?: (loaded: number, total: number) => void,
): Promise<any> {
  void form;
  onProgress?.(1, 1);
  if (/\/ocr\/jobs(?:$|\?)/.test(url)) {
    return Promise.resolve(submitMockJob());
  }
  return Promise.resolve(submitMockUpload());
}
