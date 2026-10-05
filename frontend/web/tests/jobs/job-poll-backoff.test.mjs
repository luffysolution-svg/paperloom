import test from "node:test";
import assert from "node:assert/strict";

import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import {
  JOB_POLL_INTERVAL_MS,
  JOB_POLL_MAX_INTERVAL_MS,
  createRuntimePollingStatePort,
  nextJobPollBackoffDelay,
} from "../../src/features/jobs/domain/runtime/runtime-polling-state.js";
import { mountJobRuntimeFeature } from "../../src/features/jobs/domain/runtime/controller.js";

test("失败退避：指数增长并在上限封顶", () => {
  assert.equal(JOB_POLL_INTERVAL_MS, 1000);
  assert.equal(nextJobPollBackoffDelay(0), 1000);
  assert.equal(nextJobPollBackoffDelay(1), 1000);
  assert.equal(nextJobPollBackoffDelay(2), 2000);
  assert.equal(nextJobPollBackoffDelay(3), 4000);
  assert.equal(nextJobPollBackoffDelay(4), 8000);
  assert.equal(nextJobPollBackoffDelay(5), JOB_POLL_MAX_INTERVAL_MS);
  assert.equal(nextJobPollBackoffDelay(9), JOB_POLL_MAX_INTERVAL_MS);
  assert.ok(JOB_POLL_MAX_INTERVAL_MS <= 30000);
});

function mountPollingHarness({ state, texts, intervals, cleared, fetchBehavior, documentStub }) {
  const previousDocument = global.document;
  global.document = documentStub;
  const port = createRuntimePollingStatePort(state, {
    clearIntervalFn: (timer) => cleared.push(timer),
    setIntervalFn: (callback, intervalMs) => {
      intervals.push({ callback, intervalMs });
      return `timer-${intervals.length}`;
    },
    now: () => "2026-06-16T00:00:00Z",
  });
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    fetchJobPayload: fetchBehavior.fetch,
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    setText: (id, value) => texts.push([id, value]),
    setWorkflowSections: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: { publishJobUpdated() {}, requestRefresh() {} },
    jobEventsResource: { load: async () => ({ status: "success", data: { items: [] } }) },
    pollingPort: port,
    currentJobPort: { jobId: () => "job-backoff", snapshot: () => ({}) },
    secondaryResourcePort: { cachedFor: () => null },
    renderContextPort: {
      applySnapshot: (input) => ({ job: input.payload, jobId: input.payload?.job_id }),
    },
    resetStatePort: { resetSecondary() {}, resetJob() {} },
    secondaryResourceSchedulerPort: { schedule() {} },
    shellViewPort: {
      isReaderOpen: () => false,
      setCancelDisabled() {},
      closeDialogs() {},
      resetEvents() {},
    },
    jobPresentationPort: {
      isTerminalStatus: (status) => status === "failed" || status === "canceled",
      normalizeJobPayload: (value) => value || {},
    },
  });
  return {
    feature,
    restore: () => {
      global.document = previousDocument;
    },
  };
}

function makeDocumentStub() {
  const listeners = new Map();
  return {
    stub: {
      getElementById: () => null,
      visibilityState: "visible",
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) {
        listeners.get(type)?.delete(fn);
      },
    },
    emit(type) {
      for (const fn of [...(listeners.get(type) || [])]) fn();
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("瞬态失败写横幅且退避拉长间隔；成功清错并恢复基准间隔", async () => {
  const state = createLegacyStateFixture();
  const texts = [];
  const intervals = [];
  const cleared = [];
  let shouldFail = true;
  const doc = makeDocumentStub();
  const { feature, restore } = mountPollingHarness({
    state,
    texts,
    intervals,
    cleared,
    fetchBehavior: {
      fetch: async (jobId) => {
        if (shouldFail) throw new Error("transient fetch boom");
        return { job_id: jobId, status: "running" };
      },
    },
    documentStub: doc.stub,
  });
  try {
    feature.startPolling("job-backoff");
    await flush();
    await flush();

    const errorTexts = texts.filter(([id]) => id === "error-box");
    assert.ok(errorTexts.length >= 1, "瞬态失败应写 error-box 横幅");
    assert.match(`${errorTexts.at(-1)?.[1] || ""}`, /transient fetch boom/);
    assert.deepEqual(intervals.map((item) => item.intervalMs)[0], 1000);

    // 第二次瞬态失败：间隔指数退避到 2s
    await intervals.at(-1).callback();
    await flush();
    await flush();
    assert.deepEqual(intervals.map((item) => item.intervalMs).slice(-1), [2000]);

    // 成功：清横幅并恢复基准间隔
    shouldFail = false;
    await intervals.at(-1).callback();
    await flush();
    await flush();
    assert.deepEqual(texts.at(-1), ["error-box", "-"]);
    assert.deepEqual(intervals.map((item) => item.intervalMs).slice(-1), [1000]);
  } finally {
    restore();
  }
});

test("页面不可见暂停轮询，可见恢复后补一次并重启 timer", async () => {
  const state = createLegacyStateFixture();
  const texts = [];
  const intervals = [];
  const cleared = [];
  let fetchCount = 0;
  const doc = makeDocumentStub();
  const { feature, restore } = mountPollingHarness({
    state,
    texts,
    intervals,
    cleared,
    fetchBehavior: {
      fetch: async (jobId) => {
        fetchCount += 1;
        return { job_id: jobId, status: "running" };
      },
    },
    documentStub: doc.stub,
  });
  try {
    feature.startPolling("job-backoff");
    await flush();
    await flush();
    assert.ok(doc.listenerCount("visibilitychange") >= 1, "应监听 visibilitychange");
    const timersBefore = intervals.length;

    doc.stub.visibilityState = "hidden";
    doc.emit("visibilitychange");
    assert.ok(cleared.length >= 1, "不可见应暂停（清掉在途 timer）");

    doc.stub.visibilityState = "visible";
    doc.emit("visibilitychange");
    await flush();
    await flush();
    assert.ok(intervals.length > timersBefore, "可见恢复应重启 timer");
    assert.ok(fetchCount >= 2, "可见恢复应补一次拉取");
  } finally {
    restore();
  }
});
