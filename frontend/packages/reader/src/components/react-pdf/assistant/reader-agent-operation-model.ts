// Reader PDF agent-operation model facade. The decision logic lives in
// `@retainpdf/api/agent-operation-model` so the Reader and web surfaces share a
// single implementation. Export names, storage-key prefix, and the strict
// stale-snapshot ordering (`>` on equal timestamps) are preserved.

import {
  AGENT_OPERATION_ACTIVE_STATUSES,
  AGENT_OPERATION_GREEN_LIGHT_TRANSITION_STATUSES,
  agentOperationErrorMessage,
  agentOperationErrorStatus,
  agentOperationEventSeq,
  agentOperationShouldPoll,
  agentOperationShouldReplace,
  makeAgentOperationActionKey,
} from "@retainpdf/api/agent-operation-model";
import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";

export type ReaderAgentOperationSignal = {
  operationId: string;
  conversationId?: string;
  confirmationMode?: ReaderAgentRuntimeConfig["agent_confirmation_mode"];
  nonce: number;
};

export type ReaderAgentOperationEntry = {
  operation: ReaderAgentOperation;
  pendingAction?: "run" | "cancel" | "commit" | "retry";
  error?: string;
};

export type ReaderAgentOperationPerformOptions = {
  acceptDuplicateRisk?: boolean;
};

export const ACTION_KEY_PREFIX = "retainpdf.reader-agent-operation.action-key.v1:";
export const READER_ACTION_KEY_ID_PREFIX = "reader-";
export const ACTIVE_STATUSES = AGENT_OPERATION_ACTIVE_STATUSES;
export const GREEN_LIGHT_TRANSITION_STATUSES = AGENT_OPERATION_GREEN_LIGHT_TRANSITION_STATUSES;

export function shouldPoll(status: string, mode: ReaderAgentRuntimeConfig["agent_confirmation_mode"]): boolean {
  return agentOperationShouldPoll(status, mode);
}

export function eventSeq(operation: ReaderAgentOperation): number {
  return agentOperationEventSeq(operation);
}

export function shouldReplaceAgentOperation(
  current: ReaderAgentOperation | undefined,
  next: ReaderAgentOperation,
): boolean {
  return agentOperationShouldReplace(current, next);
}

export function makeActionKey(operationId: string, action: string): string {
  return makeAgentOperationActionKey(operationId, action, READER_ACTION_KEY_ID_PREFIX);
}

export function errorStatus(error: unknown): number {
  return agentOperationErrorStatus(error);
}

export function errorMessage(error: unknown): string {
  return agentOperationErrorMessage(error);
}
