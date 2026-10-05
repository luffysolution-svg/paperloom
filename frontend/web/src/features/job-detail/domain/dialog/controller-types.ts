// createStatusDetailController 的对外类型契约与各装配模块共享的内部类型。
// 全部由 status-detail-controller.ts 重新导出，保持原 import 路径与导出名不变。

import type { StatusDetailRuntimePort } from "../status-detail-runtime-port.js";
import type { StatusDetailStore, StatusDetailTranslation } from "../status-detail-store.js";
import type { StatusDetailDialogStore } from "../status-detail-dialog-store.js";
import { resolveJobActions } from "@retainpdf/domain/job";
import type {
  JobLike,
  JobPayload,
} from "@retainpdf/domain/job";
import type {
  EventsPayload,
} from "@retainpdf/domain/job-status";
import type {
  OcrAmbiguityResolutionKind,
  OcrAmbiguityResolutionRequest,
} from "@/platform/api/index.js";

export type JobActionResolver = typeof resolveJobActions;

export interface StatusDetailResumeViewPort {
  closeDialog: () => void;
  setRerunAction: (options?: { enabled?: boolean; status?: string }) => void;
  setRerunDisabled: (disabled: boolean) => void;
}

export interface StatusDetailOverviewRenderContext {
  job?: JobLike | JobPayload | null;
  events?: EventsPayload | null;
  jobId?: string;
  [key: string]: unknown;
}

export interface StatusDetailControllerDeps {
  runtimePort: StatusDetailRuntimePort;
  apiPrefix?: string;
  fetchJobPayload?: (jobId: string, options?: { apiPrefix?: string } | string) => Promise<unknown>;
  fetchJobEvents?: (
    jobId: string,
    apiPrefix?: string,
    query?: import("@retainpdf/api/jobs-events").JobEventsQuery,
  ) => Promise<unknown>;
  fetchJobDiagnostics?: (jobId: string, apiPrefix?: string) => Promise<unknown>;
  fetchResumePlan?: (jobId: string, apiPrefix?: string) => Promise<unknown>;
  fetchJobStageActions?: (jobId: string, apiPrefix?: string) => Promise<unknown>;
  fetchTranslationDiagnostics: (jobId: string, apiPrefix?: string) => Promise<unknown>;
  fetchTranslationItems: (
    jobId: string,
    apiPrefix?: string,
    query?: StatusDetailTranslation["query"] | Record<string, unknown>,
  ) => Promise<unknown>;
  fetchTranslationItem: (jobId: string, itemId: string, apiPrefix?: string) => Promise<unknown>;
  replayTranslationItem: (jobId: string, itemId: string, apiPrefix?: string) => Promise<unknown>;
  resolveOcrAmbiguity: (
    jobId: string,
    apiPrefix: string | undefined,
    request: OcrAmbiguityResolutionRequest,
  ) => Promise<unknown>;
  rerunJob: (actionUrl: string) => Promise<unknown>;
  retryJobStage?: (
    jobId: string,
    apiPrefix: string | undefined,
    stage: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  copyText?: (value: string) => Promise<unknown>;
  renderJob?: (context?: StatusDetailOverviewRenderContext | null) => void;
  startPolling?: (jobId: string) => void;
  setText?: (id: string, message: string) => void;
  store: StatusDetailStore;
  dialogStore: StatusDetailDialogStore;
  jobActionResolver?: JobActionResolver;
}
