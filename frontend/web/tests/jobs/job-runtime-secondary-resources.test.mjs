// 任务运行时 · 次级资源：事件资源缓存、次级刷新与调度、代际（generation）防陈旧。
// 从原 job-runtime.test.mjs（1700+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { eventPage } from "../helpers/job-events-fixture.mjs";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import * as currentJobStateModule from "../../src/features/jobs/domain/runtime/current-job-state.js";
import { syncCurrentJobSnapshot } from "../../src/features/jobs/domain/runtime/current-job-state.js";
import * as runtimePollingStateModule from "../../src/features/jobs/domain/runtime/runtime-polling-state.js";
import { createJobEventsResource } from "../../src/features/jobs/domain/runtime/job-events-resource.js";
import { mountJobRuntimeFeature } from "../../src/features/jobs/domain/runtime/controller.js";
import {
  createSecondaryResourceSchedulerPort,
  scheduleSecondaryResourceFetches,
} from "../../src/features/jobs/domain/runtime/secondary-resources.js";
import { isTerminalStatus } from "@retainpdf/domain/job";
import { normalizeJobPayload } from "@retainpdf/domain/job";
import { buildJobPatchWithDisplayState } from "@retainpdf/domain/job-status";

// 这里原先直接用 js/state 的全局单例当夹具（secondaryResourceCache 只是往传入
// 对象上读写，并不要求它是那个单例）。改用测试自持的同形夹具，好让生产代码
// 删掉那 6 片死 slice。
const state = createLegacyStateFixture();

test("job events resource caches by job and switches terminal jobs to full history", async () => {
  const calls = [];
  const resource = createJobEventsResource({
    apiPrefix: "/api/v1",
    fetchJobEvents: async (jobId, _apiPrefix, query) => {
      calls.push({ jobId, ...query });
      if (jobId === "terminal" && query.start === "head") {
        return eventPage(Array.from({ length: 500 }, (_, index) => ({ seq: index + 1 })),
          { has_more: true, next_cursor: "terminal-first" });
      }
      return eventPage([{ seq: query.cursor ? 501 : 1 }], { next_cursor: "complete" });
    },
  });
  const first = await resource.load({ jobId: "active" });
  const cached = await resource.load({ jobId: "active" });
  const terminal = await resource.load({ jobId: "terminal", terminal: true });
  assert.equal(first.status, "success");
  assert.equal(cached.status, "success");
  assert.equal(terminal.status, "success");
  assert.deepEqual(calls, [
    { jobId: "active", limit: 500, start: "tail" },
    { jobId: "terminal", limit: 500, start: "head" },
    { jobId: "terminal", limit: 500, cursor: "terminal-first", signal: undefined },
  ]);
  assert.equal(terminal.data.items.length, 501);
});

