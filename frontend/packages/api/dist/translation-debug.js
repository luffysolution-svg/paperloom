// translation-debug — pure
// translation-debug — 翻译报告（job-reports.v1）和译文条目（translation-revisions.v1），请求走生成的函数。
import * as reports from "./generated/job-reports.js";
import * as translations from "./generated/translation-revisions.js";
import { failWith, orOnStatus } from "./request.js";
// 任务在、但翻译报告或翻译清单还没产出时，后端回 404 + error.details.reason=not_ready；
// 不带 reason 的 404 才是任务（或条目）不存在。
function isNotReady(payload) {
    return payload?.error?.details?.reason === "not_ready";
}
const TRANSLATION_NOT_READY_MESSAGE = "这个任务的翻译结果还没生成，翻译跑完后再看。";
/** 404 分「还没产出」和「找不到」两种说法，别的状态码用 otherwise。 */
function translationError(notFound, otherwise) {
    return (status, payload) => {
        if (status === 404)
            return new Error(isNotReady(payload) ? TRANSLATION_NOT_READY_MESSAGE : notFound);
        return new Error(otherwise(status, payload));
    };
}
function trimmedOrUndefined(value) {
    return `${value ?? ""}`.trim() || undefined;
}
export async function fetchTranslationDiagnostics(jobId, apiPrefix) {
    return reports.getTranslationReport(apiPrefix, { job_id: jobId }, {
        onError: translationError("未找到翻译调试信息，请确认该任务已完成翻译。", (status) => `读取翻译调试摘要失败，请稍后重试。(${status})`),
    });
}
export async function fetchTranslationItems(jobId, apiPrefix, { limit = 20, offset = 0, page = "", finalStatus = "", errorType = "", route = "", q = "" } = {}) {
    const pageText = trimmedOrUndefined(page);
    const query = {
        limit,
        offset,
        // 界面传的是输入框里的字符串；不是数字时照样发出去（NaN），后端回 400，和以前一样。
        page: pageText === undefined ? undefined : Number(pageText),
        final_status: trimmedOrUndefined(finalStatus),
        error_type: trimmedOrUndefined(errorType),
        route: trimmedOrUndefined(route),
        q: trimmedOrUndefined(q),
    };
    // 清单还没产出时是 200 空列表；404 只表示任务不存在，这里也当作空。
    return orOnStatus(translations.listTranslationItems(apiPrefix, { job_id: jobId, query }, { onError: failWith("读取翻译调试列表失败，请稍后重试。") }), 404, { items: [], total: 0, limit, offset });
}
export async function fetchTranslationItem(jobId, itemId, apiPrefix) {
    return translations.getTranslationItem(apiPrefix, { job_id: jobId, item_id: itemId }, {
        onError: translationError("未找到该翻译 item，请确认 item_id 是否正确。", (status) => `读取翻译 item 详情失败，请稍后重试。(${status})`),
    });
}
export async function replayTranslationItem(jobId, itemId, apiPrefix) {
    // 不带请求体。
    return translations.replayTranslationItem(apiPrefix, { job_id: jobId, item_id: itemId }, {
        onError: translationError("未找到该翻译 item，无法重放。", (status, payload) => (payload
            ? `重放翻译 item 失败: ${payload.message || JSON.stringify(payload)}`
            : `重放翻译 item 失败: ${status}`)),
    });
}
