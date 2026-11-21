// 状态详情 · 失败日志与 OCR 歧义恢复：诊断汇总隐藏密钥、回执请求、接受风险后切新任务、409 刷新诊断。
// 从原 status-detail.test.mjs（1500+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { buildFailureLogText } from "../../src/features/job-detail/domain/snapshot/snapshot.js";
import {
  buildOcrAmbiguityRequest,
  ocrRecoveryJobId,
  readOcrAmbiguityView,
  requiresOcrAmbiguityResolution,
  resolveOcrAmbiguityRecovery,
} from "../../src/features/job-detail/domain/ocr-ambiguity-recovery.js";

global.window ||= {};
global.window.location ||= {
  protocol: "http:",
  origin: "http://localhost",
  pathname: "/",
};

const OCR_AMBIGUITY_DESCRIPTOR = {
  status: "ambiguous",
  provider: "mineru",
  operation: "apply_upload_url",
  resolution_revision: 4,
  allowed_resolutions: ["bind_existing_receipt", "accept_duplicate_risk"],
  receipt_fields: [
    { name: "batch_id", label: "Batch ID", required: true, secret: false },
    { name: "upload_url", label: "Upload URL", required: true, secret: true },
    { name: "trace_id", label: "Trace ID", required: false, secret: false },
  ],
};

test("failure log:汇总诊断字段、保留日志并隐藏密钥", () => {
  const logText = buildFailureLogText({
    job_id: "job-log-1",
    status: "failed",
    request_payload: {
      translation: { api_key: "must-never-be-copied" },
    },
    diagnostics: {
      failed_stage: "translation",
      failure_code: "PROVIDER_RATE_LIMIT",
      trace_id: "trace-log-1",
      summary: "翻译服务限流",
      raw_exception_message: "Authorization: Bearer live-secret-token",
      traceback: "RuntimeError: api_key=inline-secret",
    },
    log_tail: ["retry 2/3", "access_token=tail-secret"],
  });

  assert.match(logText, /Job ID: job-log-1/);
  assert.match(logText, /阶段: translation/);
  assert.match(logText, /错误码: PROVIDER_RATE_LIMIT/);
  assert.match(logText, /Trace ID: trace-log-1/);
  assert.match(logText, /retry 2\/3/);
  assert.match(logText, /\[REDACTED\]/);
  assert.doesNotMatch(logText, /must-never-be-copied/);
  assert.doesNotMatch(logText, /live-secret-token|inline-secret|tail-secret/);
});

test("OCR ambiguity recovery:识别 diagnostics 契约并生成最小回执请求", () => {
  assert.equal(requiresOcrAmbiguityResolution({
    job: { failure: { failure_code: "ocr_request_ambiguous" } },
  }), true);
  assert.equal(requiresOcrAmbiguityResolution({
    failure: { category: "OCR_REQUEST_AMBIGUOUS" },
  }), true);
  assert.equal(requiresOcrAmbiguityResolution({
    failure: { category: "provider_timeout" },
  }), false);
  assert.equal(ocrRecoveryJobId({
    data: { submission: { job_id: "ocr-recovery-2" } },
  }), "ocr-recovery-2");
  assert.deepEqual(readOcrAmbiguityView({
    diagnostics: { ocr_ambiguity: OCR_AMBIGUITY_DESCRIPTOR },
  }), OCR_AMBIGUITY_DESCRIPTOR);
  assert.deepEqual(buildOcrAmbiguityRequest(
    OCR_AMBIGUITY_DESCRIPTOR,
    "bind_existing_receipt",
    {
      batch_id: " batch-1 ",
      upload_url: " https://signed.example/upload ",
      trace_id: "",
      task_id: "must-not-be-sent",
    },
  ), {
    resolution: "bind_existing_receipt",
    resolution_revision: 4,
    batch_id: "batch-1",
    upload_url: "https://signed.example/upload",
  });
  assert.throws(
    () => buildOcrAmbiguityRequest(OCR_AMBIGUITY_DESCRIPTOR, "bind_existing_receipt", {}),
    /Batch ID/,
  );
});

test("OCR ambiguity recovery:显式接受重复风险后切换到新任务轮询", async () => {
  const calls = [];
  const pending = [];
  const statuses = [];
  const result = await resolveOcrAmbiguityRecovery({
    job: { job_id: "ocr-source-1" },
    descriptor: OCR_AMBIGUITY_DESCRIPTOR,
    resolution: "accept_duplicate_risk",
    apiPrefix: "/api/v1",
    resolveOcrAmbiguity: async (jobId, apiPrefix, request) => {
      calls.push([jobId, apiPrefix, request]);
      return { submission: { job_id: "ocr-recovery-1" } };
    },
    startPolling: (jobId) => calls.push(["poll", jobId]),
    closeDialog: () => calls.push(["close"]),
    setPending: (value) => pending.push(value),
    setStatus: (value) => statuses.push(value),
    setGlobalError: (value) => calls.push(["error", value]),
  });

  assert.deepEqual(result, { ok: true, conflict: false });
  assert.deepEqual(calls, [
    ["ocr-source-1", "/api/v1", {
      resolution: "accept_duplicate_risk",
      resolution_revision: 4,
    }],
    ["close"],
    ["error", ""],
    ["poll", "ocr-recovery-1"],
  ]);
  assert.deepEqual(pending, [true, false]);
  assert.deepEqual(statuses, ["正在创建新的 OCR 恢复任务…"]);
});

test("OCR ambiguity recovery:409 时刷新诊断且不启动旧恢复任务", async () => {
  const calls = [];
  const statuses = [];
  const conflict = new Error("revision stale");
  conflict.status = 409;
  const result = await resolveOcrAmbiguityRecovery({
    job: { job_id: "ocr-source-failed" },
    descriptor: OCR_AMBIGUITY_DESCRIPTOR,
    resolution: "bind_existing_receipt",
    values: {
      batch_id: "batch-2",
      upload_url: "https://signed.example/2",
    },
    resolveOcrAmbiguity: async () => {
      throw conflict;
    },
    refreshDiagnostics: async () => calls.push("refresh"),
    closeDialog: () => calls.push("close"),
    startPolling: () => calls.push("poll"),
    setStatus: (value) => statuses.push(value),
  });

  assert.deepEqual(result, { ok: false, conflict: true });
  assert.deepEqual(calls, ["refresh"]);
  assert.match(statuses.at(-1), /状态已变化/);
});
