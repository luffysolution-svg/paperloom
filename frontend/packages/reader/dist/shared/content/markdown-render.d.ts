export type MarkdownAssetResolver = (imagesBaseUrl: string, relativePath: string) => string;
export type MountRenderedMarkdownOptions = {
    /** 注入宿主资源 URL 解析（原 external.resolveMarkdownAssetUrl）。缺省时原样保留。 */
    resolveAssetUrl?: MarkdownAssetResolver;
};
export declare function loadMarked(): Promise<typeof import("marked")>;
export declare function sanitizeRenderedMarkdown(container: ParentNode): void;
export declare function mountRenderedMarkdown(container: HTMLElement, html: string, imagesBaseUrl: string, options?: MountRenderedMarkdownOptions): HTMLImageElement[];
//# sourceMappingURL=markdown-render.d.ts.map