import { isJobTerminal, isTerminalStatus } from "@retainpdf/domain/job";
import {
  formatEventTimestamp,
  formatRuntimeDuration,
} from "@retainpdf/domain/job";

export {
  clampPositiveMs,
  parseIsoTime,
  resolveLiveDurations,
} from "@retainpdf/domain/job";
export {
  resolveStageHistory,
  resolveStageHistoryDuration,
  stageHistoryDisplay,
  summarizeStageName,
} from "@retainpdf/domain/job";

export { escapeHtml } from "@/platform/utils/html-formatting.js";

export { formatEventTimestamp, formatRuntimeDuration, isJobTerminal, isTerminalStatus };
