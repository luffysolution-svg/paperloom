import test from "node:test";
import assert from "node:assert/strict";

const {
  DOCUMENT_JOBS_REFRESH_INTERVAL_MS,
  documentIdOf,
  documentJobPresentation,
  isDocumentJobActive,
  isDocumentJobTerminal,
  jobIdOf,
  mergeRuntimeDocumentJob,
  runtimeDocumentJob,
  selectLatestDocumentJob,
  selectNewlySucceededJobs,
  upsertDocumentJob,
  workflowCategory,
} = await import("../../src/features/book-detail/domain/document-jobs-model.js");

test("document-jobs-model：job/document 标识解析带 trim 与回退", () => {
  assert.equal(jobIdOf({ job_id: " job-1 " }), "job-1");
  assert.equal(jobIdOf({ id: "job-2" }), "job-2");
  assert.equal(jobIdOf(null), "");
  assert.equal(documentIdOf({ document_id: "doc-1" }), "doc-1");
  assert.equal(documentIdOf({ id: "doc-2" }), "doc-2");
  assert.equal(documentIdOf(undefined), "");
});

test("document-jobs-model：状态判定只看归一化后的 status", () => {
  assert.equal(isDocumentJobActive({ status: " RUNNING " }), true);
  assert.equal(isDocumentJobActive({ status: "succeeded" }), false);
  assert.equal(isDocumentJobTerminal({ status: "Canceled" }), true);
  assert.equal(isDocumentJobTerminal({ status: "running" }), false);
  assert.equal(isDocumentJobTerminal(null), false);
});

test("document-jobs-model：工作流归类把 book/translate/render 归为 translation", () => {
  assert.equal(workflowCategory({ workflow: "ocr" }), "ocr");
  assert.equal(workflowCategory({ job_type: "translate" }), "translation");
  assert.equal(workflowCategory({ workflow: "render" }), "translation");
  assert.equal(workflowCategory({ workflow: "book" }), "translation");
  assert.equal(workflowCategory({ workflow: "other" }), "other");
  assert.equal(workflowCategory(null), "");
});

test("document-jobs-model：展示文案覆盖各终态与 idle 回退", () => {
  assert.deepEqual(documentJobPresentation(null), { label: "尚未开始", tone: "muted" });
  assert.deepEqual(documentJobPresentation(null, "尚未执行"), { label: "尚未执行", tone: "muted" });
  assert.deepEqual(documentJobPresentation({ status: "running" }), { label: "处理中", tone: "active" });
  assert.deepEqual(documentJobPresentation({ status: "succeeded" }), { label: "已完成", tone: "done" });
  assert.deepEqual(documentJobPresentation({ status: "failed" }), { label: "失败", tone: "failed" });
  assert.deepEqual(documentJobPresentation({ status: "cancelled" }), { label: "已取消", tone: "muted" });
  assert.deepEqual(documentJobPresentation({ status: "weird" }), { label: "weird", tone: "muted" });
});

test("document-jobs-model：runtimeDocumentJob 归一化 job_id/workflow/status", () => {
  assert.equal(runtimeDocumentJob({ jobId: "", snapshot: null }), null);
  const job = runtimeDocumentJob({
    jobId: "job-runtime",
    snapshot: { job_id: "ignored", job_type: "book", status: "running", progress: { percent: 10 } },
  });
  assert.equal(job.job_id, "job-runtime");
  assert.equal(job.workflow, "book");
  assert.equal(job.status, "running");
  assert.equal(job.progress.percent, 10);
});

test("document-jobs-model：selectNewlySucceededJobs 只发布一次未知->成功转换", () => {
  const statusById = new Map([["job-old", "running"]]);
  const jobs = [
    { job_id: "job-old", status: "succeeded" },
    { job_id: "job-new", status: "succeeded" },
    { job_id: "job-untracked", status: "running" },
  ];
  const first = selectNewlySucceededJobs({
    jobs,
    statusById,
    isOptimisticJobId: (id) => id === "job-new",
  });
  assert.deepEqual(first.map((job) => job.job_id), ["job-old", "job-new"]);

  // 同样输入再跑一次：不应重复发布。
  const second = selectNewlySucceededJobs({ jobs, statusById });
  assert.deepEqual(second, []);
  assert.equal(statusById.get("job-old"), "succeeded");
});

test("document-jobs-model：selectNewlySucceededJobs 清理已消失的 job 观察项", () => {
  const statusById = new Map([["job-gone", "succeeded"], ["job-keep", "running"]]);
  selectNewlySucceededJobs({
    jobs: [{ job_id: "job-keep", status: "running" }],
    statusById,
  });
  assert.equal(statusById.has("job-gone"), false);
  assert.equal(statusById.get("job-keep"), "running");
});

test("document-jobs-model：upsert/merge/latest 组合保持任务身份与最新提交", () => {
  const queued = upsertDocumentJob([], {
    job_id: "job-sync",
    workflow: "translate",
    status: "queued",
  }, "doc-sync");
  const runtime = runtimeDocumentJob({
    jobId: "job-sync",
    snapshot: { job_id: "job-sync", workflow: "book", status: "running" },
  });
  const merged = mergeRuntimeDocumentJob(queued, runtime, "doc-sync");
  assert.equal(merged.length, 1);
  assert.equal(merged[0].workflow, "book", "book/translate 同类，runtime 兼容字段可覆盖");
  assert.equal(merged[0].status, "running");

  // 跨类身份（OCR -> 翻译）不可被 runtime 兼容字段改写。
  const [ocrJob] = upsertDocumentJob(
    [{ job_id: "job-ocr", document_id: "doc-ocr", workflow: "ocr", status: "queued" }],
    { job_id: "job-ocr", workflow: "book", status: "succeeded" },
    "doc-ocr",
  );
  assert.equal(ocrJob.workflow, "ocr");
  assert.equal(ocrJob.status, "succeeded");

  const latest = selectLatestDocumentJob([
    { job_id: "job-a", status: "failed", created_at: "2026-09-01T00:00:00Z" },
    { job_id: "job-b", status: "running", created_at: "2026-09-02T00:00:00Z" },
  ], (job) => job.status !== "succeeded");
  assert.equal(latest.job_id, "job-b");
  assert.equal(typeof DOCUMENT_JOBS_REFRESH_INTERVAL_MS, "number");
});
