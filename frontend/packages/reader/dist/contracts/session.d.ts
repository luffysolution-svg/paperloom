import type { ReaderMetadata, ReaderRegion } from "../shared/data/reader-regions.js";
export type ReaderOptionalArtifactErrors = {
    regions: unknown;
    metadata: unknown;
};
export type LinkedDocumentRecord = {
    document_id?: string;
    active_job_id?: string | null;
    active_version_id?: string | null;
};
export type ReaderPayload = {
    jobPayload: unknown;
    manifestPayload: unknown;
    readerMetadata: ReaderMetadata | null;
    regionsPayload: unknown;
    readerErrors: ReaderOptionalArtifactErrors;
};
export type ReaderSessionLoadPlan = {
    kind: "restore-committed-source";
    documentId: string;
    revision: string;
} | {
    kind: "open-job-artifacts";
};
export type ReaderSessionSnapshot = {
    loadPlan: ReaderSessionLoadPlan;
    jobId: string;
    documentId: string;
    jobStatus: string;
    workflow: string;
    title: string;
    sourceUrl: string;
    translatedUrl: string;
    sourceOnly: boolean;
    sourcePayload: unknown;
    manifestPayload: unknown;
    regions: ReaderRegion[];
    readerMetadata: ReaderMetadata;
    readerErrors: ReaderOptionalArtifactErrors;
};
export type ReaderSessionSnapshotInput = {
    jobId: string;
    documentId: string;
    routeDocumentId: string;
    committedSource?: {
        documentId: string;
        revision: string;
    } | null;
    includeOptionalArtifacts?: boolean;
};
export type ReaderSessionDataPort = {
    loadReaderPayload: (jobId: string, options?: {
        includeOptionalArtifacts?: boolean;
    }) => Promise<ReaderPayload>;
    loadSessionSnapshot?: (input: ReaderSessionSnapshotInput) => Promise<ReaderSessionSnapshot>;
    loadJobPayload: (jobId: string) => Promise<unknown>;
    fetchDocumentByJobId: (apiPrefix: string, jobId: string) => Promise<LinkedDocumentRecord | null>;
    fetchProtected: typeof fetch;
    resolveResourceUrl: (url: string) => string;
    resolveReaderSourcePdf: (manifestPayload: unknown) => unknown;
    resolveReaderTranslatedPdfUrl: (jobPayload: unknown, manifestPayload: unknown) => string;
    resolveReaderArtifactUrl: (item: unknown) => string;
};
//# sourceMappingURL=session.d.ts.map