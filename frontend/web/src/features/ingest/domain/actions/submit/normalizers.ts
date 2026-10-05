import type {
  BudgetStateSnapshot,
  DeepSeekBalanceCheckResult,
  JobPayload,
} from "./contracts.js";

export function asBudgetState(value: unknown): BudgetStateSnapshot | null | undefined {
  if (value == null || typeof value !== "object") {
    return value as null | undefined;
  }
  return value as BudgetStateSnapshot;
}

export function asJobPayload(value: unknown): JobPayload | null | undefined {
  if (value == null || typeof value !== "object") {
    return value as null | undefined;
  }
  return value as JobPayload;
}

export function asBalanceResult(value: unknown): DeepSeekBalanceCheckResult | null | undefined {
  if (value == null || typeof value !== "object") {
    return value as null | undefined;
  }
  return value as DeepSeekBalanceCheckResult;
}
