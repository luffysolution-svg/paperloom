// admin-platform — pure：多用户模式的平台设置（所有任务统一用的翻译模型和 OCR），只给管理员。
// 接口见 docs/core/api/index.md 13.7。密钥只写不读：读回来只有「配没配」和末 4 位提示（"…1234"）；
// 保存时 api_key / token 不传或空串 = 保留原来的。
import { apiFetch, buildApiHeaders, buildApiUrl, unwrapEnvelope } from "./internal/runtime.js";
import { AuthRequestError } from "./auth.js";
async function request(method, path, body, apiPrefix) {
    const response = await apiFetch(buildApiUrl(apiPrefix ?? "/api/v1", path), {
        method,
        headers: buildApiHeaders(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new AuthRequestError(payload?.message || `请求失败（${response.status}）`, response.status, `${payload?.error?.code || payload?.code || ""}`, (payload?.error?.details && typeof payload.error.details === "object") ? payload.error.details : {});
    }
    return unwrapEnvelope(payload);
}
export function fetchPlatformSettings(apiPrefix) {
    return request("GET", "admin/platform", undefined, apiPrefix);
}
/** 保存后下一个任务就用新的，不用重启；返回同 GET。 */
export function savePlatformSettings(input, apiPrefix) {
    return request("PUT", "admin/platform", input, apiPrefix);
}
/** 实际请求一次服务商（可能要几秒），保存前先试。 */
export function testPlatformSettings(target, values = {}, apiPrefix) {
    return request("POST", "admin/platform/test", { target, ...values }, apiPrefix);
}
