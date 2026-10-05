export type MarkdownImageProgress = {
    failed: number;
    loaded: number;
    total: number;
};
export type ProtectedMarkdownImageLoaderOptions = {
    fetchImage: (url: string, init?: RequestInit) => Promise<Response>;
    onObjectUrl: (url: string) => void;
    onProgress?: (progress: MarkdownImageProgress) => void;
    protectedBaseUrl?: string;
    root?: Element | null;
    /** 外部取消信号：卸载/重来时中止在途的受保护图片请求。 */
    signal?: AbortSignal;
};
export declare function isProtectedMarkdownAssetUrl(value: string, baseUrl?: string): boolean;
/**
 * Direct public images rely on native lazy loading. Protected images cannot set src until
 * their authenticated blob has been fetched, so observe them against the reader scrollport.
 */
export declare function startMarkdownImageLoading(images: HTMLImageElement[], options: ProtectedMarkdownImageLoaderOptions): () => void;
//# sourceMappingURL=markdown-images.d.ts.map