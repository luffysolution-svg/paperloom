import test from "node:test";
import assert from "node:assert/strict";

import { resolveReadingJobId } from "../../src/features/reader/domain/resolve-reading-target.ts";

const MERGED = `merged-${"a".repeat(64)}-0123456789abcdef`;

test("打开一本书：用后端给的任务（多次范围翻译时是合并结果），不用 active_job_id", async () => {
  const asked = [];
  const jobId = await resolveReadingJobId(
    { jobId: "job-latest-range", documentId: "doc-1", anchor: null },
    async (documentId) => {
      asked.push(documentId);
      return { job_id: MERGED };
    },
  );
  assert.equal(jobId, MERGED);
  assert.deepEqual(asked, ["doc-1"]);
});

test("只有 documentId（馆藏入口）：后端有译文就打开译文", async () => {
  const jobId = await resolveReadingJobId(
    { jobId: "", documentId: "doc-1", anchor: null },
    async () => ({ job_id: "job-whole" }),
  );
  assert.equal(jobId, "job-whole");
});

test("后端说没有译文：退回调用方给的（为空就读原文）", async () => {
  assert.equal(
    await resolveReadingJobId({ jobId: "job-x", documentId: "doc-1", anchor: null }, async () => ({ job_id: null })),
    "job-x",
  );
  assert.equal(
    await resolveReadingJobId({ jobId: "", documentId: "doc-1", anchor: null }, async () => ({ job_id: null })),
    "",
  );
});

test("带锚点的跳转不换任务：锚点的页号和块 id 属于调用方给的那个任务", async () => {
  let asked = false;
  const jobId = await resolveReadingJobId(
    { jobId: "job-x", documentId: "doc-1", anchor: { pageIdx: 7, blockId: "p008-b003" } },
    async () => {
      asked = true;
      return { job_id: MERGED };
    },
  );
  assert.equal(jobId, "job-x");
  assert.equal(asked, false, "带锚点时不该去问");
});

test("接口失败不挡住打开：退回调用方给的", async () => {
  const jobId = await resolveReadingJobId(
    { jobId: "job-x", documentId: "doc-1", anchor: null },
    async () => {
      throw new Error("503");
    },
  );
  assert.equal(jobId, "job-x");
});

test("没有 documentId：没法问，用调用方给的", async () => {
  let asked = false;
  const jobId = await resolveReadingJobId({ jobId: "job-x", documentId: "", anchor: null }, async () => {
    asked = true;
    return { job_id: MERGED };
  });
  assert.equal(jobId, "job-x");
  assert.equal(asked, false);
});

test("点名打开某个任务（pinJob）不换：OCR「查看」、实时译文要的就是那个任务", async () => {
  let asked = false;
  const jobId = await resolveReadingJobId(
    { jobId: "job-ocr-1", documentId: "doc-1", anchor: null, pinJob: true },
    async () => {
      asked = true;
      return { job_id: "job-translate-old" };
    },
  );
  assert.equal(jobId, "job-ocr-1", "点名的任务被换成了整本最新译文");
  assert.equal(asked, false, "点名任务时不该去问后端");
});

test("pinJob 但调用方没给 job_id：照常按整本挑（不能因此读不到译文）", async () => {
  const jobId = await resolveReadingJobId(
    { jobId: "", documentId: "doc-1", anchor: null, pinJob: true },
    async () => ({ job_id: "job-whole" }),
  );
  assert.equal(jobId, "job-whole");
});
