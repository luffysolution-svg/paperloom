/** Reader-owned contracts for durable document operations. */

export type ReaderAgentOperationStatus =
  | "draft"
  | "awaiting_confirmation"
  | "queued"
  | "running"
  | "validating"
  | "result_ready"
  | "committed"
  | "failed"
  | "cancelled"
  | "ambiguous"
  | (string & {});

export type ReaderAgentOperationAction = "run" | "cancel" | "commit" | "retry" | (string & {});

export type ReaderAgentOperationEvent = {
  seq: number;
  attempt: number;
  ts: string;
  event: string;
  status: ReaderAgentOperationStatus;
  summary?: string;
  payload?: Record<string, unknown>;
};

export type ReaderAgentOperationCandidate = {
  version_id: string;
  status: string;
  content_sha256: string;
  url: string;
};

export type ReaderAgentOperationPlanStep = {
  op: "select_pages" | "rotate_pages" | (string & {});
  pages: number[];
  degrees?: number;
};

export type ReaderAgentOperation = {
  schema: string;
  operation_id: string;
  conversation_id?: string | null;
  request_message_id: string;
  document_id: string;
  intent_summary: string;
  plan_steps: ReaderAgentOperationPlanStep[];
  affected_pages: number[];
  status: ReaderAgentOperationStatus;
  current_attempt: number;
  program_sha256: string;
  candidate_available: boolean;
  candidate: ReaderAgentOperationCandidate | null;
  latest_event_seq: number;
  allowed_actions: ReaderAgentOperationAction[];
  events: ReaderAgentOperationEvent[];
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type ReaderAgentOperationList = {
  operations: ReaderAgentOperation[];
};

export type ReaderAgentOperationActionInput = {
  idempotency_key: string;
  expected_status: ReaderAgentOperationStatus;
  expected_attempt: number;
  expected_program_sha256: string;
};

export type ReaderAgentOperationRequestOptions = {
  signal?: AbortSignal | null;
};

export type ReaderAgentRuntimeConfig = {
  agent_confirmation_mode: "explicit" | "green_light";
  active_runtime?: string;
  configured_revision?: number;
  active_revision?: number;
  restart_state?: string;
  restart_required?: boolean;
  llm_api_key_configured?: boolean;
};

export type ReaderAgentOperationPort = {
  list: (
    conversationId: string,
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperationList>;
  get: (
    operationId: string,
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperation>;
  run: (
    operationId: string,
    input: ReaderAgentOperationActionInput,
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperation>;
  cancel: (
    operationId: string,
    input: ReaderAgentOperationActionInput & { reason?: string },
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperation>;
  commit: (
    operationId: string,
    input: ReaderAgentOperationActionInput,
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperation>;
  retry: (
    operationId: string,
    input: ReaderAgentOperationActionInput & { accept_duplicate_risk?: boolean },
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentOperation>;
  fetchCandidate: (
    operationId: string,
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<Blob>;
  fetchRuntimeConfig: (
    options?: ReaderAgentOperationRequestOptions,
  ) => Promise<ReaderAgentRuntimeConfig>;
};

export function readerOperationErrorStatus(error: unknown): number {
  return Number((error as { status?: unknown })?.status) || 0;
}

export function readerOperationErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : "操作请求失败，请重试。";
}
