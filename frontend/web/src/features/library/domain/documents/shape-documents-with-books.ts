// "一批文档 → 一批网格卡片 item"的唯一编排(重构②)。
//
// 之前这套"收集有 active_job_id 的文档 → 批量取任务活态 → 建
// bookMap → 逐篇 shapeDocumentCardItem"的编排被抄了两份:图书馆主网格
// (document-library-source.js)和合集展开(collections/controller.js)。两份
// 发散是"空合集" bug 的根源——合集那份是 F2 文档中心化之前的旧拷贝,自己
// filter 掉了馆藏文档。收成这一个函数后,任何"列一批文档成卡片"的界面
// (图书馆/合集/搜索/未来的新入口)都穿过它,不会再各自发散。
//
// 只负责 documents → cards 的映射(保序,不去重/不分页/不搜索过滤——那些是
// 各消费方自己的关切,留在调用方)。

import { shapeDocumentCardItem } from "./document-card-item.js";
import type { LibraryDocumentRecord } from "./document-card-item.js";
import type { LibraryCardItem } from "../types.js";

// GET /jobs?job_ids= 按编号批量取任务列表项（名单超过 500 个由接口层分批）。
export type JobsByIdsFetcher = (
  apiPrefix: string,
  jobIds: string[],
) => Promise<{ items?: LibraryCardItem[] }>;

export type JobPayloadFetcher = (
  jobId: string,
  opts: { apiPrefix?: string },
) => Promise<unknown>;

function normalizedJobId(value: unknown) {
  return `${value || ""}`.trim();
}

// documents: /documents 返回的文档数组
// fetchJobsByIds: (apiPrefix, jobIds) => { items } 端口(可缺省)
// fetchJobPayload: (jobId, { apiPrefix }) => job detail;/jobs 列表连 OCR 任务也给，
// 这里只给列表里没有的 active job 兜底（少见：任务刚建、刚被删）。
// 返回:与 documents 等长、同序的卡片 item 数组(已翻译叠加 book 活态,馆藏走
// 合成 job_id)。
//
// 投影合并规则(逐篇,见 shapeDocumentCardItem 三分支):
// 1) active_job_id 缺失 → 投影传 null,卡片走馆藏分支(`doc:<document_id>` 合成
//    job_id,library_only=true),不查 book/不回填;
// 2) 投影未命中 → /jobs 列表里没有时用 fetchJobPayload 按 job 逐个 best-effort
//    回填(吞错留空),仍保留真实 job_id 等轮询接管,不降级成馆藏合成 id;
// 3) 馆藏合成 id → 仅由下游 shapeDocumentCardItem 在分支 1) 内生成,本函数不造 id。
export async function shapeDocumentsWithBooks(
  documents: LibraryDocumentRecord[],
  { fetchJobsByIds, fetchJobPayload, apiPrefix }: {
    fetchJobsByIds?: JobsByIdsFetcher;
    fetchJobPayload?: JobPayloadFetcher;
    apiPrefix: string;
  },
) {
  const docs = Array.isArray(documents) ? documents : [];
  const jobIds = Array.from(new Set(
    docs.map((doc) => normalizedJobId(doc?.active_job_id)).filter(Boolean),
  ));

  // job_id → 任务列表项 / job 回填投影;缺 key 即"投影未命中",不抛错。
  const jobProjectionById = new Map();
  if (jobIds.length && typeof fetchJobsByIds === "function") {
    const payload = await fetchJobsByIds(apiPrefix, jobIds);
    for (const job of (Array.isArray(payload?.items) ? payload.items : [])) {
      const id = normalizedJobId(job?.job_id);
      if (id) {
        jobProjectionById.set(id, job);
      }
    }
  }

  if (typeof fetchJobPayload === "function") {
    const unprojectedJobIds = jobIds.filter((jobId) => !jobProjectionById.has(jobId));
    const fallbackProjections = await Promise.all(unprojectedJobIds.map(async (jobId) => {
      try {
        const payload = await fetchJobPayload(jobId, { apiPrefix });
        return payload && typeof payload === "object" ? [jobId, payload] : null;
      } catch {
        return null;
      }
    }));
    for (const fallback of fallbackProjections) {
      if (fallback) {
        jobProjectionById.set(fallback[0], fallback[1]);
      }
    }
  }

  return docs.map((doc) => {
    const activeJobId = normalizedJobId(doc?.active_job_id);
    return shapeDocumentCardItem(doc, activeJobId ? jobProjectionById.get(activeJobId) || null : null);
  });
}
