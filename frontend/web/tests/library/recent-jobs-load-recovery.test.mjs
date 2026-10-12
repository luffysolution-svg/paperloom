import test from "node:test";
import assert from "node:assert/strict";
import { createResource } from "../../src/platform/store/resource.js";
import { createRecentJobsLoader } from "../../src/features/library/domain/recent-jobs/loader.js";
import { createRecentJobsStatePort } from "../../src/features/library/domain/recent-jobs/state.js";

globalThis.window = { setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args) };
const flush = () => new Promise((resolve) => setImmediate(resolve));
const page = (id) => ({ collected: [{ document_id: id, job_id: `job-${id}`, title: id, status: "succeeded" }], hasMore: false, nextOffset: 1, latestInvocationSummary: null });

test("disposing a stalled loader releases its outstanding load promise", async () => {
  const loader = createRecentJobsLoader({
    libraryBooksResource: createResource({ loader: () => new Promise(() => {}) }),
    recentJobsStatePort: createRecentJobsStatePort(),
    homeStatePort: { setRecentJobsLoadingState() {} },
    viewPort: { hasView: () => true, renderLoading() {} },
    storeDrivenRendering: true,
  });
  let settled = false;
  void loader.load({ reset: true }).then(() => { settled = true; });
  await flush();
  loader.dispose();
  await flush();
  assert.equal(settled, true);
  assert.equal(loader.isLoading(), false);
});

test("a stalled library load times out, retries, and rejects a late stale preview", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  let release;
  const resource = createResource({
    loader: (params) => {
      if (++calls === 1) return new Promise((resolve) => { release = () => { params.onPreview(page("stale")); resolve(page("stale")); }; });
      return page("recovered");
    },
  });
  const state = createRecentJobsStatePort();
  const loadingStates = [];
  const loader = createRecentJobsLoader({
    libraryBooksResource: resource,
    recentJobsStatePort: state,
    homeStatePort: { setRecentJobsLoadingState: (value) => loadingStates.push(value) },
    runtimePatches: { apply: (items) => items, applyExisting: (items) => items },
    recentJobActions: {}, activeRefreshLoop: () => ({ schedule() {}, stop() {} }),
    viewPort: { hasView: () => true, renderLoading() {}, setLoadMoreLoading() {} },
    storeDrivenRendering: true,
  });
  t.after(() => loader.dispose());
  const pending = loader.load({ reset: true });
  await flush();
  t.mock.timers.tick(20_000);
  await flush();
  assert.equal(loader.isLoading(), false, "the timed-out request must release the loading lock");
  assert.equal(loadingStates.at(-1), "error");
  await pending;
  release();
  await flush();
  assert.deepEqual(state.getSnapshot().items, [], "late preview from timed-out load is stale");
  t.mock.timers.tick(3_000);
  await flush();
  assert.equal(calls, 2, "retry must make a fresh request instead of sharing the stalled resource promise");
  assert.equal(state.getSnapshot().items[0].title, "recovered");
  loader.dispose();
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(calls, 2, "disposal cancels retry timers");
});
