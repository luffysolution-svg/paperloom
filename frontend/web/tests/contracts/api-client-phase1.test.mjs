// 第 1 期换到生成函数的接口（任务、操作、报告、译文条目、阅读数据、用量）：函数名和报错文案不变，
// 这里钉住换过去以后容易走样的几处——404 兜底、提交报错的格式、页数额度、查询参数。
import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  location: { protocol: "http:", hostname: "127.0.0.1" },
  __FRONT_RUNTIME_CONFIG__: { apiBase: "http://127.0.0.1:41000", xApiKey: "phase1-key" },
};

const { fetchJobList, fetchJobPayload } = await import("@retainpdf/api/jobs");
const { fetchJobStageActions, resumeJob, retryJobStage } = await import("@retainpdf/api/jobs-actions");
const { fetchReaderRegions, fetchReaderMetadata } = await import("@retainpdf/api/reader");
const { fetchTranslationDiagnostics, fetchTranslationItems } = await import("@retainpdf/api/translation-debug");
const { fetchJobData } = await import("@retainpdf/api/job-data");
const { fetchUsageSummary } = await import("@retainpdf/api/usage");
const { submitJobRequest } = await import("@retainpdf/api/jobs-submit");
const { fetchJobEvents } = await import("@retainpdf/api/jobs-events");

function respond(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function withFetch(handler, run) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: `${url}`, init });
    return handler(`${url}`, init);
  };
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
  return calls;
}

const ok = (data) => () => respond(200, { code: 0, data });

test("任务列表：查询参数照旧，include_live_stage=false 照样发出去", async () => {
  const calls = await withFetch(ok({ items: [] }), () => fetchJobList("/api/v1", {
    limit: 5, scope: "ocr", q: "  量子 ", includeLiveStage: false, jobIds: [" a ", "", "b"],
  }));
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:41000/api/v1/jobs?limit=5&offset=0&workflow=ocr&q=%E9%87%8F%E5%AD%90&include_live_stage=false&job_ids=a%2Cb",
  );
  assert.equal(calls[0].init.headers["Content-Type"], undefined);
});

test("任务详情：404 保留 reason，别的状态码用固定文案", async () => {
  await withFetch(
    () => respond(404, { code: 40400, message: "gone", error: { code: "NOT_FOUND", details: { reason: "merged_reading_expired" } } }),
    () => assert.rejects(fetchJobPayload("job-1", { apiPrefix: "/api/v1" }), (error) => {
      assert.equal(error.message, "未找到该任务，请检查 job_id 是否正确。");
      assert.equal(error.status, 404);
      assert.equal(error.reason, "merged_reading_expired");
      return true;
    }),
  );
  await withFetch(
    () => respond(500, {}),
    () => assert.rejects(fetchJobPayload("job-1", { apiPrefix: "/api/v1" }), { message: "读取任务失败，请稍后重试。(500)" }),
  );
});

test("404 当作还没有：阶段操作 null、阅读区域空列表、元数据 null、译文列表空", async () => {
  await withFetch(() => respond(404, { code: 40400, message: "nope" }), async () => {
    assert.equal(await fetchJobStageActions("job-1", "/api/v1"), null);
    assert.deepEqual(await fetchReaderRegions("job-1", "/api/v1"), { items: [] });
    assert.equal(await fetchReaderMetadata("job-1", "/api/v1"), null);
    assert.deepEqual(await fetchTranslationItems("job-1", "/api/v1", { limit: 10 }), { items: [], total: 0, limit: 10, offset: 0 });
  });
  await withFetch(
    () => respond(503, {}),
    () => assert.rejects(fetchReaderRegions("job-1", "/api/v1"), { message: "读取阅读区域失败，请稍后重试。(503)" }),
  );
});

test("翻译报告：404 分「还没产出」和「找不到」", async () => {
  await withFetch(
    () => respond(404, { code: 40400, error: { code: "NOT_FOUND", details: { reason: "not_ready" } } }),
    () => assert.rejects(fetchTranslationDiagnostics("job-1", "/api/v1"), { message: "这个任务的翻译结果还没生成，翻译跑完后再看。" }),
  );
  await withFetch(
    () => respond(404, { code: 40400 }),
    () => assert.rejects(fetchTranslationDiagnostics("job-1", "/api/v1"), { message: "未找到翻译调试信息，请确认该任务已完成翻译。" }),
  );
});

