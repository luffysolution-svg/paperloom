// ===== 分类(合集):建文件夹给 PDF 分组 =====
// 与 js/api/collections.js 同构(collection_id/name/parent_id/sort_order/
// created_at/document_count);membership 单独存一张 collection_id → Set<document_id>
// 表,和真实后端 collection_documents 表同样的建模方式。

import { MOCK_DOCUMENT_ID, documents } from "./document-seed.js";
import { nowIso, sequentialId, trimId } from "./mock-utils.js";
import type {
  MockCollection,
  MockCollectionCreate,
  MockCollectionPatch,
  MockCollectionWithCount,
} from "./documents.types.js";

let mockCollections: MockCollection[] | null = null;
let mockCollectionMembership: Map<string, Set<string>> | null = null;
let collectionSeq = 0;

function seedMockCollections(): void {
  collectionSeq = 2;
  mockCollections = [
    { collection_id: "col-001", name: "化学", parent_id: null, sort_order: 0, created_at: "2026-06-01T10:30:00Z" },
    { collection_id: "col-002", name: "机器学习", parent_id: null, sort_order: 1, created_at: "2026-06-08T15:00:00Z" },
  ];
  // mock 的"最近任务"列表(js/mock/index.js#getMockJobList)目前只有 MOCK_JOB_ID
  // 这一条真实数据,doc-1b8c52d9a304/doc-77e0fa3c1d55 的 active_job_id 在
  // job 列表里查不到——"机器学习"文件夹留空,顺便覆盖"空文件夹"这个真实 UI 态。
  mockCollectionMembership = new Map([
    ["col-001", new Set([MOCK_DOCUMENT_ID])],
    ["col-002", new Set()],
  ]);
}

function collectionsList(): MockCollection[] {
  if (!mockCollections) {
    seedMockCollections();
  }
  return mockCollections!;
}

/** collection_id → Set<document_id>（懒加载种子，缺省建空集）。 */
export function collectionMembership(collectionId: string): Set<string> {
  if (!mockCollectionMembership) {
    seedMockCollections();
  }
  if (!mockCollectionMembership!.has(collectionId)) {
    mockCollectionMembership!.set(collectionId, new Set());
  }
  return mockCollectionMembership!.get(collectionId)!;
}

/** 文档删除时清理其全部合集成员关系。 */
export function removeDocumentFromAllCollections(documentId: string): void {
  if (!mockCollectionMembership) {
    return;
  }
  for (const members of mockCollectionMembership.values()) {
    members.delete(documentId);
  }
}

function collectionWithCount(record: MockCollection): MockCollectionWithCount {
  return { ...record, document_count: collectionMembership(record.collection_id).size };
}

export function getMockCollectionList(): { collections: MockCollectionWithCount[] } {
  const list = [...collectionsList()].sort((a, b) => a.sort_order - b.sort_order);
  return { collections: list.map(collectionWithCount) };
}

export function createMockCollection({
  name,
  parent_id: parentId = null,
}: MockCollectionCreate = {}): MockCollectionWithCount {
  const trimmed = `${name || ""}`.trim();
  if (!trimmed) {
    throw new Error("name must not be empty. (400)");
  }
  collectionsList(); // 确保种子数据与 collectionSeq 初始化
  collectionSeq += 1;
  const record: MockCollection = {
    collection_id: sequentialId("col", collectionSeq),
    name: trimmed,
    parent_id: parentId || null,
    sort_order: collectionsList().length,
    created_at: nowIso(),
  };
  collectionsList().push(record);
  return collectionWithCount(record);
}

export function patchMockCollection(
  collectionId: string,
  { name, sort_order: sortOrder }: MockCollectionPatch = {},
): MockCollectionWithCount {
  const found = collectionsList().find((item) => item.collection_id === collectionId);
  if (!found) {
    throw new Error("未找到该分类。(404)");
  }
  if (name !== undefined) {
    const trimmed = `${name}`.trim();
    if (!trimmed) {
      throw new Error("name must not be empty. (400)");
    }
    found.name = trimmed;
  }
  if (sortOrder !== undefined) {
    found.sort_order = Number(sortOrder) || 0;
  }
  return collectionWithCount(found);
}

export function deleteMockCollection(collectionId: string): { deleted: boolean } {
  const list = collectionsList();
  const index = list.findIndex((item) => item.collection_id === collectionId);
  if (index < 0) {
    throw new Error("未找到该分类。(404)");
  }
  list.splice(index, 1);
  if (mockCollectionMembership) {
    mockCollectionMembership.delete(collectionId);
  }
  return { deleted: true };
}

export function addMockCollectionDocuments(
  collectionId: string,
  documentIds: Array<string | null | undefined> = [],
): MockCollectionWithCount {
  const found = collectionsList().find((item) => item.collection_id === collectionId);
  if (!found) {
    throw new Error("未找到该分类。(404)");
  }
  const members = collectionMembership(collectionId);
  for (const documentId of documentIds) {
    const normalized = trimId(documentId);
    if (!normalized) {
      continue;
    }
    if (!documents().some((item) => item.document_id === normalized)) {
      throw new Error(`未找到该文档: ${normalized}(404)`);
    }
    members.add(normalized);
  }
  return collectionWithCount(found);
}

export function removeMockCollectionDocument(
  collectionId: string,
  documentId: string,
): { removed: boolean } {
  const members = collectionMembership(collectionId);
  const normalized = trimId(documentId);
  if (!members.has(normalized)) {
    throw new Error("该文档不在此分类中。(404)");
  }
  members.delete(normalized);
  return { removed: true };
}
