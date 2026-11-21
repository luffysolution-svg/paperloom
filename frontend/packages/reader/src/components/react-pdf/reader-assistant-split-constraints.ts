// Single source of truth for the reader AI split geometry.
// Both the layout clamp (normalizeReaderAiSplitLayout) and the
// react-resizable-panels <Panel minSize/maxSize> props derive from these
// numbers, so the JS clamp and the library drag bounds can never drift apart.

/** Assistant pane share of the shell: 30%–65%, default 50% (50-50 split). */
export const MIN_ASSISTANT_PERCENT = 30;
export const MAX_ASSISTANT_PERCENT = 65;
export const DEFAULT_ASSISTANT_PERCENT = 50;

/** Document pane takes the remainder, so its bounds are the assistant mirrored. */
export const MIN_DOCUMENT_PERCENT = 100 - MAX_ASSISTANT_PERCENT;
export const MAX_DOCUMENT_PERCENT = 100 - MIN_ASSISTANT_PERCENT;

/** Clamp an arbitrary stored/live percentage into the assistant pane bounds. */
export function clampAssistantPercent(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(MAX_ASSISTANT_PERCENT, Math.max(MIN_ASSISTANT_PERCENT, numeric))
    : DEFAULT_ASSISTANT_PERCENT;
}

export function documentPercentForAssistant(assistantPercent: number): number {
  return 100 - assistantPercent;
}

/** react-resizable-panels accepts percentage strings such as "30%". */
export function panelPercent(value: number): `${number}%` {
  return `${value}%`;
}
