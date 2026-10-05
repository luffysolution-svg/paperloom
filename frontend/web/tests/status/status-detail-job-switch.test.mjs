import test from "node:test";
import assert from "node:assert/strict";

import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import * as currentJobStateModule from "../../src/features/jobs/domain/runtime/current-job-state.js";
import { createSecondaryResourceStatePort } from "../../src/features/jobs/domain/runtime/secondary-resource-cache.js";
import { createJobRenderContextPort } from "../../src/features/jobs/domain/runtime/render-context.js";
import { createStatusDetailRuntimePort } from "../../src/features/job-detail/domain/status-detail-runtime-port.js";
import {
  createTranslationState,
  resetTranslationState,
} from "../../src/features/job-detail/domain/dialog/translation-state.js";
import { createStatusDetailTranslationDataPort } from "../../src/features/job-detail/domain/dialog/translation-data-port.js";
import { createStatusDetailOverviewCoordinator } from "../../src/features/job-detail/domain/dialog/overview-coordinator.js";

// 切任务回归：A 加载中切 B，A 的迟到响应不得覆盖 B（token 丢弃）。
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeTranslationPort({ state, current, fetch }) {
  return createStatusDetailTranslationDataPort({
    translationState: state,
    apiPrefix: "/api/v1",
    currentJobId: () => current.value,
    fetchTranslationDiagnostics: fetch.diagnostics,
    fetchTranslationItems: fetch.items,
    fetchTranslationItem: fetch.item,
    replayTranslationItem: async () => ({}),
  });
}

test("translation diagnostics：A 加载中切 B，A 的迟到 summary/items 不得覆盖 B", async () => {
  const state = createTranslationState();
  const current = { value: "job-a" };
  const gateSummaryA = deferred();
  const gateItemsA = deferred();
  const port = makeTranslationPort({
    state,
    current,
    fetch: {
      diagnostics: async (jobId) => {
        if (jobId === "job-a") {
          return gateSummaryA.promise;
        }
        return { marker: "summary-b" };
      },
      items: async (jobId) => {
        if (jobId === "job-a") {
          return gateItemsA.promise;
        }
        return { total: 1, items: [{ item_id: "b-1" }] };
      },
      item: async (_jobId, itemId) => ({ item_id: itemId }),
    },
  });

  const pendingA = port.loadSummaryAndItems({ selectFirst: true });
  await new Promise((resolve) => setImmediate(resolve));
  current.value = "job-b";
  const selectionB = await port.loadSummaryAndItems({ selectFirst: true });
  assert.equal(selectionB.jobId, "job-b");
  assert.equal(selectionB.selectedItemId, "b-1");

  gateSummaryA.resolve({ marker: "summary-a" });
  gateItemsA.resolve({ total: 1, items: [{ item_id: "a-1" }] });
  await pendingA;

  assert.deepEqual(state.summary, { marker: "summary-b" });
  assert.equal(state.list.length, 1);
  assert.equal(state.list[0].item_id, "b-1");
  assert.equal(state.selectedItemId, "b-1");
});

test("translation item：A 的明细迟到响应不得覆盖已切到 B 的选中项", async () => {
  const state = createTranslationState();
  state.jobId = "job-b";
  state.selectedItemId = "b-1";
  state.selectedItem = { item_id: "b-1", tag: "fresh-b" };
  const current = { value: "job-a" };
  const gateItemA = deferred();
  const port = makeTranslationPort({
    state,
    current,
    fetch: {
      diagnostics: async () => ({}),
      items: async () => ({ total: 0, items: [] }),
      item: async (jobId, itemId) => {
        if (jobId === "job-a") {
          return gateItemA.promise;
        }
        return { item_id: itemId, tag: "fresh-b" };
      },
    },
  });

  const pendingA = port.loadItem("job-a", "a-1");
  current.value = "job-b";
  await port.loadItem("job-b", "b-1");
  gateItemA.resolve({ item_id: "a-1", tag: "stale-a" });
  await pendingA;

  assert.equal(state.selectedItemId, "b-1");
  assert.deepEqual(state.selectedItem, { item_id: "b-1", tag: "fresh-b" });
});

test("translation reset：切任务同时重置 query 过滤器与 offset", async () => {
  const state = createTranslationState();
  const current = { value: "job-a" };
  const port = makeTranslationPort({
    state,
    current,
    fetch: {
      diagnostics: async () => ({}),
      items: async () => ({ total: 0, items: [] }),
      item: async () => ({}),
    },
  });

  // 先绑定 A 再设过滤/翻页：切到 B 时 A 的残留不得继承。
  assert.equal(port.syncJob(), "job-a");
  port.applyQuery({ finalStatus: "failed", q: "term" });
  assert.equal(port.changePage("next"), true);
  assert.equal(state.query.offset, 20);

  current.value = "job-b";
  assert.equal(port.syncJob(), "job-b");
  assert.equal(state.jobId, "job-b");
  assert.equal(state.query.finalStatus, "");
  assert.equal(state.query.q, "");
  assert.equal(state.query.offset, 0);

  const fresh = createTranslationState();
  fresh.query.finalStatus = "failed";
  fresh.query.q = "term";
  fresh.query.offset = 40;
  resetTranslationState(fresh, "job-c");
  assert.equal(fresh.query.finalStatus, "");
  assert.equal(fresh.query.q, "");
  assert.equal(fresh.query.offset, 0);
});

test("overview coordinator：切任务后不复用旧任务的 in-flight refresh", async () => {
  const state = createLegacyStateFixture();
  const runtimePort = createStatusDetailRuntimePort({
    currentJobPort: currentJobStateModule.createCurrentJobStatePort(state),
    secondaryResourcePort: createSecondaryResourceStatePort(state),
    renderContextPort: createJobRenderContextPort(state),
  });
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-a",
    status: "running",
  }, "job-a");
  const gateA = deferred();
  let fetchCount = 0;
  const seenJobs = [];
  const renders = [];
  const coordinator = createStatusDetailOverviewCoordinator({
    runtimePort,
    fetchJobPayload: (jobId) => {
      fetchCount += 1;
      seenJobs.push(jobId);
      if (jobId === "job-a") {
        return gateA.promise;
      }
      return Promise.resolve({ job_id: "job-b", status: "succeeded" });
    },
    renderOverviewSnapshot() {},
    renderJob: (context) => renders.push(context),
  });

  const pendingA = coordinator.ensureLoaded();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);

  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-b",
    status: "running",
  }, "job-b");
  const pendingB = coordinator.ensureLoaded();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 2);
  assert.deepEqual(seenJobs, ["job-a", "job-b"]);

  gateA.resolve({ job_id: "job-a", status: "succeeded" });
  await Promise.all([pendingA, pendingB]);

  assert.equal(renders.length, 1);
  assert.equal(renders[0].job.job_id, "job-b");
});
