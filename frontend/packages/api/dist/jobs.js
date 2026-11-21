// Jobs API — standalone, wraps job-status.v1
// No frontend/web deps; browser-aware (reads window.__FRONT_RUNTIME_CONFIG__ for apiBase / X-API-Key if present).
// OCR 任务也走 /jobs（后端已统一），建任务也是（见 jobs-submit.ts），前端不再用 /ocr/jobs。
// 请求走生成的函数（契约 job-status.v1 的端点表），这里只管参数整理和给用户看的报错。
import { API_PREFIX } from "./internal/runtime.js";
import { attachErrorDetails } from "./http.js";
import * as generated from "./generated/job-status.js";
import { failWith } from "./request.js";
function jobRequestError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}
function normalizeJobPayloadArgs(a, b) {
    // Deprecated swapped order: (apiPrefix, jobId) heuristics via a.startsWith("/")
    if (typeof a === "string" &&
        a.startsWith("/") &&
        typeof b === "string" &&
        b != null &&
        !b.startsWith("/")) {
        if (typeof console !== "undefined" && console.warn) {
            console.warn("[deprecated] fetchJobPayload(apiPrefix, jobId) is deprecated, use fetchJobPayload(jobId, { apiPrefix })");
        }
        return { apiPrefix: a, jobId: b };
    }
    if (typeof b === "string") {
        if (typeof console !== "undefined" && console.warn) {
            console.warn("[deprecated] fetchJobPayload(jobId, apiPrefix) string form is deprecated, use fetchJobPayload(jobId, { apiPrefix })");
        }
        return { jobId: a, apiPrefix: b };
    }
    if (b && typeof b === "object") {
        return { jobId: a, apiPrefix: b.apiPrefix };
    }
    return { jobId: a, apiPrefix: undefined };
}
export async function fetchJobPayload(a, b) {
    const { jobId, apiPrefix } = normalizeJobPayloadArgs(a, b);
    const normalizedJobId = `${jobId || ""}`.trim();
    if (!normalizedJobId)
        throw new Error("读取任务失败: 缺少 job_id");
    // 通用地址同时覆盖翻译与 OCR 任务，不再 404 后退到 /ocr/jobs/ 别名。
    return generated.getJob(apiPrefix, { job_id: normalizedJobId }, {
        onError: (status, payload) => (status === 404
            // 合并阅读的虚拟任务被清理了，404 带 reason=merged_reading_expired；阅读器靠它重新问阅读入口。
            ? attachErrorDetails(jobRequestError("未找到该任务，请检查 job_id 是否正确。", 404), payload)
            : jobRequestError(`读取任务失败，请稍后重试。(${status})`, status)),
    });
}
export async function fetchJobList(apiPrefix = API_PREFIX, { limit = 20, offset = 0, status = "", workflow = "", provider = "", scope = "jobs", q = "", includeLiveStage = true, jobIds = [], } = {}) {
    const wantedJobIds = jobIds.map((id) => `${id}`.trim()).filter(Boolean);
    const query = {
        limit,
        offset,
        status: (status || undefined),
        // 只看 OCR 任务：在通用列表上按 workflow 过滤，不再走 /ocr/jobs 列表别名。
        workflow: (workflow || (scope === "ocr" ? "ocr" : undefined)),
        provider: provider || undefined,
        q: `${q || ""}`.trim() || undefined,
        include_live_stage: includeLiveStage ? undefined : false,
        job_ids: wantedJobIds.length ? wantedJobIds.join(",") : undefined,
    };
    return generated.listJobs(apiPrefix, { query }, { onError: failWith("读取最近任务失败，请稍后重试。") });
}
// GET /jobs 的 limit 只收 1..=500，越界 400。
export const JOB_LIST_MAX_LIMIT = 500;
// 按编号批量取任务的活态（列表项，阶段在 stage_snapshot 里）。名单超过 500 个就分批，结果按批次顺序拼起来；
// 后端没有的编号不出现在 items 里。书架列表 GET /library/books 已删（2026-10-22），文档卡片和文件夹都走这里。
export async function fetchJobsByIds(apiPrefix = API_PREFIX, jobIds = []) {
    const wanted = Array.from(new Set(jobIds.map((id) => `${id || ""}`.trim()).filter(Boolean)));
    const batches = [];
    for (let start = 0; start < wanted.length; start += JOB_LIST_MAX_LIMIT) {
        batches.push(wanted.slice(start, start + JOB_LIST_MAX_LIMIT));
    }
    const pages = await Promise.all(batches.map((batch) => fetchJobList(apiPrefix, { jobIds: batch, limit: batch.length })));
    return { items: pages.flatMap((page) => (Array.isArray(page?.items) ? page.items : [])) };
}
