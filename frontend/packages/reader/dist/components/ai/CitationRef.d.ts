import { type AiCitationLike } from "../../shared/ai/answer-enhance.js";
/** 开合延迟：开得太快会在阅读时乱闪，关得太快则从 [n] 挪到卡片上的路上就没了。 */
export declare const HOVER_OPEN_DELAY_MS = 140;
export declare const HOVER_CLOSE_DELAY_MS = 180;
export type CitationRefProps = {
    citation: AiCitationLike;
    label: string;
    jobId: string;
    onJump?: (citation: AiCitationLike) => void;
};
export declare function CitationRef({ citation, label, jobId, onJump }: CitationRefProps): import("react").JSX.Element;
//# sourceMappingURL=CitationRef.d.ts.map