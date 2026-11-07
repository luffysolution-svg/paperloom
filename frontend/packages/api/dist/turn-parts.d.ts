export type TurnPart = {
    id: string;
    type: "text" | "reasoning" | "tool" | "plan" | "notice";
    text?: string;
    status?: string;
    started_ms?: number;
    duration_ms?: number;
    title?: string;
    tool?: string;
    summary?: string;
    input?: unknown;
    input_preview?: string;
    output?: unknown;
    content?: unknown;
    entries?: {
        content: string;
        status: string;
        priority?: string;
    }[];
    [key: string]: unknown;
};
export type TurnEvent = {
    type: string;
    seq?: number;
    elapsed_ms?: number;
    [key: string]: any;
};
export type TurnMetrics = {
    elapsed_ms?: number;
    first_event_ms?: number;
    first_text_ms?: number;
    usage?: Record<string, any>;
    [key: string]: any;
};
export type AiImageAttachment = {
    name?: string;
    mime_type: string;
    data: string;
};
export declare function attachmentsFromTrace(raw: unknown): AiImageAttachment[];
export declare function applyTurnEvent(parts: TurnPart[], event: TurnEvent): TurnPart[];
export declare function timelineFromTrace(raw: unknown): {
    parts?: TurnPart[];
    metrics?: TurnMetrics;
    status?: string;
};
