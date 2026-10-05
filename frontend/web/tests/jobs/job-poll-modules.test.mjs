import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPlaceholderJob,
  libraryPublishKeyOf,
  shouldPublishLibrary,
} from "../../src/features/jobs/domain/runtime/poll-placeholder.js";
import {
  createJobPresentation,
} from "../../src/features/jobs/domain/runtime/job-presentation.js";
import {
  createJobPollSession,
} from "../../src/features/jobs/domain/runtime/poll-session.js";
import {
  resolveRetryBookMeta,
} from "../../src/features/jobs/domain/runtime/retry-stage.js";

test("buildPlaceholderJob seeds queued ocr frame without seed payload", () => {
  const job = buildPlaceholderJob("job-1", "2026-01-01T00:00:00Z", null);
  assert.equal(job.job_id, "job-1");
  assert.equal(job.status, "queued");
  assert.equal(job.display_stage, "ocr");
  assert.equal(job.created_at, "2026-01-01T00:00:00Z");
  assert.equal(job.started_at, "2026-01-01T00:00:00Z");
});

test("buildPlaceholderJob forces running on retry seed and keeps progress fields", () => {
  const job = buildPlaceholderJob("job-2", "2026-01-01T00:00:00Z", {
    status: "succeeded",
    stage: "translation",
    progress: { unit: "batch", current: 2, total: 10 },
  });
  assert.equal(job.job_id, "job-2");
  assert.equal(job.status, "running");
  assert.equal(job.stage, "translation");
  assert.deepEqual(job.progress, { unit: "batch", current: 2, total: 10 });
  assert.equal(job.library_only, false);
});

test("libraryPublishKeyOf keys by job, status, and display stage", () => {
  assert.equal(
    libraryPublishKeyOf({ job_id: "job-1", status: "running", display_stage: "ocr" }),
    "job-1|running|ocr",
  );
  assert.equal(
    libraryPublishKeyOf({ job_id: "job-1", status: "running", stage: "ocr" }),
    "job-1|running|ocr",
  );
  assert.equal(libraryPublishKeyOf({}), "||");
});

test("shouldPublishLibrary always publishes full mode and only changes in silent mode", () => {
  assert.equal(shouldPublishLibrary(true, false, "k", "k"), true);
  assert.equal(shouldPublishLibrary(false, false, "k", "k"), false);
  assert.equal(shouldPublishLibrary(false, false, "k2", "k"), true);
  assert.equal(shouldPublishLibrary(false, true, "k", "k"), true);
});

test("createJobPresentation uses port overrides and falls back to defaults", () => {
  const port = createJobPresentation({
    jobPresentationPort: {
      normalizeJobPayload: (value) => ({ ...value, normalized: true }),
      isTerminalStatus: (status) => status === "done",
      isJobTerminal: (job) => job?.status === "done",
    },
  });
  assert.deepEqual(port.normalizeJobPayload({ a: 1 }), { a: 1, normalized: true });
  assert.equal(port.isTerminalStatus("done"), true);
  assert.equal(port.isJobTerminal({ status: "done" }), true);

  const fallback = createJobPresentation();
  assert.deepEqual(fallback.normalizeJobPayload(null), {});
  assert.equal(fallback.isTerminalStatus("failed"), true);
  assert.equal(fallback.isTerminalStatus("canceled"), true);
  assert.equal(fallback.isTerminalStatus("running"), false);
  assert.equal(fallback.isJobTerminal({ status: "failed" }), true);
  assert.equal(fallback.isJobTerminal("succeeded"), false);
});

test("createJobPollSession starts in full publish, zero failure state", () => {
  assert.deepEqual(createJobPollSession(), {
    publishLibrary: true,
    lastLibraryPublishKey: "",
    failureCount: 0,
    errorVisible: false,
    recovering: false,
  });
});

test("resolveRetryBookMeta falls back job -> raw_response -> snapshot", () => {
  const meta = resolveRetryBookMeta({
    document_id: "",
    job: {
      title: "封面标题",
      page_count: 12,
      raw_response: {
        document_id: "doc-9",
        cover_url: "cover.png",
        display_name: "原始书名",
      },
    },
  });
  assert.equal(meta.document_id, "doc-9");
  assert.equal(meta.title, "封面标题");
  assert.equal(meta.display_name, "原始书名");
  assert.equal(meta.cover_url, "cover.png");
  assert.equal(meta.page_count, 12);

  const fromTop = resolveRetryBookMeta({
    document_id: "doc-top",
    title: "顶层",
    thumbnail_url: "thumb.png",
  });
  assert.equal(fromTop.document_id, "doc-top");
  assert.equal(fromTop.title, "顶层");
  assert.equal(fromTop.thumbnail_url, "thumb.png");
});
