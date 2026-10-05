export declare const ANNOTATION_KIND_META: Readonly<{
    sentence: {
        label: string;
    };
    data: {
        label: string;
    };
    figure: {
        label: string;
    };
}>;
export type AnnotationKind = keyof typeof ANNOTATION_KIND_META;
export type AnnotationItem = {
    favoriteId?: string;
    documentId?: string;
    jobId?: string;
    /** 0-based 页码（真源约定，见文件头） */
    pageIdx?: number;
    blockId?: string;
    kind?: string;
    quoteText?: string;
    translatedQuoteText?: string;
    note?: string;
    createdAt?: string;
    [key: string]: unknown;
};
export type AnnotationPageGroup<T> = {
    pageIdx: number;
    items: T[];
};
export type AnnotationGroup = AnnotationPageGroup<AnnotationItem>;
export declare function sortByPageAndCreatedAt<T>(list: unknown, pageOf: (item: T) => number): T[];
export declare function groupByPageAndCreatedAt<T>(list: unknown, pageOf: (item: T) => number): AnnotationPageGroup<T>[];
export declare function sortAnnotations(list: unknown): AnnotationItem[];
export declare function groupAnnotationsByPage(list: unknown): AnnotationGroup[];
export declare function buildAnnotationsMarkdown({ title, annotations, }?: {
    title?: string;
    annotations?: unknown;
}): string;
export declare function annotationAnchor(annotation: AnnotationItem | null | undefined): {
    pageIdx?: number;
    blockId?: string;
};
//# sourceMappingURL=view-model.d.ts.map