test("提交类报错和以前 submitJson 一样：「提交失败: 状态码 message」，带 status 和 reason", async () => {
  await withFetch(
    () => respond(409, { code: 40900, message: "任务还在跑", error: { code: "CONFLICT", details: { reason: "job_active" } } }),
    () => assert.rejects(resumeJob("job-1", "/api/v1"), (error) => {
      assert.equal(error.message, "提交失败: 409 任务还在跑");
      assert.equal(error.status, 409);
      assert.equal(error.reason, "job_active");
      return true;
    }),
  );
});

test("重试阶段：只发后端认的字段，返回值补上书的信息", async () => {
  let result;
  const calls = await withFetch(ok({ job_id: "job-2" }), async () => {
    result = await retryJobStage("job-1", "/api/v1", "render", { mode: "from_stage", title: "书名", document_id: "doc-1" });
  });
  assert.equal(calls[0].url, "http://127.0.0.1:41000/api/v1/jobs/job-1/actions/retry-stage");
  assert.deepEqual(JSON.parse(calls[0].init.body), { stage: "render", mode: "from_stage" });
  assert.equal(result.job_id, "job-2");
  assert.equal(result.source_job_id, "job-1");
  assert.equal(result.title, "书名");
  assert.equal(result.document_id, "doc-1");
});

test("建任务：页数额度不够给 PageQuotaError，别的错误带上请求摘要", async () => {
  const payload = { workflow: "translate", source: { upload_id: "up-1" } };
  await withFetch(
    () => respond(402, { code: "PAGE_QUOTA_EXCEEDED", message: "页数不够了", error: { code: "PAGE_QUOTA_EXCEEDED", details: { required_pages: 12, balance: 3 } } }),
    () => assert.rejects(submitJobRequest("/api/v1", payload), (error) => {
      assert.equal(error.name, "PageQuotaError");
      assert.equal(error.message, "页数不够了");
      assert.equal(error.requiredPages, 12);
      assert.equal(error.balance, 3);
      return true;
    }),
  );
  await withFetch(
    () => respond(400, { code: 40000, message: "unknown field `foo`" }),
    () => assert.rejects(submitJobRequest("/api/v1", payload), {
      message: "提交失败: 400 unknown field `foo` [workflow=translate, source.upload_id=up-1]",
    }),
  );
});

test("任务数据集：数组筛选用逗号连接，0 和空值不发；后端的说明原样显示", async () => {
  const calls = await withFetch(ok({ available: true, items: [] }), () => fetchJobData("job-1", "/api/v1", "revisions", {
    fields: ["a", "b"], filters: { page: [1, 2], empty: "" }, groupBy: "reader_item_id", offset: 0, limit: 1000,
  }));
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:41000/api/v1/jobs/job-1/data/revisions?fields=a%2Cb&page=1%2C2&group_by=reader_item_id&limit=1000",
  );
  await withFetch(
    () => respond(400, { code: 40000, message: "字段 x 不能筛选" }),
    () => assert.rejects(fetchJobData("job-1", "/api/v1", "revisions"), { message: "字段 x 不能筛选" }),
  );
});

test("用量和事件流：报错沿用原来的文案和错误类型", async () => {
  await withFetch(
    () => respond(500, {}),
    () => assert.rejects(fetchUsageSummary("/api/v1"), { message: "读取用量失败，请稍后重试。(500)" }),
  );
  await withFetch(
    () => respond(503, { code: 50300, error: { code: "UNAVAILABLE" } }),
    () => assert.rejects(fetchJobEvents("job-1", "/api/v1", { start: "head" }), (error) => {
      assert.equal(error.name, "JobEventsError");
      assert.equal(error.status, 503);
      assert.equal(error.code, "UNAVAILABLE");
      return true;
    }),
  );
});
