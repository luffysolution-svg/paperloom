import test from "node:test";
import assert from "node:assert/strict";
import { fetchJobEvents, JobEventsError } from "@retainpdf/api/jobs-events";
import { createJobEventsResource, mergeJobEventsPayload } from "../../src/features/jobs/domain/runtime/job-events-resource.js";
import { eventPage } from "../helpers/job-events-fixture.mjs";
import { createSecondaryResourceSchedulerPort } from "../../src/features/jobs/domain/runtime/secondary-resources.js";
import { createSecondaryResourceStatePort } from "../../src/features/jobs/domain/runtime/secondary-resource-cache.js";
import { fetchJobEvents as fetchMockJobEvents } from "../../src/platform/api/mocks/jobs-events.js";

const events = (start, count) => Array.from({ length: count }, (_, index) => ({
  seq: start + index, ts: new Date((start + index) * 1000).toISOString(),
}));

test("10,000-event active feed initializes with exactly one tail request", async () => {
  const calls = [];
  const resource = createJobEventsResource({ fetchJobEvents: async (_id, _prefix, query) => {
    calls.push(query);
    return eventPage(events(9501, 500), { next_cursor: "10000" });
  } });
  const loaded = await resource.load({ jobId: "long-job" });
  assert.equal(loaded.status, "success");
  assert.equal(loaded.data.items.length, 500);
  assert.deepEqual(calls, [{ start: "tail", limit: 500 }]);
});

test("incremental polling drains a fixed batch, deduplicates identities and orders late events by time", async () => {
  const calls = [];
  const pages = [eventPage(events(5, 2), { next_cursor: "a" }),
    eventPage([{ seq: 6, ts: new Date(6000).toISOString() }, { seq: 7, ts: new Date(1000).toISOString() }],
      { next_cursor: "b", has_more: true }), eventPage(events(8, 1), { next_cursor: "c" })];
  const resource = createJobEventsResource({ fetchJobEvents: async (_id, _prefix, query) => {
    calls.push(query); return pages.shift();
  } });
  await resource.load({ jobId: "job" });
  const next = await resource.load({ jobId: "job" }, { cache: false });
  assert.deepEqual(next.data.items.map(item => item.seq), [7, 5, 6, 8]);
  assert.deepEqual(calls.map(query => query.cursor || query.start), ["tail", "a", "b"]);
});

test("epoch reset replaces only event history and initializes the requested mode", async () => {
  let call = 0;
  const queries = [];
  const resource = createJobEventsResource({ fetchJobEvents: async (_id, _prefix, query) => {
    queries.push(query);
    call += 1;
    if (call === 2) throw new JobEventsError("expired", 410, "EVENT_CURSOR_EXPIRED");
    return eventPage(events(call, 1), { next_cursor: `cursor-${call}` });
  } });
  await resource.load({ jobId: "job" });
  let resets = 0;
  const result = await resource.load({ jobId: "job", onReset: () => { resets += 1; } }, { cache: false });
  assert.equal(resets, 1);
  assert.deepEqual(result.data.items.map(item => item.seq), [3]);
  assert.deepEqual(queries.map(query => query.start || query.cursor), ["tail", "cursor-1", "tail"]);
});

test("terminal transition drains head once then continues from its cursor", async () => {
  const queries = [];
  const resource = createJobEventsResource({ fetchJobEvents: async (_id, _prefix, query) => {
    queries.push(query);
    return eventPage(events(1, 1), { next_cursor: `c${queries.length}`, has_more: query.start === "head" });
  } });
  await resource.load({ jobId: "job" }, { cache: false });
  await resource.load({ jobId: "job", terminal: true }, { cache: false });
  await resource.load({ jobId: "job", terminal: true }, { cache: false });
  assert.deepEqual(queries.map(query => query.start || query.cursor), ["tail", "head", "c2", "c3"]);
});

test("ordinary errors preserve events and back off without another network request", async () => {
  let now = 100;
  let calls = 0;
  const resource = createJobEventsResource({ now: () => now, fetchJobEvents: async () => {
    calls += 1;
    if (calls > 1) throw new Error("offline");
    return eventPage(events(1, 1));
  } });
  await resource.load({ jobId: "job" });
  const failed = await resource.load({ jobId: "job" }, { cache: false });
  assert.equal(failed.status, "error");
  assert.equal(failed.data.items.length, 1);
  await resource.load({ jobId: "job" }, { cache: false });
  assert.equal(calls, 2);
  now += 1000;
  await resource.load({ jobId: "job" }, { cache: false });
  assert.equal(calls, 3);
});

