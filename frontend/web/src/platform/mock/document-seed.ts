// mock 文档表的种子、内存状态与基础访问（列表/单查/按 job 反查/绑定/补丁）。
// 镜像后端 documents 数据层形状：document = 按内容哈希去重的稳定身份，
// job 是文档名下的处理记录。

import { MOCK_JOB_ID } from "./constants.js";
import { nowIso, trimId } from "./mock-utils.js";
import type {
  MockDocument,
  MockDocumentPatch,
  MockDocumentWithMedia,
  MockReadingStatus,
} from "./documents.types.js";

export const MOCK_DOCUMENT_ID = "doc-9f2a41c8e77b";

// 镜像后端 with_document_media_urls。封面/缩略图走 mock://，
// 避免 /api/v1/documents/.../cover 在纯前端 mock 下 404 导致空封面。
export const MOCK_DOCUMENT_SOURCE_PDF_URL = "mock://document-source.pdf";
export const MOCK_DOCUMENT_COVER_URL = "mock://document-cover.png";
export const MOCK_DOCUMENT_THUMB_URL = "mock://document-thumb.png";

function buildMockDocuments(): MockDocument[] {
  return [
    {
      document_id: MOCK_DOCUMENT_ID,
      title: "共轭在卤素-锂交换选择性中的作用",
      source_filename: "halogen-lithium-exchange.pdf",
      page_count: 10,
      bytes: 2_621_440,
      active_job_id: MOCK_JOB_ID,
      reading_status: "reading",
      tags: ["化学", "有机合成"],
      added_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T12:00:00Z",
    },
    {
      document_id: "doc-1b8c52d9a304",
      title: "Attention Is All You Need",
      source_filename: "attention.pdf",
      page_count: 15,
      bytes: 1_843_200,
      active_job_id: "20260520-att-001",
      reading_status: "done",
      tags: ["机器学习"],
      added_at: "2026-05-20T08:00:00Z",
      updated_at: "2026-05-21T09:30:00Z",
    },
    {
      document_id: "doc-77e0fa3c1d55",
      title: "Scaling Laws for Neural Language Models",
      source_filename: "scaling-laws.pdf",
      page_count: 30,
      bytes: 4_115_000,
      active_job_id: "20260601-scl-002",
      reading_status: "unread",
      tags: [],
      added_at: "2026-06-08T14:00:00Z",
      updated_at: "2026-06-08T14:00:00Z",
    },
    // 馆藏态(只入库、未翻译):active_job_id 为空。文档中心网格要能显示它们,
    // 阅读器要能只读原文,卡片要能"以后再翻"。
    {
      document_id: "doc-ref-6a1f2c",
      title: "Reaxys Retrosynthesis 手册(仅存档)",
      source_filename: "reaxys-handbook.pdf",
      page_count: 42,
      bytes: 3_200_000,
      active_job_id: null,
      reading_status: "unread",
      tags: ["工具书"],
      added_at: "2026-06-10T09:00:00Z",
      updated_at: "2026-06-10T09:00:00Z",
    },
    {
      document_id: "doc-ref-9b7e04",
      title: "Group Theory Lecture Notes(仅存档)",
      source_filename: "group-theory-notes.pdf",
      page_count: 88,
      bytes: 5_600_000,
      active_job_id: "",
      reading_status: "reading",
      tags: [],
      added_at: "2026-06-12T15:30:00Z",
      updated_at: "2026-06-12T15:30:00Z",
    },
  ];
}

export function withMockDocumentMediaUrls(document: MockDocument): MockDocumentWithMedia {
  return {
    ...document,
    source_pdf_url: MOCK_DOCUMENT_SOURCE_PDF_URL,
    cover_url: MOCK_DOCUMENT_COVER_URL,
    thumbnail_url: MOCK_DOCUMENT_THUMB_URL,
  };
}

let mockDocuments: MockDocument[] | null = null;

/** mock 文档内存表（懒加载种子），供同目录各职责模块共享读写。 */
export function documents(): MockDocument[] {
  if (!mockDocuments) {
    mockDocuments = buildMockDocuments();
  }
  return mockDocuments;
}

// 后端按 job_id 直查所属文档:active_job_id 命中当然算,
// 历史 run(同一文档的旧翻译记录)也应解析到同一文档——用一张历史映射证明这条路可用。
export const MOCK_HISTORICAL_JOB_TO_DOCUMENT: Record<string, string> = {
  "mock-job-20260101-old": MOCK_DOCUMENT_ID,
};

export function getMockDocument(documentId: string): MockDocumentWithMedia {
  const found = documents().find((item) => item.document_id === documentId);
  if (!found) {
    throw new Error("未找到该文档。(404)");
  }
  return withMockDocumentMediaUrls(found);
}

export function getMockDocumentByJobId(jobId: string): MockDocumentWithMedia | null {
  const normalized = trimId(jobId);
  if (!normalized) {
    return null;
  }
  const byActive = documents().find((item) => item.active_job_id === normalized);
  if (byActive) {
    return withMockDocumentMediaUrls(byActive);
  }
  const historicalDocId = MOCK_HISTORICAL_JOB_TO_DOCUMENT[normalized];
  if (historicalDocId) {
    const doc = documents().find((item) => item.document_id === historicalDocId);
    return doc ? withMockDocumentMediaUrls(doc) : null;
  }
  return null;
}

/**
 * 重试/新 job 绑定到文档：更新 active_job_id，并登记历史映射，
 * 使 getMockDocumentByJobId(新 id) 仍能取到书名/封面。
 */
export function bindMockDocumentActiveJob(
  documentId?: string | null,
  jobId?: string | null,
  options: { previousJobId?: string | null } = {},
): MockDocumentWithMedia | null {
  const docId = trimId(documentId);
  const nextJobId = trimId(jobId);
  if (!docId || !nextJobId) {
    return null;
  }
  const found = documents().find((item) => item.document_id === docId);
  if (!found) {
    return null;
  }
  const previous = trimId(options.previousJobId || found.active_job_id);
  found.active_job_id = nextJobId;
  found.updated_at = nowIso();
  if (previous && previous !== nextJobId) {
    MOCK_HISTORICAL_JOB_TO_DOCUMENT[previous] = docId;
  }
  MOCK_HISTORICAL_JOB_TO_DOCUMENT[nextJobId] = docId;
  return withMockDocumentMediaUrls(found);
}

export const READING_STATUSES: MockReadingStatus[] = ["unread", "reading", "done"];

export function patchMockDocument(
  documentId: string,
  { title, reading_status: readingStatus, tags }: MockDocumentPatch = {},
): MockDocumentWithMedia {
  const found = documents().find((item) => item.document_id === documentId);
  if (!found) {
    throw new Error("未找到该文档。(404)");
  }
  if (readingStatus !== undefined && !READING_STATUSES.includes(readingStatus as MockReadingStatus)) {
    throw new Error("reading_status 仅支持 unread | reading | done。(400)");
  }
  if (title !== undefined) {
    found.title = `${title}`;
  }
  if (readingStatus !== undefined) {
    found.reading_status = readingStatus;
  }
  if (tags !== undefined) {
    // 整体替换语义
    found.tags = Array.isArray(tags) ? tags.map((item) => `${item}`) : [];
  }
  found.updated_at = nowIso();
  return withMockDocumentMediaUrls(found);
}
