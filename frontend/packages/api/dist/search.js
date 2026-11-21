// search — 走生成的请求函数（契约 library-documents.v1），这里只管空查询和给用户看的报错。
import * as generated from "./generated/library-documents.js";
import { failWith } from "./request.js";
export async function searchLibrary(apiPrefix, q, { limit = 20 } = {}) {
    const query = `${q || ""}`.trim();
    if (!query)
        return { query, hits: [], limit, has_more: false };
    return generated.searchLibrary(apiPrefix, { query: { q: query, limit } }, { onError: failWith("检索失败，请稍后重试。") });
}
