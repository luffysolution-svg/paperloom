import { agentOperationShouldPoll } from "@retainpdf/api/agent-operation-model";
import type {
  AgentConfirmationMode,
  AgentOperationEntry,
  AgentOperationState,
  AgentOperationStatus,
} from "./types.js";

function shouldPoll(status: AgentOperationStatus, confirmationMode: AgentConfirmationMode): boolean {
  return agentOperationShouldPoll(status, confirmationMode);
}

export function operationsForConversation(state: AgentOperationState, conversationId: string): AgentOperationEntry[] {
  return (state.idsByConversation[conversationId] || [])
    .map((id) => state.byId[id])
    .filter(Boolean);
}

export function operationsByRequestMessage(
  state: AgentOperationState,
  conversationId: string,
): Record<string, AgentOperationEntry[]> {
  const allowed = new Set(state.idsByConversation[conversationId] || []);
  const result: Record<string, AgentOperationEntry[]> = {};
  for (const [messageId, ids] of Object.entries(state.idsByRequestMessage)) {
    const entries = ids.filter((id) => allowed.has(id)).map((id) => state.byId[id]).filter(Boolean);
    if (entries.length) result[messageId] = entries;
  }
  return result;
}

export function hasActiveOperations(
  state: AgentOperationState,
  conversationId: string,
  confirmationMode: AgentConfirmationMode = "explicit",
): boolean {
  return operationsForConversation(state, conversationId)
    .some((entry) => shouldPoll(entry.remote.status, confirmationMode));
}

export function operationNeedsPolling(
  status: AgentOperationStatus,
  confirmationMode: AgentConfirmationMode = "explicit",
): boolean {
  return shouldPoll(status, confirmationMode);
}
