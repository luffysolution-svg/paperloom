import { isMockMode } from "@/platform/config/runtime.js";
import { getMockJobList } from "@/platform/mock/index.js";
import { countMockFavoritesByJob } from "@/platform/mock/documents.js";
import {
  fetchLibraryBookList as _fetchLibraryBookList,
  deleteLibraryBook as _deleteLibraryBook,
} from "@retainpdf/api/library-books";
import { stripOcrSuffix } from "@retainpdf/api/utils/strip-ocr";

export const fetchLibraryBookList = async (apiPrefix: string, opts: any = {}): Promise<any> => {
  if (isMockMode()) { const jobIds = Array.isArray(opts?.jobIds) ? opts.jobIds : []; return getMockJobList({ jobIds }); }
  return (_fetchLibraryBookList as any)(apiPrefix, opts);
};

export const deleteLibraryBook = async (apiPrefix: string, jobId: string, opts: any = {}): Promise<any> => {
  const normalizedJobId = stripOcrSuffix(`${jobId || ""}`);
  if (!normalizedJobId) throw new Error("删除失败: 缺少 job_id");
  if (isMockMode()) {
    const referenced = countMockFavoritesByJob(normalizedJobId);
    if (referenced > 0 && !opts?.force) {
      const conflict = new Error(`该 job 被 ${referenced} 条收藏引用(409)`) as Error & { status?: number };
      (conflict as any).status = 409;
      throw conflict;
    }
    return { job_id: normalizedJobId };
  }
  return (_deleteLibraryBook as any)(apiPrefix, jobId, opts);
};
