// upload 流程的端口/契约类型。
//
// 从 controller.ts 抽出，供 page-range / session / execution 等聚焦模块共享，
// 避免它们反向引用装配根 controller。controller.ts 原样再导出这些名字。

import type { UploadStatePort } from "./state.js";

export interface ConstrainPageRangesOptions {
  source?: string;
}

export interface UploadViewPort {
  clearPageRanges: () => void;
  markUploadReady: (ready: boolean) => void;
  readPageRanges: () => { start: string; end: string };
  writePageRanges: (ranges: { start?: string; end?: string }) => void;
  setInlinePageRangeVisible: (visible: boolean) => void;
  openTranslationOptions: (options: { applied?: string; maxPage?: number }) => void;
  closeTranslationOptions: () => void;
  selectedFile: () => File | null;
  setFileLabel: (file: File | null, defaultFileLabel: string) => void;
  showUploadStatus: (message: string) => void;
}

export interface UploadConfigPortLike {
  buildUploadUrl: (apiPrefix?: string) => string;
}

export interface UploadResponsePayload {
  page_count?: number;
  upload_id?: string;
  /** documents.document_id（= sha256 内容哈希）；后端上传响应返回。 */
  document_id?: string;
  filename?: string;
  bytes?: number;
  [key: string]: unknown;
}

export interface MountUploadFeatureOptions {
  state?: unknown;
  uploadStatePort?: Partial<UploadStatePort> | UploadStatePort | null;
  apiBase?: string;
  apiPrefix?: string;
  frontMaxBytes: number;
  frontMaxPageCount: number;
  countPdfPages?: (file: File) => Promise<number> | number;
  defaultFileLabel: string;
  collectUploadFormData: (file: File) => FormData | unknown;
  submitUploadRequest: (
    url: string,
    formData: unknown,
    setProgress?: (loaded: number, total: number) => void,
  ) => Promise<UploadResponsePayload>;
  resetUploadedFile?: () => void;
  resetUploadProgress?: () => void;
  setUploadProgress?: (loaded: number, total: number) => void;
  clearFileInputValue?: () => void;
  setText: (id: string, value?: unknown) => void;
  applyWorkflowMode: () => void;
  refreshSubmitControls: () => void;
  refreshDeepSeekBalance?: ((options?: {
    silent?: boolean;
  }) => Promise<{ status?: string } | unknown>) | null;
  workflowNeedsUpload: (workflow?: string) => boolean;
  configPort?: UploadConfigPortLike;
  viewPort: UploadViewPort;
}