test("same-task in-flight requests coalesce and a canceled generation stops pagination", async () => {
  let resolve;
  let calls = 0;
  let current = true;
  const resource = createJobEventsResource({ fetchJobEvents: () => {
    calls += 1;
    return new Promise(done => { resolve = done; });
  } });
  const one = resource.load({ jobId: "job", isCurrent: () => current });
  const two = resource.load({ jobId: "job", isCurrent: () => current });
  assert.equal(calls, 1);
  current = false;
  resolve(eventPage(events(1, 1), { has_more: true }));
  const results = await Promise.all([one, two]);
  assert.equal(calls, 1);
  assert.equal(results[0].status, "error");
  assert.equal(results[0].error.name, "AbortError");
});

test("v2 identity, not feed position, drives event deduplication", () => {
  const merged = mergeJobEventsPayload(eventPage([{ seq: 1, event_id: "stable" }]),
    eventPage([{ seq: 9, event_id: "stable", message: "updated" }]));
  assert.equal(merged.items.length, 1);
  assert.equal(merged.items[0].message, "updated");
});

test("SDK rejects old response protocol and propagates structured 410", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 0, data: { items: [], offset: 0, limit: 500 } }));
    await assert.rejects(fetchJobEvents("job", "/api/v1"), { code: "EVENT_PROTOCOL_MISMATCH" });
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "EVENT_CURSOR_EXPIRED" } }), { status: 410 });
    await assert.rejects(fetchJobEvents("job", "/api/v1", { cursor: "expired" }), { status: 410, code: "EVENT_CURSOR_EXPIRED" });
    await assert.rejects(fetchJobEvents("job", "/api/v1", { offset: 0 }), { code: "INVALID_QUERY" });
  } finally { globalThis.fetch = original; }
});

test("reset fences old requests even if they settle after a new successful load", async () => {
  let resolveOld;
  let calls = 0;
  const resource = createJobEventsResource({ fetchJobEvents: async () => {
    calls += 1;
    if (calls === 1) return new Promise(resolve => { resolveOld = resolve; });
    return eventPage(events(2, 1));
  } });
  const old = resource.load({ jobId: "job" });
  resource.reset();
  await resource.load({ jobId: "job" });
  resolveOld(eventPage(events(1, 1)));
  await old;
  const snapshot = resource.getSnapshot();
  assert.equal(snapshot.status, "success");
  assert.deepEqual(snapshot.data.items.map(item => item.seq), [2]);
});

test("mock event endpoint implements tail, cursor and cross-task rejection", async () => {
  const previous = globalThis.window;
  globalThis.window = { location: { search: "?mock=parallel" } };
  try {
  const first = await fetchMockJobEvents("mock-job", "/api/v1", { limit: 1, start: "tail" });
  assert.equal(first.protocol_version, 2);
  assert.ok(first.items.length <= 1);
  assert.ok(first.items.every(item => item.event_id));
  const next = await fetchMockJobEvents("mock-job", "/api/v1", { cursor: first.next_cursor });
  assert.deepEqual(next.items, []);
  await assert.rejects(fetchMockJobEvents("different-job", "/api/v1", { cursor: first.next_cursor }), { status: 400 });
  } finally { globalThis.window = previous; }
});

test("scheduler throttles active refreshes but never loses terminal history behind an older request", async () => {
  const state = { currentJobId: "job" };
  const port = createSecondaryResourceStatePort(state);
  port.clearForOtherJob("events", "job");
  let generation = 1;
  let resolveActive;
  const queries = [];
  const scheduler = createSecondaryResourceSchedulerPort({
    state, apiPrefix: "/api/v1", secondaryResourcePort: port,
    pollingPort: { isCurrentGeneration: (_id, owner) => owner === generation },
    renderContextPort: { currentFor: () => ({}) },
    fetchJobArtifactsManifest: async () => ({}),
    fetchJobStageActions: async () => ({}),
    fetchJobEvents: async (_id, _prefix, query) => {
      queries.push(query);
      if (queries.length === 1) return new Promise(resolve => { resolveActive = resolve; });
      return eventPage(events(2, 1));
    },
  });
  scheduler.schedule({ jobId: "job", generation, terminal: false });
  generation = 2;
  scheduler.schedule({ jobId: "job", generation, terminal: true });
  await new Promise(resolve => setImmediate(resolve));
  resolveActive(eventPage(events(1, 1)));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(queries.map(query => query.start), ["tail", "head"]);
  assert.deepEqual(port.cachedFor("events", "job").items.map(item => item.seq), [2]);
  scheduler.schedule({ jobId: "job", generation, terminal: true });
  scheduler.schedule({ jobId: "job", generation, terminal: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(queries.length, 2, "no unconditional force inside the one-second interval");
});
