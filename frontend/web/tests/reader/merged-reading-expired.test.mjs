import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { waitFor } from "../helpers/async.mjs";

// 合并阅读的虚拟编号 merged-<书>-<指纹> 对应的目录超过一天没人读会被后端清理，
// 拿着旧编号的阅读器得到 404 + reason=merged_reading_expired。阅读器按书号重新问阅读入口，
// 换成新编号重开；入口说没有可读译文就退回读原文。

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/reader.html",
  pretendToBeVisual: true,
});
for (const key of ["window", "document", "history", "HTMLElement", "Event", "Node"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], writable: true, configurable: true });
}
globalThis.dispatchEvent = dom.window.dispatchEvent.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { setReaderAdapters } = await import("../../../../frontend/packages/reader/src/adapters.ts");
const { useReaderSession } = await import("../../../../frontend/packages/reader/src/hooks/use-reader-session.ts");
const { expiredMergedReadingDocumentId } = await import("../../../../frontend/packages/reader/src/hooks/reader-session/session-load-plan.ts");
const { readerUrlAfterExpiredMerge, reopenExpiredMergedReading } = await import(
  "../../../../frontend/packages/reader/src/hooks/reader-session/merged-reading-recovery.ts"
);

const BOOK = "a".repeat(64);
const EXPIRED = `merged-${BOOK}-0123456789abcdef`;
const FRESH = `merged-${BOOK}-fedcba9876543210`;

test("只认 404 + merged_reading_expired + merged-<64 位十六进制>-<指纹> 的编号", () => {
  const base = { status: 404, reason: "merged_reading_expired", sessionJobId: EXPIRED };
  assert.equal(expiredMergedReadingDocumentId(base), BOOK);
  assert.equal(expiredMergedReadingDocumentId({ ...base, reason: "" }), "", "不带 reason 的 404：任务真没了");
  assert.equal(expiredMergedReadingDocumentId({ ...base, reason: "not_ready" }), "");
  assert.equal(expiredMergedReadingDocumentId({ ...base, status: 500 }), "");
  assert.equal(expiredMergedReadingDocumentId({ ...base, sessionJobId: "job-1" }), "", "普通任务不走这条");
  assert.equal(expiredMergedReadingDocumentId({ ...base, sessionJobId: "merged-abc-0123" }), "", "书号不是 64 位十六进制");
});

test("换编号只动 job_id / document_id，页码和块锚点留着", () => {
  const href = `http://localhost/reader.html?job_id=${EXPIRED}&page_idx=3&block_id=b-7`;
  const next = new URL(readerUrlAfterExpiredMerge(href, BOOK, FRESH));
  assert.equal(next.searchParams.get("job_id"), FRESH);
  assert.equal(next.searchParams.get("page_idx"), "3");
  assert.equal(next.searchParams.get("block_id"), "b-7");
  const source = new URL(readerUrlAfterExpiredMerge(href, BOOK, null));
  assert.equal(source.searchParams.has("job_id"), false, "没有可读译文：去掉 job_id");
  assert.equal(source.searchParams.get("document_id"), BOOK, "按书读原文");
  assert.equal(source.searchParams.get("page_idx"), "3");
});

test("入口问不到、或者又给回同一个过期编号：不跳，交给调用方报错", async () => {
  const replaced = [];
  const location = { href: `http://localhost/reader.html?job_id=${EXPIRED}`, replace: (url) => replaced.push(url) };
  const failing = async () => { throw new Error("HTTP 500"); };
  assert.equal(await reopenExpiredMergedReading({
    apiPrefix: "/api/v1", documentId: BOOK, expiredJobId: EXPIRED, fetchReading: failing, location,
  }), false);
  const same = async () => ({ job_id: EXPIRED });
  assert.equal(await reopenExpiredMergedReading({
    apiPrefix: "/api/v1", documentId: BOOK, expiredJobId: EXPIRED, fetchReading: same, location,
  }), false, "防止来回刷新");
  assert.deepEqual(replaced, []);
});

test("阅读器拿到过期的合并编号：问 /documents/:id/reading，换成新编号重开", async () => {
  const replaced = [];
  const requests = [];
  const originalFetch = globalThis.fetch;
  const originalLocation = globalThis.location;
  Object.defineProperty(globalThis, "location", {
    value: {
      href: `http://localhost/reader.html?job_id=${EXPIRED}&page_idx=2`,
      replace: (url) => replaced.push(url),
    },
    writable: true,
    configurable: true,
  });
  globalThis.fetch = async (url) => {
    requests.push(new URL(`${url}`, "http://localhost").pathname);
    return new Response(JSON.stringify({ code: 0, message: "ok", data: { job_id: FRESH, merged: true, contributing_job_ids: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  setReaderAdapters({
    apiPrefix: "/api/v1",
    isMockMode: () => false,
    resolveResourceUrl: (url) => url,
    resolveReaderJobId: () => EXPIRED,
    resolveReaderDocumentId: () => "",
    resolveReaderSourcePdf: () => "",
    resolveReaderTranslatedPdfUrl: () => "",
    resolveReaderArtifactUrl: () => "",
    fetchDocumentByJobId: async () => null,
    defaultReaderPageConfigPort: { messageTargetOrigin: () => "*" },
    defaultReaderDataPort: {
      fetchProtected: async () => { throw new Error("不该下载 PDF"); },
      loadReaderPayload: async () => {
        throw Object.assign(new Error("未找到该任务，请检查 job_id 是否正确。"), {
          status: 404,
          reason: "merged_reading_expired",
        });
      },
    },
  });

  const sessions = [];
  function HookHost() {
    const session = useReaderSession();
    React.useEffect(() => { sessions.push(session); }, [session]);
    return null;
  }
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(React.createElement(HookHost));
    await waitFor(() => replaced.length > 0, "换成新编号重开");
    assert.deepEqual(requests, [`/api/v1/documents/${BOOK}/reading`]);
    const next = new URL(replaced[0]);
    assert.equal(next.searchParams.get("job_id"), FRESH);
    assert.equal(next.searchParams.get("page_idx"), "2");
    assert.ok(
      !sessions.some((session) => session.boot?.failed === true),
      "换编号之前不该先亮出加载失败",
    );
  } finally {
    root.unmount();
    host.remove();
    setReaderAdapters(null);
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "location", { value: originalLocation, writable: true, configurable: true });
  }
});

test("读任务 404 时把 error.details.reason 挂到错误上（阅读器靠它认出合并阅读过期）", async () => {
  const { fetchJobPayload } = await import("@retainpdf/api/jobs");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(JSON.stringify({
    code: 404,
    message: `job not found: ${EXPIRED}`,
    error: { code: "NOT_FOUND", details: url.includes("merged-") ? { reason: "merged_reading_expired" } : {} },
  }), { status: 404, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(fetchJobPayload(EXPIRED, { apiPrefix: "/api/v1" }), (error) => {
      assert.equal(error.status, 404);
      assert.equal(error.reason, "merged_reading_expired");
      assert.match(error.message, /未找到该任务/, "给人看的文案不变");
      return true;
    });
    await assert.rejects(fetchJobPayload("no-such-job", { apiPrefix: "/api/v1" }), (error) => {
      assert.equal(error.status, 404);
      assert.equal(error.reason, undefined, "真不存在的任务不带 reason");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
