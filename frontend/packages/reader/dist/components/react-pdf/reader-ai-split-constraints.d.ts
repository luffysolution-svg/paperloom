/** Assistant pane share of the shell: 30%–65%, default 50% (50-50 split). */
export declare const MIN_ASSISTANT_PERCENT = 30;
export declare const MAX_ASSISTANT_PERCENT = 65;
export declare const DEFAULT_ASSISTANT_PERCENT = 50;
/** Document pane takes the remainder, so its bounds are the assistant mirrored. */
export declare const MIN_DOCUMENT_PERCENT: number;
export declare const MAX_DOCUMENT_PERCENT: number;
/** Clamp an arbitrary stored/live percentage into the assistant pane bounds. */
export declare function clampAssistantPercent(value: unknown): number;
export declare function documentPercentForAssistant(assistantPercent: number): number;
/** react-resizable-panels accepts percentage strings such as "30%". */
export declare function panelPercent(value: number): `${number}%`;
//# sourceMappingURL=reader-ai-split-constraints.d.ts.map