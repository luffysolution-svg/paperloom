export declare function resolveJobActions(job: any): {
    cancelEnabled: boolean;
    resumeEnabled: boolean;
    bundleEnabled: boolean;
    pdfEnabled: boolean;
    markdownJsonEnabled: boolean;
    markdownRawEnabled: boolean;
    cancel: string;
    bundle: string;
    pdf: string;
    markdownJson: string;
    markdownRaw: string;
};
export declare function resolveJobMarkdownBundleAction(job: any, manifestPayload?: any): {
    ready: boolean;
    url: string;
};
export declare function resolveJobSourcePdfAction(job: any, manifestPayload?: any): {
    ready: boolean;
    url: string;
};
