export declare const TOOL_EVENT_LABELS: Record<string, string>;
export declare function describeToolEvent(event: {
    tool?: string;
    event?: string;
    type?: string;
    title?: string;
} | string | null | undefined): string;
