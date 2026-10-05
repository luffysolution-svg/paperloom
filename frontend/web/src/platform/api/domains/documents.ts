import * as MockDocuments from "../mocks/documents.js";
import {
  fetchDocumentList as _canonFetchDocumentList,
  fetchDocument as _canonFetchDocument,
  fetchDocumentByJobId as _canonFetchDocumentByJobId,
  fetchDocumentJobs as _canonFetchDocumentJobs,
  ocrDocument as _canonOcrDocument,
  translateDocument as _canonTranslateDocument,
  deleteDocument as _canonDeleteDocument,
  clearFavorites as _canonClearFavorites,
  patchDocument as _canonPatchDocument,
  createDocumentMetadataSuggestion as _canonCreateDocumentMetadataSuggestion,
  fetchDocumentMetadataSuggestions as _canonFetchDocumentMetadataSuggestions,
} from "@retainpdf/api/documents";
import { mockable } from "./_mockable.js";

export type { DocumentRecord } from "@retainpdf/api/documents";

export const fetchDocumentList = mockable(_canonFetchDocumentList, MockDocuments.fetchDocumentList);
export const fetchDocumentByJobId = mockable(_canonFetchDocumentByJobId, MockDocuments.fetchDocumentByJobId);
export const fetchDocument = mockable(_canonFetchDocument, MockDocuments.fetchDocument);
export const translateDocument = mockable(_canonTranslateDocument, MockDocuments.translateDocument);
export const ocrDocument = mockable(_canonOcrDocument, MockDocuments.ocrDocument);
export const fetchDocumentJobs = mockable(_canonFetchDocumentJobs, MockDocuments.fetchDocumentJobs);
export const deleteDocument = mockable(_canonDeleteDocument, MockDocuments.deleteDocument);
export const clearFavorites = mockable(_canonClearFavorites, MockDocuments.clearFavorites);
export const patchDocument = mockable(_canonPatchDocument, MockDocuments.patchDocument);
export const createDocumentMetadataSuggestion = mockable(_canonCreateDocumentMetadataSuggestion, () => null);
export const fetchDocumentMetadataSuggestions = mockable(_canonFetchDocumentMetadataSuggestions, () => []);
