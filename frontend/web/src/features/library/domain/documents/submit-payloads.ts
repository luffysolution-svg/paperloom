// 提交载荷组装（纯函数）：把详情表单的 overrides 叠到凭据基座上。

import type { OcrDocumentPayload, TranslateDocumentPayload } from "../types.js";
import { mergeTranslatePayload } from "../translation-ocr-reuse.js";

// 组装真正发给后端的 job 配置:先从已配置凭据拼出完整的 ocr(PaddleOCR)+
// translation(DeepSeek)基座(buildTranslateConfig),再把弹窗传来的页码范围
// (普通流程用 ocr.page_ranges + translation.start/end；OCR 复用流程用
// translation.page_ranges 一基数组)叠上去。
// 不带凭据的话后端收不到 provider,会默认到已废弃的 OCR provider 而失败。
export function assembleTranslatePayload(
  overrides: TranslateDocumentPayload = {},
  buildTranslateConfig?: (pageRanges?: string) => TranslateDocumentPayload | Record<string, unknown>,
): TranslateDocumentPayload {
  const pageRanges = `${overrides?.ocr?.page_ranges || ""}`.trim();
  const base = (buildTranslateConfig?.(pageRanges) || {}) as TranslateDocumentPayload;
  return mergeTranslatePayload(base, overrides);
}

export function assembleOcrPayload(
  overrides: OcrDocumentPayload = {},
  buildOcrConfig?: (pageRanges?: string) => OcrDocumentPayload | Record<string, unknown>,
): OcrDocumentPayload {
  const pageRanges = `${overrides?.ocr?.page_ranges || ""}`.trim();
  const base = (buildOcrConfig?.(pageRanges) || {}) as OcrDocumentPayload;
  return {
    ...base,
    workflow: "ocr",
    ocr: { ...(base.ocr || {}), ...(overrides.ocr || {}) },
  };
}
