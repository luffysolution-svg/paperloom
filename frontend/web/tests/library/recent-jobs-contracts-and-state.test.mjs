// 最近任务：DOM 契约、摘要视图模型、state port / store / store renderer。
// 从原 recent-jobs.test.mjs（3600+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import {
  createRecentJobsStatePort,
  createRecentJobsStore,
} from "../../src/features/library/domain/recent-jobs/state.js";
import { buildReaderUrl } from "../../src/features/library/domain/card/recent-job-card-presenter.js";
import { createRecentJobsStoreRenderer } from "../../src/features/library/domain/recent-jobs/store-renderer.js";
import {
  RECENT_JOBS_IDS,
  RECENT_JOBS_PRIVATE_KEYS,
  RECENT_JOBS_SELECTORS,
  RECENT_JOBS_TAGS,
} from "../../src/features/library/ui/recent-jobs-dom-contract.js";
import {
  buildRecentJobsSummaryViewModel,
  summarizeRecentJobsInvocationCounts,
} from "../../src/features/library/domain/recent-jobs/summary-view-model.js";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";

test("reader URL uses a real job as the canonical comparison session", () => {
  assert.equal(
    buildReaderUrl({ job_id: "job-live", document_id: "doc-stable" }),
    "./reader.html?job_id=job-live",
  );
  assert.equal(
    buildReaderUrl({ job_id: "doc:doc-stable", document_id: "doc-stable" }),
    "./reader.html?document_id=doc-stable",
  );
  assert.equal(
    buildReaderUrl({
      job_id: "doc:doc-stable",
      active_job_id: "job-active",
      document_id: "doc-stable",
    }),
    "./reader.html?job_id=job-active",
  );
  assert.equal(
    buildReaderUrl({ document_id: "doc-source-only" }),
    "./reader.html?document_id=doc-source-only",
  );
});

test("recent jobs contract centralizes host ids and private callback keys", () => {
  assert.equal(RECENT_JOBS_IDS.libraryView, "library-view");
  assert.equal(RECENT_JOBS_IDS.list, "recent-jobs-list");
  assert.equal(RECENT_JOBS_IDS.openButton, "open-query-btn");
  assert.equal(RECENT_JOBS_IDS.searchInput, "library-search-input");
  assert.equal(RECENT_JOBS_TAGS.dialog, "recent-jobs-dialog");
  assert.equal(RECENT_JOBS_TAGS.card, "recent-job-card");
  assert.equal(RECENT_JOBS_SELECTORS.libraryList, "#library-view #recent-jobs-list");
  assert.equal(RECENT_JOBS_PRIVATE_KEYS.select, "__retainPdfRecentJobSelect");
  assert.equal(RECENT_JOBS_PRIVATE_KEYS.cardBound, "__retainPdfRecentJobCardBound");
});

test("recent jobs summary view model owns invocation counts and display text", () => {
  const items = [
    { invocation: { input_protocol: "stage_spec" } },
    { invocation: { input_protocol: "unknown" } },
    { invocation: { input_protocol: "" } },
    {},
  ];

  assert.deepEqual(summarizeRecentJobsInvocationCounts(items), {
    stageSpecCount: 1,
    unknownCount: 3,
  });
  assert.deepEqual(
    buildRecentJobsSummaryViewModel({ stage_spec_count: 7, unknown_count: 2 }, items),
    {
      stageSpecCount: 7,
      unknownCount: 2,
      text: "Stage Spec 7 · Unknown 2",
    },
  );
  assert.deepEqual(
    buildRecentJobsSummaryViewModel({ stage_spec_count: 7, unknown_count: "bad" }, items),
    {
      stageSpecCount: 1,
      unknownCount: 3,
      text: "Stage Spec 1 · Unknown 3",
    },
  );
});

test("recent jobs state port normalizes pagination state", () => {
  const localState = createLegacyStateFixture();
  const port = createRecentJobsStatePort(localState);

  port.setOffset("12");
  port.setHasMore("");
  port.setItems([{ job_id: "job-1" }]);
  assert.deepEqual(port.getSnapshot(), {
    offset: 12,
    hasMore: false,
    invocationSummary: null,
    items: [{ job_id: "job-1" }],
  });

  port.setItems("not-array");
  assert.deepEqual(port.getSnapshot().items, []);

  port.prependItem({ job_id: "job-new" });
  port.prependItem({ job_id: "job-new", title: "duplicate ignored" });
  port.replaceItem({ job_id: "job-new", title: "updated" });
  port.prependItem({ job_id: "job-other-ocr" });
  assert.deepEqual(port.getSnapshot().items, [
    { job_id: "job-other-ocr" },
    { job_id: "job-new", title: "updated" },
  ]);
  port.removeJobFamily("job-other");
  assert.deepEqual(port.getSnapshot().items, [
    { job_id: "job-new", title: "updated" },
  ]);

  port.setItems([{ job_id: "job-keep" }]);
  port.setInvocationSummary({ stage_spec_count: 2 });
  port.setOffset(5);
  port.resetPagination();
  // soft reset：保留 items / summary，只清分页游标
  assert.deepEqual(port.getSnapshot(), {
    offset: 0,
    hasMore: true,
    invocationSummary: { stage_spec_count: 2 },
    items: [{ job_id: "job-keep" }],
  });
});