test("secondary event refresh consumes the injected job events resource", async () => {
  const runtimeState = createLegacyStateFixture();
  const jobId = "job-secondary-resource";
  const job = {
    job_id: jobId,
    status: "running",
    display_stage: "translation",
  };
  runtimeState.currentJobId = jobId;
  runtimeState.currentJobPollGeneration = 1;
  syncCurrentJobSnapshot(runtimeState, job, jobId);

  const resourceLoads = [];
  const patches = [];
  scheduleSecondaryResourceFetches({
    state: runtimeState,
    apiPrefix: "/api/v1",
    jobId,
    payload: job,
    generation: 1,
    terminal: false,
    fetchJobEvents: async () => {
      throw new Error("fetchJobEvents should be hidden behind the resource");
    },
    jobEventsResource: {
      load: async (params, options) => {
        resourceLoads.push({ params, options });
        return {
          status: "success",
          data: {
            items: [
              {
                seq: 2,
                lane: "main",
                display_stage: "translation",
                substage: "translation_batches",
                progress: { unit: "batch", current: 5, total: 10 },
              },
            ],
          },
        };
      },
    },
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    renderJobSecondaryPatch: (patch) => patches.push(patch),
    notifyLibraryJobUpdated() {},
    jobPresentationPort: {
      buildJobPatchWithDisplayState,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(typeof resourceLoads[0].params.isCurrent, "function");
  assert.equal(typeof resourceLoads[0].params.onReset, "function");
  assert.deepEqual(resourceLoads.map(({ params: { isCurrent, onReset, ...params }, options }) => ({ params, options })), [
    {
      params: { jobId, terminal: false },
      options: { cache: false },
    },
  ]);
  const eventPatch = patches.find((patch) => patch.source === "events");
  assert.equal(eventPatch.context.events.items.at(-1).progress.current, 5);
});

test("secondary resource scheduler port owns controller scheduling dependencies", async () => {
  const jobId = "job-secondary-scheduler-port";
  const job = {
    job_id: jobId,
    status: "running",
    display_stage: "translation",
  };

  const loads = [];
  const patches = [];
  const libraryUpdates = [];
  const portCalls = [];
  const cachedByType = new Map([
    ["events", { items: [{ seq: 9 }] }],
  ]);
  const pollingPort = {
    isCurrentGeneration(requestedJobId, generation) {
      portCalls.push(["generation", requestedJobId, generation]);
      return requestedJobId === jobId && generation === 3;
    },
  };
  const currentJobPort = {
    snapshotFor(requestedJobId) {
      portCalls.push(["snapshotFor", requestedJobId]);
      return requestedJobId === jobId ? job : null;
    },
  };
  const secondaryResourcePort = {
    cachedFor(type, requestedJobId) {
      portCalls.push(["cachedFor", type, requestedJobId]);
      return requestedJobId === jobId ? cachedByType.get(type) || null : null;
    },
    isInFlight(type) {
      portCalls.push(["isInFlight", type]);
      return false;
    },
    shouldRefresh(type, intervalMs, force) {
      portCalls.push(["shouldRefresh", type, intervalMs, force]);
      return true;
    },
    setInFlight(type, value) {
      portCalls.push(["setInFlight", type, value]);
    },
    cache(type, requestedJobId, payload) {
      portCalls.push(["cache", type, requestedJobId]);
      cachedByType.set(type, payload);
    },
    clearInFlightForCurrentJob(type, requestedJobId) {
      portCalls.push(["clearInFlight", type, requestedJobId]);
    },
  };
  const renderContextPort = {
    currentFor(requestedJobId) {
      portCalls.push(["currentFor", requestedJobId]);
      return {
        job,
        jobId: requestedJobId,
        events: cachedByType.get("events") || null,
        manifest: cachedByType.get("manifest") || null,
        stageActions: cachedByType.get("stageActions") || null,
      };
    },
  };
  const port = createSecondaryResourceSchedulerPort({
    state: {},
    apiPrefix: "/api/v1",
    fetchJobEvents: async () => {
      throw new Error("events must go through injected resource");
    },
    jobEventsResource: {
      load: async (params, options) => {
        loads.push({ params, options });
        return {
          status: "success",
          data: {
            items: [
              {
                seq: 10,
                lane: "main",
                display_stage: "translation",
                substage: "translation_batches",
                progress: { unit: "batch", current: 4, total: 8 },
              },
            ],
          },
        };
      },
    },
    fetchJobArtifactsManifest: async (requestedJobId, apiPrefix) => ({
      requestedJobId,
      apiPrefix,
      artifacts: [{ artifact_key: "pdf" }],
    }),
    fetchJobStageActions: async () => ({ actions: [{ stage: "render" }] }),
    renderJobSecondaryPatch: (patch) => patches.push(patch),
    notifyLibraryJobUpdated: (item) => libraryUpdates.push(item),
    pollingPort,
    currentJobPort,
    secondaryResourcePort,
    renderContextPort,
    jobPresentationPort: {
      buildJobPatchWithDisplayState,
    },
  });

  port.schedule({
    jobId,
    payload: job,
    generation: 3,
    terminal: false,
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(loads.map(({ params: { isCurrent, onReset, ...params }, options }) => ({ params, options })), [
    {
      params: { jobId, terminal: false },
      options: { cache: false },
    },
  ]);
  assert.equal(patches.some((patch) => patch.source === "events"), true);
  assert.equal(patches.some((patch) => patch.source === "manifest"), true);
  assert.equal(patches.some((patch) => patch.source === "stageActions"), true);
  assert.equal(patches.find((patch) => patch.source === "events").context.events.items.at(-1).progress.current, 4);
  assert.equal(patches.find((patch) => patch.source === "manifest").context.manifest.requestedJobId, jobId);
  // events 副资源不再推图书馆（由主 poll 负责），避免双路 publish 抖网格
  assert.deepEqual(libraryUpdates, []);
  assert.equal(portCalls.some((call) => call[0] === "cache" && call[1] === "events"), true);
  assert.equal(portCalls.some((call) => call[0] === "currentFor" && call[1] === jobId), true);
});

test("secondary resource scheduler ignores stale generations through polling port", async () => {
  const jobId = "job-secondary-stale-generation";
  const calls = [];
  const secondaryResourcePort = {
    cachedFor() {
      return null;
    },
    isInFlight() {
      return false;
    },
    shouldRefresh() {
      return true;
    },
    setInFlight(type, value) {
      calls.push(["setInFlight", type, value]);
    },
    cache(type) {
      calls.push(["cache", type]);
    },
    clearInFlightForCurrentJob(type, requestedJobId) {
      calls.push(["clearInFlight", type, requestedJobId]);
    },
  };
  const port = createSecondaryResourceSchedulerPort({
    state: {},
    apiPrefix: "/api/v1",
    fetchJobEvents: async () => {
      throw new Error("events must use resource");
    },
    jobEventsResource: {
      load: async () => ({ status: "success", data: { items: [{ seq: 1 }] } }),
    },
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    renderJobSecondaryPatch: () => calls.push(["patch"]),
    notifyLibraryJobUpdated: () => calls.push(["notify"]),
    pollingPort: {
      isCurrentGeneration() {
        return false;
      },
    },
    currentJobPort: {
      snapshotFor: () => ({ job_id: jobId }),
    },
    secondaryResourcePort,
    renderContextPort: {
      currentFor: () => ({ jobId }),
    },
  });

  port.schedule({
    jobId,
    payload: { job_id: jobId, status: "running" },
    generation: 1,
    terminal: false,
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(calls.filter((call) => call[0] === "cache"), []);
  assert.deepEqual(calls.filter((call) => call[0] === "patch"), []);
  assert.deepEqual(calls.filter((call) => call[0] === "notify"), []);
  assert.deepEqual(calls.filter((call) => call[0] === "clearInFlight").map((call) => call[1]).sort(), [
    "events",
    "manifest",
    "stageActions",
  ]);
});

test("secondary event refresh uses patch renderer instead of full job render", async () => {
  const runtimeState = createLegacyStateFixture();
  const jobId = "job-secondary-patch";
  const job = {
    job_id: jobId,
    status: "running",
    display_stage: "translation",
    progress: { unit: "batch", current: 1, total: 10 },
  };
  runtimeState.currentJobId = jobId;
  runtimeState.currentJobPollGeneration = 1;
  syncCurrentJobSnapshot(runtimeState, job, jobId);

  const patches = [];
  const libraryUpdates = [];
  scheduleSecondaryResourceFetches({
    state: runtimeState,
    apiPrefix: "/api/v1",
    jobId,
    payload: job,
    generation: 1,
    terminal: false,
    fetchJobEvents: async () => eventPage([
        {
          seq: 1,
          display_stage: "translation",
          lane: "main",
          substage: "translation_batches",
          progress: { unit: "batch", current: 2, total: 10 },
        },
    ]),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    renderJobSecondaryPatch: (patch) => patches.push(patch),
    notifyLibraryJobUpdated: (item) => libraryUpdates.push(item),
    jobPresentationPort: {
      buildJobPatchWithDisplayState,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(patches.some((patch) => patch.source === "events"), true);
  assert.equal(patches.some((patch) => patch.source === "manifest"), true);
  assert.equal(patches.some((patch) => patch.source === "stageActions"), true);
  assert.equal(patches.find((patch) => patch.source === "events").context.events.items.at(-1).progress.current, 2);
  assert.equal(patches.find((patch) => patch.source === "manifest").context.manifest.artifacts.length, 0);
  assert.equal(patches.find((patch) => patch.source === "stageActions").context.stageActions.actions.length, 0);
  assert.deepEqual(currentJobStateModule.currentJobSnapshot(runtimeState), job);
  // events 副资源不再推图书馆
  assert.deepEqual(libraryUpdates, []);
});

test("secondary resource patches pass render context instead of raw cache inputs", async () => {
  const runtimeState = createLegacyStateFixture();
  const jobId = "job-secondary-context";
  const job = {
    job_id: jobId,
    status: "running",
    display_stage: "translation",
  };
  runtimeState.currentJobId = jobId;
  runtimeState.currentJobPollGeneration = 1;
  syncCurrentJobSnapshot(runtimeState, job, jobId);

  const patches = [];
  scheduleSecondaryResourceFetches({
    state: runtimeState,
    apiPrefix: "/api/v1",
    jobId,
    payload: job,
    generation: 1,
    terminal: false,
    fetchJobEvents: async () => eventPage([{ seq: 1, progress: { current: 3, total: 9 } }]),
    fetchJobArtifactsManifest: async () => ({ artifacts: [{ artifact_key: "pdf" }] }),
    fetchJobStageActions: async () => ({ actions: [{ stage: "render" }] }),
    renderJobSecondaryPatch: (patch) => patches.push(patch),
    notifyLibraryJobUpdated() {},
    jobPresentationPort: {
      buildJobPatchWithDisplayState,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  const eventPatch = patches.find((patch) => patch.source === "events");
  assert.equal(eventPatch.jobId, undefined);
  assert.equal(eventPatch.eventsPayload, undefined);
  assert.deepEqual(eventPatch.context.job, job);
  assert.equal(eventPatch.context.jobId, jobId);
  assert.equal(eventPatch.context.events.items[0].progress.current, 3);
});

test("stop() bumps generation so stale fetch resolutions cannot clear new polling", () => {
  const state = createLegacyStateFixture();
  const port = runtimePollingStateModule.createRuntimePollingStatePort(state, {
    clearIntervalFn: () => {},
    setIntervalFn: () => 1,
    now: () => "2026-06-16T00:00:00Z",
  });
  port.startJob("job-a");
  assert.equal(port.beginPoll(), 1);
  port.stop();
  // 旧代 finish 失配返回 false，不清任何东西
  assert.equal(port.finishPoll(1), false);
  // 新一轮照常工作（startJob 再涨一代）
  port.startJob("job-a");
  assert.equal(port.beginPoll(), 3);
  assert.equal(port.finishPoll(3), false);
  assert.equal(port.getSnapshot().pollInFlight, false);
});

test("terminal fetch schedules secondary resources with post-stop generation", async () => {
  const previousDocument = global.document;
  global.document = { getElementById() { return null; } };
  const state = createLegacyStateFixture();
  const schedulerCalls = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    buildJobDetailEndpoint: (jobId, apiPrefix) => `${apiPrefix}/jobs/${jobId}`,
    fetchJobPayload: async (jobId) => ({ job_id: jobId, status: "succeeded", display_stage: "done" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    submitJson: async () => ({}),
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    setText: () => {},
    setWorkflowSections: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: { publishJobUpdated() {}, requestRefresh() {} },
    resetStatePort: { resetSecondary: () => {}, resetJob: () => {} },
    secondaryResourceSchedulerPort: { schedule(input) { schedulerCalls.push(input); } },
    jobPresentationPort: { isTerminalStatus, normalizeJobPayload },
    shellViewPort: { closeDialogs() {}, isReaderOpen: () => false, resetEvents() {}, setCancelDisabled: () => {} },
  });
  try {
    feature.startPolling("job-done");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(schedulerCalls.length, 1);
    // 停之后的新代：副资源抓取的代校验必须通过，否则 manifest 被丢、下载按钮永残
    // 代数：startPolling 内 stop(+1)=1 → startJob(+1)=2 → 终态 stop(+1)=3
    assert.equal(schedulerCalls[0].terminal, true);
    assert.equal(schedulerCalls[0].generation, 3);
  } finally {
    global.document = previousDocument;
    try { feature.stopPolling(); } catch {}
  }
});
