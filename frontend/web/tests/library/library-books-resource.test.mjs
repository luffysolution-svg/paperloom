// 书库列表资源：分页加载、缓存键、失效，以及 refresh / command port 的事件归一化。
// 从原 recent-jobs.test.mjs 拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { APP_EVENTS } from "@/platform/contracts/app-contract.js";
import { createRecentJobsLibraryRefreshPort } from "../../src/features/library/domain/recent-jobs/library-refresh-port.js";
import {
  createRecentJobsCommandPort,
  RECENT_JOBS_COMMANDS,
} from "../../src/features/library/domain/recent-jobs/commands.js";
import {
  createLibraryBooksResource,
  invalidateLibraryBooksResource,
} from "../../src/features/library/domain/recent-jobs/library-books-resource.js";
import {
  collectRecentJobsPage,
  isPrimaryRecentJob,
} from "../../src/features/library/domain/recent-jobs/pagination.js";

test("recent jobs library refresh port normalizes app events", () => {
  const listeners = new Map();
  const calls = [];
  const target = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
  };
  const port = createRecentJobsLibraryRefreshPort({ target });
  const subscription = port.subscribe({
    onRefreshRequested: (detail) => calls.push(["refresh", detail]),
    onJobUpdated: (detail) => calls.push(["updated", detail]),
    onJobCreated: (detail) => calls.push(["created", detail]),
  });

  listeners.get(APP_EVENTS.libraryRefreshRequested)?.({ detail: { delay: "250", force: true } });
  listeners.get(APP_EVENTS.libraryJobUpdated)?.({ detail: { job: { job_id: "job-updated" } } });
  listeners.get(APP_EVENTS.libraryJobCreated)?.({ detail: { job: { job_id: "job-created" } } });

  assert.deepEqual(calls, [
    ["refresh", { delay: 250, force: true }],
    ["updated", { job: { job_id: "job-updated" } }],
    ["created", { job: { job_id: "job-created" } }],
  ]);

  subscription.destroy();
  assert.equal(listeners.size, 0);
});

test("recent jobs command port translates library mutations into app commands", async () => {
  const calls = [];
  const commandHandlers = new Map();
  const commands = {
    on(command, handler) {
      commandHandlers.set(command, handler);
      return () => commandHandlers.delete(command);
    },
    async dispatch(command, payload) {
      calls.push([command, payload]);
      return [await commandHandlers.get(command)?.(payload)];
    },
  };
  const port = createRecentJobsCommandPort({ commands });
  const received = [];
  const subscription = port.subscribe({
    onRefreshRequested: (payload) => received.push(["refresh", payload]),
    onJobUpdated: (payload) => received.push(["updated", payload]),
    onJobCreated: (payload) => received.push(["created", payload]),
  });

  await port.requestRefresh({ delay: "120", force: true });
  await port.publishJobUpdated({ job_id: "job-updated" });
  await port.publishJobCreated({ job_id: "job-created" });

  assert.deepEqual(calls, [
    [RECENT_JOBS_COMMANDS.refreshRequested, { delay: 120, force: true }],
    [RECENT_JOBS_COMMANDS.jobUpdated, { job: { job_id: "job-updated" } }],
    [RECENT_JOBS_COMMANDS.jobCreated, { job: { job_id: "job-created" } }],
  ]);
  assert.deepEqual(received, [
    ["refresh", { delay: 120, force: true }],
    ["updated", { job: { job_id: "job-updated" } }],
    ["created", { job: { job_id: "job-created" } }],
  ]);

  subscription.destroy();
  assert.equal(commandHandlers.size, 0);
});

