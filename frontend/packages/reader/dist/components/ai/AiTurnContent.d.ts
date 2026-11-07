import type { TurnMetrics, TurnPart } from "@retainpdf/api";
import type { AiCitationLike } from "../../shared/ai/answer-enhance.js";
export declare function AiRunStatus({ label, running, elapsedMs }: {
    label?: string;
    running: boolean;
    elapsedMs?: number;
}): import("react").JSX.Element;
export declare const AiTurnContent: import("react").MemoExoticComponent<({ parts, content, citations, streaming, metrics, jobId, onJumpCitation }: {
    parts?: TurnPart[];
    content: string;
    citations?: AiCitationLike[];
    streaming?: boolean;
    metrics?: TurnMetrics;
    jobId?: string;
    onJumpCitation?: (citation: AiCitationLike) => void;
}) => import("react").JSX.Element>;
//# sourceMappingURL=AiTurnContent.d.ts.map