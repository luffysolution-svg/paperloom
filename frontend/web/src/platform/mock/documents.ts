// platform/mock/documents 的公开出口（兼容旧 import 路径）。
// 实现按职责拆到：document-seed / document-actions / collections / favorites / search / reader。

export {
  MOCK_DOCUMENT_ID,
  MOCK_DOCUMENT_SOURCE_PDF_URL,
  MOCK_DOCUMENT_COVER_URL,
  MOCK_DOCUMENT_THUMB_URL,
  getMockDocument,
  getMockDocumentByJobId,
  bindMockDocumentActiveJob,
  patchMockDocument,
} from "./document-seed.js";

export {
  getMockDocumentList,
  deleteMockDocument,
  translateMockDocument,
  ocrMockDocument,
  getMockDocumentJobs,
} from "./document-actions.js";

export {
  getMockCollectionList,
  createMockCollection,
  patchMockCollection,
  deleteMockCollection,
  addMockCollectionDocuments,
  removeMockCollectionDocument,
} from "./collections.js";

export {
  createMockFavorite,
  getMockFavorites,
  deleteMockFavorite,
  countMockFavoritesByJob,
  clearMockFavoritesForDocument,
} from "./favorites.js";

export { getMockSearchHits } from "./search.js";

export { getMockReaderRegions } from "./reader.js";

export type {
  MockReadingStatus,
  MockDocument,
  MockDocumentWithMedia,
  MockDocumentListQuery,
  MockDocumentListResult,
  MockDocumentPatch,
  MockCollection,
  MockCollectionWithCount,
  MockCollectionCreate,
  MockCollectionPatch,
  MockFavoriteKind,
  MockFavorite,
  MockFavoriteCreatePayload,
  MockSearchHit,
} from "./documents.types.js";
