// runtime 任务归属解析：全局“+”提交的 runtime 快照不携带 document_id，
// 需要按 job_id 反查并缓存归属，才能把进度安全地合并进当前文档。
// 缓存跨文档/弹窗复用，有上限避免长会话无限增长（删除/重试会产生新 job_id）。

import { useEffect, useRef, useState } from "react";
import { documentIdOf } from "../domain/document-jobs-model.js";

const RUNTIME_JOB_DOCUMENT_CACHE_LIMIT = 200;
const runtimeJobDocumentCache = new Map<string, string>();

function rememberRuntimeJobDocument(jobId: string, documentId: string) {
  // delete 再 set：命中即刷新为最新，单调淘汰最旧的一条。
  runtimeJobDocumentCache.delete(jobId);
  runtimeJobDocumentCache.set(jobId, documentId);
  while (runtimeJobDocumentCache.size > RUNTIME_JOB_DOCUMENT_CACHE_LIMIT) {
    const oldest = runtimeJobDocumentCache.keys().next().value;
    if (oldest === undefined) break;
    runtimeJobDocumentCache.delete(oldest);
  }
}

export interface RuntimeJobOwner {
  jobId: string;
  documentId: string;
  resolving: boolean;
}

export function useDocumentJobRuntimeOwner({
  open,
  documentId,
  runtimeJobId,
  runtimeDeclaredDocumentId,
  initialJobId,
  initialDocumentId,
  resolveDocument,
}: {
  open: boolean;
  documentId: string;
  runtimeJobId: string;
  runtimeDeclaredDocumentId: string;
  initialJobId: string;
  initialDocumentId: string;
  resolveDocument?: (jobId: string) => Promise<unknown>;
}): RuntimeJobOwner {
  const [runtimeOwner, setRuntimeOwner] = useState<RuntimeJobOwner>({
    jobId: "",
    documentId: "",
    resolving: false,
  });
  const ownerGenerationRef = useRef(0);

  useEffect(() => {
    const generation = ++ownerGenerationRef.current;
    if (!open || !documentId || !runtimeJobId) {
      setRuntimeOwner({ jobId: "", documentId: "", resolving: false });
      return undefined;
    }
    const knownOwner = runtimeDeclaredDocumentId
      || (runtimeJobId === initialJobId ? initialDocumentId : "")
      || runtimeJobDocumentCache.get(runtimeJobId)
      || "";
    if (knownOwner) {
      rememberRuntimeJobDocument(runtimeJobId, knownOwner);
      setRuntimeOwner({ jobId: runtimeJobId, documentId: knownOwner, resolving: false });
      return undefined;
    }
    if (typeof resolveDocument !== "function") {
      setRuntimeOwner({ jobId: runtimeJobId, documentId: "", resolving: false });
      return undefined;
    }

    setRuntimeOwner({ jobId: runtimeJobId, documentId: "", resolving: true });
    let cancelled = false;
    void (async () => {
      // 上传先建 document 再建 job，通常首请求即可命中；短暂的两次补偿只用于
      // 应对数据库投影尚未可见的瞬间，不依赖 2 秒 document-jobs 轮询。
      for (const delay of [0, 250, 750]) {
        if (delay) await new Promise((resolve) => globalThis.setTimeout(resolve, delay));
        if (cancelled || generation !== ownerGenerationRef.current) return;
        try {
          const owner = await resolveDocument(runtimeJobId);
          const ownerDocumentId = documentIdOf(owner as Record<string, unknown> | null);
          if (!ownerDocumentId) continue;
          rememberRuntimeJobDocument(runtimeJobId, ownerDocumentId);
          if (!cancelled && generation === ownerGenerationRef.current) {
            setRuntimeOwner({
              jobId: runtimeJobId,
              documentId: ownerDocumentId,
              resolving: false,
            });
          }
          return;
        } catch {
          // 归属解析是 runtime 合并的增强路径；文档任务主轮询仍继续工作。
        }
      }
      if (!cancelled && generation === ownerGenerationRef.current) {
        setRuntimeOwner({ jobId: runtimeJobId, documentId: "", resolving: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    documentId,
    initialDocumentId,
    initialJobId,
    open,
    resolveDocument,
    runtimeDeclaredDocumentId,
    runtimeJobId,
  ]);

  return runtimeOwner;
}
