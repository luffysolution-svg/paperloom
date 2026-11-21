import { buildJobsEndpoint } from "@retainpdf/api/http";
import { submitJson } from "./http.js";
import { assertKnownJobPayloadFields } from "./job-payload-contract.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertGroupedJobPayload(payload: unknown) {
  if (!isObject(payload)) {
    throw new Error("提交失败: /api/v1/jobs 需要 JSON object 请求体。");
  }
  if (!payload.workflow || !isObject(payload.source)) {
    throw new Error("提交失败: /api/v1/jobs 必须使用 grouped JSON，至少包含 workflow 和 source。");
  }
  const legacyTopLevelFields = [
    "upload_id",
    "artifact_job_id",
    "mode",
    "model",
    "base_url",
    "api_key",
    "mineru_token",
    "paddle_token",
    "model_version",
    "language",
    "render_mode",
    "skip_title_translation",
    "batch_size",
    "workers",
    "classify_batch_size",
    "compile_workers",
    "rule_profile_name",
    "custom_rules_text",
    "timeout_seconds",
    "no_output_timeout_seconds",
  ];
  const leakedLegacyFields = legacyTopLevelFields.filter((field) => field in payload);
  if (leakedLegacyFields.length > 0) {
    throw new Error(
      `提交失败: /api/v1/jobs 不再接受旧扁平字段，发现 ${leakedLegacyFields.join(", ")}。请改为 source/ocr/translation/render/runtime 分组结构。`,
    );
  }
}

function isOcrWorkflowPayload(payload: unknown) {
  return isObject(payload) && `${payload.workflow || ""}`.trim() === "ocr";
}

export async function submitJobRequest(apiPrefix: string, payload: unknown) {
  // 和真实实现一样：只做 OCR 的任务也走 POST /jobs 的 JSON，必须先上传拿到 upload_id。
  if (isOcrWorkflowPayload(payload)) {
    const source = isObject(payload) && isObject(payload.source) ? payload.source : {};
    if (!`${source.upload_id || ""}`.trim()) throw new Error("提交失败: 请先上传文件再开始 OCR。");
    return submitJson(buildJobsEndpoint(apiPrefix), payload);
  }
  assertGroupedJobPayload(payload);
  assertKnownJobPayloadFields(payload);
  return submitJson(buildJobsEndpoint(apiPrefix), payload);
}
