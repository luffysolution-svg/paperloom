export type PlatformSettingsView = {
    /** database：管理后台保存过；environment：还在用部署时的 RETAIN_PLATFORM_* 环境变量。 */
    source: "database" | "environment" | string;
    translation: {
        model: string;
        base_url: string;
        api_protocol: string;
        /** 思考深度；空 = 用默认。 */
        thinking: string;
        /** 单个任务的并发上限；0 = 不限。 */
        max_workers: number;
        api_key_configured: boolean;
        api_key_hint: string;
    };
    ocr: {
        provider: string;
        token_configured: boolean;
        token_hint: string;
    };
    /** 能不能提交任务；不能时 missing 列出缺哪几项（translation_model / translation_base_url /
     * translation_api_key / ocr_provider / ocr_token）。 */
    ready: boolean;
    missing: string[];
    /** 只在 source 为 database 时有值。 */
    updated_at: string | null;
    updated_by: {
        user_id: string;
        username: string;
    } | null;
    /** 给下拉框用的取值。 */
    options: {
        api_protocols: string[];
        thinking_levels: string[];
        ocr_providers: string[];
        max_workers_limit: number;
    };
};
/** 非密钥字段整体替换（空串 = 不设）。换 OCR 服务商必须同时给新 token（OCR_TOKEN_REQUIRED）。 */
export type PlatformSettingsInput = {
    translation: {
        model: string;
        base_url: string;
        api_protocol: string;
        thinking: string;
        max_workers: number;
        api_key?: string;
    };
    ocr: {
        provider: string;
        token?: string;
    };
};
export type PlatformTestTarget = "translation" | "ocr";
/** 检测的请求体是扁平的；没给的字段用已保存的值。 */
export type PlatformTestInput = {
    model?: string;
    base_url?: string;
    api_protocol?: string;
    api_key?: string;
    provider?: string;
    token?: string;
};
/** status：ok / unauthorized / model_not_found / rate_limited / missing_input（缺必填项，没发请求）/
 * invalid_input（地址不合规）……summary 是中文。 */
export type PlatformTestResult = {
    target: PlatformTestTarget;
    ok: boolean;
    status: string;
    summary: string;
    hint?: string;
};
export declare function fetchPlatformSettings(apiPrefix?: string): Promise<PlatformSettingsView>;
/** 保存后下一个任务就用新的，不用重启；返回同 GET。 */
export declare function savePlatformSettings(input: PlatformSettingsInput, apiPrefix?: string): Promise<PlatformSettingsView>;
/** 实际请求一次服务商（可能要几秒），保存前先试。 */
export declare function testPlatformSettings(target: PlatformTestTarget, values?: PlatformTestInput, apiPrefix?: string): Promise<PlatformTestResult>;
