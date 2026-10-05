type FetchImpl = typeof fetch;
export declare function setAnswerEnhanceAdapters(adapters?: {
    resolveResourceUrl?: (value: unknown) => string;
    fetchProtected?: FetchImpl;
}): void;
export declare function resetAnswerEnhanceAdapters(): void;
export type AiCitationLike = {
    ref?: number | string;
    block_id?: string;
    page_idx?: number;
    page?: number;
    job_id?: string;
    document_id?: string;
    snippet?: string;
    image_url?: string;
    image_urls?: string[];
    asset_image_urls?: string[];
    assets?: Array<{
        image_url?: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
};
export declare function isAgenticCitation(citation: unknown): citation is AiCitationLike;
/** 从 citation 解析 0 基 page_idx；缺省时尝试 block_id 里的 p00N。 */
export declare function resolveCitationPageIdx(citation: AiCitationLike | null | undefined): number | null;
/** 阅读器 1 基页码 */
export declare function resolveCitationPageNumber(citation: AiCitationLike | null | undefined): number | null;
/** Normalize API/history citations before they enter the assistant message store. */
export declare function normalizeAiCitations(raw: unknown): AiCitationLike[];
export declare function clipSnippet(text?: string, maxLength?: number): string;
/** 只保留回答正文出现的 [n]，避免「甩 10 条长列表」。 */
export declare function pickCitationsForAnswer(answerText: string, citations: AiCitationLike[], { max }?: {
    max?: number;
}): AiCitationLike[];
export declare function decorateCitationMarkdown(markdown: string, citationByRef: Map<string, AiCitationLike>): string;
export declare function buildPagePreviewUrl(jobId: string, pageIdx0: number, kind?: "translated" | "source", adapters?: {
    resolveResourceUrl?: (v: unknown) => string;
}): string;
export declare function buildMarkdownImageApiUrl(jobId: string, relativePath: string, adapters?: {
    resolveResourceUrl?: (v: unknown) => string;
}): string;
/**
 * AI 回答图片只允许当前 job 的 Markdown 资产。外链、data/blob/file、其它 job
 * 一律 fail closed；绝不把鉴权 fetch 发往模型提供的任意 URL。
 */
/**
 * 把回答里的图片引用解析成可请求的 URL，解析不出来就返回空串（fail closed）。
 *
 * `allowedDocumentIds` 是给「图片不在阅读中的那个 job 里」准备的。上传先跑 OCR、
 * 翻译另起一个 job 复用它的产物，图片留在 OCR 那边，于是路径里的 job 和当前阅读的
 * job 对不上，图片一律显示成「图片不可用」。
 *
 * 但不能因此放行任意 job——那等于把「引用指向别的文档」那类问题放回来。后端在 URL 上
 * 带了 `?doc=<document_id>`，只有它出现在本次回答的引用里才放行；URL 写在译文里，
 * 所以这个判据对历史回答同样成立。
 */
export declare function resolveAnswerImageUrl(rawValue: string, jobId: string, adapters?: {
    resolveResourceUrl?: (v: unknown) => string;
}, allowedDocumentIds?: Iterable<string>): string;
/** 本次回答引用涉及的文档。图片 URL 声明的 `?doc=` 必须落在这里面。 */
export declare function answerDocumentIds(citations?: AiCitationLike[]): string[];
/** Resolve an answer image to the same structured citation used by inline [n] jumps. */
export declare function findCitationForAnswerImage(rawValue: string, citations: AiCitationLike[], jobId: string): AiCitationLike | null;
/** Mount sanitized answer HTML without ever attaching a raw model-provided img src. */
export declare function mountAnswerHtml(root: HTMLElement, html: string, { jobId, documentRef }: {
    jobId: string;
    documentRef?: Document;
}): number;
/**
 * 把 markdown 生成的 <a href> 改成无导航 span。
 * 桌面端 Electron setWindowOpenHandler → shell.openExternal：
 * 任何 target=_blank / window.open / 真实 <a> 点击都会弹出系统浏览器。
 * 分支 remount 时幽灵点击因此被体感成「重新打开新标签」。
 */
export declare function neutralizeMarkdownAnchors(container: ParentNode, { onOpen, documentRef, }?: {
    /** 用户主动点链接时回调；返回 true 表示已处理 */
    onOpen?: ((href: string, event: MouseEvent) => boolean | void) | null;
    documentRef?: Document;
}): void;
/** 把正文里的 [n] 换成可点击按钮（跳过 code/pre）。 */
export declare function injectCitationMarkers(container: ParentNode, citationByRef: Map<string, AiCitationLike>, onJump: ((citation: AiCitationLike) => void) | null, documentRef?: Document): void;
/** 回收容器内已 hydrate 的 blob URL（重渲染/卸载前调用，防泄漏——审计 P1-5）。 */
export declare function revokeHydratedImageUrls(container: ParentNode | null | undefined): void;
/** 受保护 API 图片 → blob（回答正文里的 md 图）。 */
export declare function hydrateProtectedImages(container: ParentNode, { fetchImpl, signal }?: {
    fetchImpl?: FetchImpl;
    signal?: AbortSignal;
}): Promise<void>;
/**
 * 精简引用脚注：紧凑 chip，不默认铺大图缩略图。
 * 仅展示 pick 后的条目（通常是正文 [n]）。
 */
export declare function renderCitationFooter(host: HTMLElement, citations: AiCitationLike[], { onJump, answerText, max, documentRef, }?: {
    onJump?: ((citation: AiCitationLike) => void) | null;
    answerText?: string;
    max?: number;
    documentRef?: Document;
}): void;
export {};
//# sourceMappingURL=answer-enhance.d.ts.map