test("recent jobs state port exposes store subscriptions for card refresh", () => {
  const localState = createLegacyStateFixture();
  const port = createRecentJobsStatePort(localState);
  const notifications = [];
  const unsubscribe = port.subscribe((snapshot, meta) => {
    notifications.push([meta.action, snapshot.items.map((item) => item.job_id)]);
  });

  port.prependItem({ job_id: "job-live" });
  port.replaceItem({ job_id: "job-live", status: "running" });
  unsubscribe();
  port.replaceItem({ job_id: "job-live", status: "succeeded" });

  assert.deepEqual(notifications, [
    ["prependItem", ["job-live"]],
    ["replaceItem", ["job-live"]],
  ]);
});

test("recent jobs store renderer refreshes visible cards from store mutations", () => {
  const port = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const renders = [];
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: port,
    renderRecentJobsList: (payload) => {
      renders.push({
        items: payload.items.map((item) => item.job_id),
        invocationSummary: payload.invocationSummary,
        hasMore: payload.hasMore,
        reset: payload.reset,
      });
    },
    actions: {
      selectJob() {},
      deleteJob() {},
      openJobReader() {},
    },
  });

  port.prependItem({ job_id: "job-created" });
  port.replaceItem({ job_id: "job-created", status: "running" });
  port.setHasMore(false);
  renderer.unmount();
  port.replaceItem({ job_id: "job-created", status: "succeeded" });

  assert.deepEqual(renders, [
    { items: ["job-created"], invocationSummary: null, hasMore: true, reset: true },
    { items: ["job-created"], invocationSummary: null, hasMore: true, reset: true },
  ]);
});

test("recent jobs store renderer can opt into page-level store rendering", () => {
  const port = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const renders = [];
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: port,
    renderActions: ["setItems", "setHasMore"],
    renderRecentJobsList: (payload) => {
      renders.push({
        items: payload.items.map((item) => item.job_id),
        invocationSummary: payload.invocationSummary,
        hasMore: payload.hasMore,
        reset: payload.reset,
      });
    },
  });

  port.setItems([{ job_id: "job-page" }]);
  port.setHasMore(false);
  port.replaceItem({ job_id: "job-page", status: "running" });
  renderer.unmount();

  assert.deepEqual(renders, [
    { items: ["job-page"], invocationSummary: null, hasMore: true, reset: true },
    { items: ["job-page"], invocationSummary: null, hasMore: false, reset: true },
  ]);
});

test("recent jobs state port is backed by the app-framework store without legacy mirror", () => {
  const localState = createLegacyStateFixture();
  const port = createRecentJobsStatePort(localState);

  assert.equal(port.store.name, "recentJobs");

  port.setItems([{ job_id: "job-store" }]);
  port.setInvocationSummary({ stage_spec_count: 7, unknown_count: 2 });
  port.setOffset(20);
  port.setHasMore(true);

  assert.deepEqual(port.store.getSnapshot(), {
    offset: 20,
    hasMore: true,
    invocationSummary: { stage_spec_count: 7, unknown_count: 2 },
    items: [{ job_id: "job-store" }],
  });
  // 迁移完成:store 是唯一真值,旧 state 对象不再被回写
  assert.equal(localState.recentJobsOffset, 0);
  assert.equal(localState.recentJobsHasMore, true);
  assert.deepEqual(localState.recentJobsItems, []);
});

test("recent jobs state port batches pagination updates into one notification", () => {
  const localState = createLegacyStateFixture();
  const port = createRecentJobsStatePort(localState);
  const events = [];
  port.store.subscribe((snapshot, meta) => {
    events.push({ snapshot, meta });
  });

  port.batch(({ setOffset, setHasMore, setInvocationSummary, setItems }) => {
    setOffset(10);
    setHasMore(false);
    setInvocationSummary({ stage_spec_count: 1 });
    setItems([{ job_id: "job-batch" }]);
  });

  assert.deepEqual(port.getSnapshot(), {
    offset: 10,
    hasMore: false,
    invocationSummary: { stage_spec_count: 1 },
    items: [{ job_id: "job-batch" }],
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].meta.action, "setOffset");
});

test("recent jobs store can be used without the legacy global state object", () => {
  const store = createRecentJobsStore({
    offset: 3,
    hasMore: false,
    items: [{ job_id: "job-initial" }],
  });
  const actions = [];
  store.subscribe((snapshot, meta) => actions.push([meta.action, snapshot.offset]));

  store.actions.setOffset("7");
  store.actions.resetPagination();

  assert.deepEqual(store.getSnapshot(), {
    offset: 0,
    hasMore: true,
    invocationSummary: null,
    items: [{ job_id: "job-initial" }],
  });
  assert.deepEqual(actions, [
    ["setOffset", 7],
    ["resetPagination", 0],
  ]);
});