test("library books resource owns recent jobs page loading and cache keys", async () => {
  const calls = [];
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchJobList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        invocation_summary: { total: 3 },
        items: [
          { job_id: "job-existing" },
          { job_id: "job-2" },
          { job_id: "job-3" },
        ],
      };
    },
  });

  const first = await resource.load({
    startOffset: 4,
    pageSize: 2,
    query: "density",
    existingJobIds: new Set(["job-existing"]),
  });
  const second = await resource.load({
    startOffset: 4,
    pageSize: 2,
    query: "density",
    existingJobIds: ["job-existing"],
  });

  assert.equal(first.status, "success");
  assert.deepEqual(first.data.collected.map((item) => item.job_id), ["job-2", "job-3"]);
  assert.deepEqual(first.data.latestInvocationSummary, { total: 3 });
  assert.equal(first.data.nextOffset, 7);
  assert.equal(calls.length, 1);
  assert.equal(second.status, "success");
  assert.deepEqual(second.data.collected.map((item) => item.job_id), ["job-2", "job-3"]);
});

test("recent jobs pagination renders short first library page without waiting for a full page", async () => {
  const calls = [];
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 24,
    fetchJobList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        items: [
          { job_id: "job-short-1", workflow: "book" },
          { job_id: "job-short-2", workflow: "book" },
          { job_id: "job-short-3", workflow: "book" },
        ],
      };
    },
  });

  assert.deepEqual(result.collected.map((item) => item.job_id), [
    "job-short-1",
    "job-short-2",
    "job-short-3",
  ]);
  assert.equal(result.hasMore, false);
  assert.equal(result.nextOffset, 3);
  assert.equal(calls.length, 1);
});

test("recent jobs pagination reads the jobs list and keeps standalone OCR roots", async () => {
  const calls = [];
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 24,
    fetchJobList: async (apiPrefix, params) => {
      calls.push(["jobs", apiPrefix, params]);
      return {
        items: [
          { job_id: "job-list-1", workflow: "book" },
          { job_id: "job-list-1-ocr", workflow: "ocr" },
          { job_id: "job-ocr-root", workflow: "ocr" },
          { job_id: "job-list-2", workflow: "book" },
        ],
        has_more: false,
      };
    },
  });

  assert.deepEqual(result.collected.map((item) => item.job_id), [
    "job-list-1",
    "job-ocr-root",
    "job-list-2",
  ]);
  assert.equal(isPrimaryRecentJob({ job_id: "job-ocr-root", workflow: "ocr" }), true);
  assert.equal(isPrimaryRecentJob({ job_id: "job-parent-ocr", workflow: "ocr" }), false);
  assert.equal(result.hasMore, false);
  assert.deepEqual(calls, [
    ["jobs", "/api/v1", { limit: 24, offset: 0, q: "" }],
  ]);
});

test("library books resource loads pages from the jobs list", async () => {
  const calls = [];
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchJobList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        items: [{ job_id: "job-fallback", workflow: "book" }],
      };
    },
  });

  const snapshot = await resource.load({
    startOffset: 0,
    pageSize: 1,
    query: "",
  });

  assert.equal(snapshot.status, "success");
  assert.deepEqual(snapshot.data.collected.map((item) => item.job_id), ["job-fallback"]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["/api/v1", { limit: 20, offset: 0, q: "" }]);
});

test("library books resource invalidation clears cached list pages", async () => {
  let version = 0;
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchJobList: async () => {
      version += 1;
      return {
        items: [{ job_id: `job-${version}` }],
      };
    },
  });

  const first = await resource.load({ startOffset: 0, pageSize: 1 });
  const cached = await resource.load({ startOffset: 0, pageSize: 1 });
  invalidateLibraryBooksResource(resource);
  const refreshed = await resource.load({ startOffset: 0, pageSize: 1 });

  assert.deepEqual(first.data.collected.map((item) => item.job_id), ["job-1"]);
  assert.deepEqual(cached.data.collected.map((item) => item.job_id), ["job-1"]);
  assert.deepEqual(refreshed.data.collected.map((item) => item.job_id), ["job-2"]);
});

test("library books resource invalidation helper tolerates missing resources", () => {
  assert.doesNotThrow(() => invalidateLibraryBooksResource(null));
  assert.doesNotThrow(() => invalidateLibraryBooksResource({}));
});
