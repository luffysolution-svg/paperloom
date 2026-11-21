import * as MockDocuments from "../mocks/documents.js";
import {
  fetchDocumentList as _canonFetchDocumentList,
  fetchDocument as _canonFetchDocument,
  fetchDocumentByJobId as _canonFetchDocumentByJobId,
  fetchDocumentJobs as _canonFetchDocumentJobs,
  ocrDocument as _canonOcrDocument,
  translateDocument as _canonTranslateDocument,
  deleteDocument as _canonDeleteDocument,
  patchDocument as _canonPatchDocument,
  createDocumentMetadataSuggestion as _canonCreateDocumentMetadataSuggestion,
  fetchDocumentMetadataSuggestions as _canonFetchDocumentMetadataSuggestions,
  fetchDocumentReading as _canonFetchDocumentReading,
  fetchDocumentTranslationCoverage as _canonFetchDocumentTranslationCoverage,
} from "@retainpdf/api/documents";
import { mockable } from "./_mockable.js";

export type {
  DocumentReadingStatus,
  DocumentRecord,
  DocumentReadingView,
  TranslationCoverageView,
  TranslationCoverageJob,
  TranslationCoverageSegment,
} from "@retainpdf/api/documents";

export const fetchDocumentList = mockable(_canonFetchDocumentList, MockDocuments.fetchDocumentList);
export const fetchDocumentByJobId = mockable(_canonFetchDocumentByJobId, MockDocuments.fetchDocumentByJobId);
export const fetchDocument = mockable(_canonFetchDocument, MockDocuments.fetchDocument);
export const translateDocument = mockable(_canonTranslateDocument, MockDocuments.translateDocument);
export const ocrDocument = mockable(_canonOcrDocument, MockDocuments.ocrDocument);
export const fetchDocumentJobs = mockable(_canonFetchDocumentJobs, MockDocuments.fetchDocumentJobs);
export const deleteDocument = mockable(_canonDeleteDocument, MockDocuments.deleteDocument);
export const patchDocument = mockable(_canonPatchDocument, MockDocuments.patchDocument);
export const createDocumentMetadataSuggestion = mockable(_canonCreateDocumentMetadataSuggestion, () => null);
export const fetchDocumentMetadataSuggestions = mockable(_canonFetchDocumentMetadataSuggestions, () => []);
// mock 没有合并：返回「无」，阅读入口照旧用调用方给的 job_id。
export const fetchDocumentReading = mockable(_canonFetchDocumentReading, async () => ({
  job_id: null,
  merged: false,
  contributing_job_ids: [],
}));
// mock 没有覆盖数据：返回空，详情页不显示覆盖条。
export const fetchDocumentTranslationCoverage = mockable(_canonFetchDocumentTranslationCoverage, async () => ({
  page_count: 0,
  translated_pages: 0,
  contributing_jobs: 0,
  segments: [],
  jobs: [],
}));
