import { type AiCitationLike } from "../../shared/ai/answer-enhance.js";
export type CitationHoverCardProps = {
    citation: AiCitationLike;
    jobId: string;
    anchor: HTMLElement | null;
    cardId: string;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
};
/**
 * 卡片有没有东西可显示。
 *
 * jobId 拿不到时 `buildPagePreviewUrl` 返回空串——主页的 citation 常常没有
 * `job_id`。这种情况**不出破图也不出占位框**，只出文字 snippet：一个永远加载不出来
 * 的灰框比没有图更吵，而 snippet 本身就是用户悬停时最想看的东西。图和文字都没有
 * 就干脆不开卡片（调用方据此决定还要不要挂 hover）。
 */
export declare function citationPreviewKinds(citation: AiCitationLike, jobId: string): string[];
export declare function citationHoverHasContent(citation: AiCitationLike, jobId: string): boolean;
export declare function CitationHoverCard({ citation, jobId, anchor, cardId, onPointerEnter, onPointerLeave, }: CitationHoverCardProps): import("react").JSX.Element;
//# sourceMappingURL=CitationHoverCard.d.ts.map