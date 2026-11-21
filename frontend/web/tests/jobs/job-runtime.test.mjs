// 任务运行时 · 轮询与控制器：轮询状态门控、controller 注入、startPolling 占位发布、
// 删除任务的恢复、取消按钮。
// 本文件原有 1700+ 行，状态与次级资源两块已拆到 job-runtime-state / job-runtime-secondary-resources，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import * as runtimePollingStateModule from "../../src/features/jobs/domain/runtime/runtime-polling-state.js";
import { mountJobRuntimeFeature } from "../../src/features/jobs/domain/runtime/controller.js";
import {
  isJobTerminal,
  isTerminalStatus,
} from "@retainpdf/domain/job";
import { normalizeJobPayload } from "@retainpdf/domain/job";

// 这里原先直接用 js/state 的全局单例当夹具（secondaryResourceCache 只是往传入
// 对象上读写，并不要求它是那个单例）。改用测试自持的同形夹具，好让生产代码
// 删掉那 6 片死 slice。
const state = createLegacyStateFixture();

test("runtime polling state gates concurrent polls and generations", () => {
  const state = createLegacyStateFixture();
  const start = runtimePollingStateModule.startRuntimeJob(state, "job-poll");
  assert.equal(start.generation, 1);
  assert.equal(runtimePollingStateModule.runtimePollingStoreFor(state).getSnapshot().jobId, "job-poll");
  assert.equal(runtimePollingStateModule.isCurrentJobGeneration(state, "job-poll", 1), true);
  assert.equal(runtimePollingStateModule.isCurrentJobGeneration(state, "job-other", 1), false);

  assert.equal(runtimePollingStateModule.beginJobPoll(state), 1);
  // 在途合并：第二拍返回同代记pending，不再返null丢拍
  assert.equal(runtimePollingStateModule.beginJobPoll(state), 1);
  runtimePollingStateModule.finishJobPoll(state);
  assert.equal(runtimePollingStateModule.runtimePollingStoreFor(state).getSnapshot().pollInFlight, false);

  runtimePollingStateModule.stopPolling(state);
  assert.equal(state.timer, null);
  assert.equal(runtimePollingStateModule.runtimePollingStoreFor(state).getSnapshot().pollInFlight, false);
  assert.equal(state.currentJobEventsFetchInFlight, false);
  assert.equal(state.currentJobManifestFetchInFlight, false);
  assert.equal(state.currentJobStageActionsFetchInFlight, false);
});

test("runtime polling state port is backed by framework store without legacy mirror", () => {
  const cleared = [];
  const intervals = [];
  let nextTimer = 100;
  const state = createLegacyStateFixture();
  const port = runtimePollingStateModule.createRuntimePollingStatePort(state, {
    clearIntervalFn: (timer) => cleared.push(timer),
    setIntervalFn: (callback, intervalMs) => {
      intervals.push({ callback, intervalMs });
      nextTimer += 1;
      return nextTimer;
    },
    now: () => "2026-06-16T00:00:00Z",
  });

  const started = port.startJob(" job-port ");
  assert.deepEqual(started, {
    generation: 1,
    startedAt: "2026-06-16T00:00:00Z",
  });
  assert.equal(port.getSnapshot().jobId, "job-port");
  // 迁移完成:store 是唯一真值,旧 state 对象不再被回写
  assert.equal(state.currentJobId, "");

  assert.equal(port.beginPoll(), 1);
  // 在途合并：第二拍不再返 null 丢拍，返回同代并记 pending，finishPoll 消费补发
  assert.equal(port.beginPoll(), 1);
  assert.equal(port.getSnapshot().pollInFlight, true);
  assert.equal(port.finishPoll(), true);
  assert.equal(port.getSnapshot().pollInFlight, false);
  assert.equal(port.isCurrentGeneration("job-port", 1), true);
  assert.equal(port.isCurrentGeneration("job-port", 0), false);

  assert.equal(port.startTimer(() => {}, 250), 101);
  assert.equal(state.timer, 101);
  assert.equal(port.startTimer(() => {}, 500), 102);
  assert.deepEqual(cleared, [101]);
  assert.deepEqual(intervals.map((item) => item.intervalMs), [250, 500]);

  port.stop();
  assert.deepEqual(cleared, [101, 102]);
  assert.equal(state.timer, null);
  assert.equal(port.getSnapshot().pollInFlight, false);
});

test("job runtime controller consumes injected polling port", async () => {
  const previousDocument = global.document;
  global.document = {
    getElementById() {
      return null;
    },
  };
  const state = createLegacyStateFixture();
  const calls = [];
  const payloads = new Map([
    ["job-port", {
      job_id: "job-port",
      status: "running",
      display_stage: "translation",
      progress: { unit: "batch", current: 1, total: 10 },
    }],
  ]);
  const pollingPort = {
    beginPoll() {
      calls.push(["begin"]);
      return 7;
    },
    finishPoll() {
      calls.push(["finish"]);
    },
    isCurrentGeneration(jobId, generation) {
      calls.push(["generation", jobId, generation]);
      return true;
    },
    startJob(jobId) {
      calls.push(["startJob", jobId]);
      state.currentJobId = jobId;
      return { generation: 7, startedAt: "2026-06-16T00:00:00Z" };
    },
    startTimer(callback, intervalMs) {
      calls.push(["timer", intervalMs, typeof callback]);
      return "timer-1";
    },
    stop() {
      calls.push(["stop"]);
    },
  };
  const cachedEvents = { items: [{ seq: 1 }] };
  const currentJobPort = {
    jobId: () => state.currentJobId || "job-port",
    snapshot: () => ({
      job_id: "job-port",
      status: "queued",
      display_stage: "ocr",
      progress: { unit: "page", current: 0, total: 10 },
    }),
  };
  const secondaryResourcePort = {
    cachedFor(type, jobId) {
      calls.push(["cached", type, jobId]);
      return type === "events" ? cachedEvents : null;
    },
  };
  const renderContextPort = {
    applySnapshot(input) {
      calls.push([
        "renderContext",
        input.payload.job_id,
        input.eventsPayload?.items?.length || 0,
        input.manifestPayload,
        input.stageActionsPayload,
      ]);
      return {
        job: input.payload,
        jobId: input.payload.job_id,
        events: input.eventsPayload || null,
        manifest: input.manifestPayload || null,
        stageActions: input.stageActionsPayload || null,
      };
    },
  };
  const schedulerCalls = [];
  const libraryUpdates = [];
  const shellCalls = [];
  const resetCalls = [];
  const secondaryResourceSchedulerPort = {
    schedule(input) {
      schedulerCalls.push(input);
    },
  };
  const rendered = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    buildJobDetailEndpoint: (jobId, apiPrefix) => `${apiPrefix}/jobs/${jobId}`,
    fetchJobPayload: async (jobId) => {
      calls.push(["fetch", jobId]);
      return payloads.get(jobId);
    },
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    submitJson: async () => ({}),
    renderJob: (context) => rendered.push(context),
    renderJobSecondaryPatch: () => {},
    setText: (id, text) => calls.push(["setText", id, text]),
    setWorkflowSections: (job) => calls.push(["sections", job.job_id]),
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: {
      publishJobUpdated(job) {
        libraryUpdates.push(job);
      },
      requestRefresh() {},
    },
    jobEventsResource: {
      load: async () => ({ status: "success", data: { items: [] } }),
    },
    pollingPort,
    currentJobPort,
    secondaryResourcePort,
    renderContextPort,
    resetStatePort: {
      resetSecondary: () => resetCalls.push(["secondary"]),
    },
    secondaryResourceSchedulerPort,
    jobPresentationPort: {
      isTerminalStatus,
      normalizeJobPayload,
    },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => true,
      resetEvents() {},
      setCancelDisabled: (disabled) => shellCalls.push(["cancel", disabled]),
    },
    onReaderDialogSync: () => shellCalls.push(["reader-sync"]),
  });

  try {
    feature.startPolling("job-port");
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(calls.slice(0, 9), [
      ["stop"],
      ["startJob", "job-port"],
      ["sections", "job-port"],
      ["renderContext", "job-port", 0, undefined, undefined],
      ["begin"],
      ["fetch", "job-port"],
      ["timer", 1000, "function"],
      ["finish"],
      ["generation", "job-port", 7],
    ]);
    assert.deepEqual(resetCalls, [["secondary"]]);
    assert.equal(rendered[0].job.status, "queued");
    assert.equal(rendered.at(-1).job.status, "running");
    assert.equal(libraryUpdates.length, 2);
    assert.equal(libraryUpdates[0].job_id, "job-port");
    assert.equal(libraryUpdates[0].status, "queued");
    assert.equal(libraryUpdates[0].display_stage, "ocr");
    assert.equal(libraryUpdates[1].job_id, "job-port");
    assert.equal(libraryUpdates[1].status, "running");
    assert.equal(libraryUpdates[1].display_stage, "translation");
    assert.equal(libraryUpdates[1].progress_current, 1);
    assert.equal(libraryUpdates[1].progress_total, 10);
    assert.equal(libraryUpdates[1].progress_unit, "batch");
    assert.deepEqual(rendered.at(-1).events, cachedEvents);
    assert.equal(feature.currentJobId(), "job-port");
    assert.deepEqual(calls.filter((call) => call[0] === "cached"), [
      ["cached", "events", "job-port"],
      ["cached", "manifest", "job-port"],
      ["cached", "stageActions", "job-port"],
    ]);
    assert.deepEqual(calls.filter((call) => call[0] === "renderContext"), [
      ["renderContext", "job-port", 0, undefined, undefined],
      ["renderContext", "job-port", 1, null, null],
    ]);
    assert.deepEqual(schedulerCalls, [
      {
        jobId: "job-port",
        payload: payloads.get("job-port"),
        generation: 7,
        terminal: false,
      },
    ]);
    assert.deepEqual(shellCalls, [["cancel", false], ["reader-sync"]]);
  } finally {
    global.document = previousDocument;
  }
});

test("job runtime keeps polling when succeeded payload is still in an active stage", async () => {
  const cases = [
    ["ocr", { display_stage: "ocr", stage: "ocr_processing", progress: { unit: "page", current: 2, total: 8, percent: 25 } }],
    ["translation", { display_stage: "translation", stage: "translating", progress: { unit: "batch", current: 2, total: 8, percent: 25 } }],
    ["render", { display_stage: "render", stage: "rendering", progress: { unit: "page", current: 2, total: 8, percent: 25 } }],
    ["legacy-translation", { stage: "translating", progress: { unit: "batch", current: 2, total: 8, percent: 25 } }],
    ["legacy-render", { stage: "rendering", progress: { unit: "page", current: 2, total: 8, percent: 25 } }],
  ];

  for (const [name, payload] of cases) {
    const state = createLegacyStateFixture();
    const calls = [];
    const schedulerCalls = [];
    const feature = mountJobRuntimeFeature({
      state,
      apiPrefix: "/api/v1",
      buildJobDetailEndpoint: (jobId, apiPrefix) => `${apiPrefix}/jobs/${jobId}`,
      fetchJobPayload: async (jobId) => ({
        job_id: jobId,
        status: "succeeded",
        ...payload,
      }),
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
      libraryEventPort: {
        publishJobCreated() {},
        publishJobUpdated() {},
        requestRefresh(input) {
          calls.push(["refresh", input]);
        },
      },
      pollingPort: {
        beginPoll: () => 3,
        finishPoll() {},
        isCurrentGeneration: () => true,
        startJob(jobId) {
          state.currentJobId = jobId;
          return { generation: 3, startedAt: "2026-06-17T00:00:00Z" };
        },
        startTimer(callback, intervalMs) {
          calls.push(["timer", intervalMs]);
          return "timer";
        },
        stop() {
          calls.push(["stop"]);
        },
      },
      currentJobPort: {
        jobId: () => state.currentJobId,
      },
      secondaryResourcePort: {
        cachedFor: () => null,
      },
      renderContextPort: {
        applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }),
      },
      secondaryResourceSchedulerPort: {
        schedule(input) {
          schedulerCalls.push(input);
        },
      },
      jobEventsResource: {
        load: async () => ({ status: "success", data: { items: [] } }),
      },
      jobPresentationPort: {
        isJobTerminal,
        isTerminalStatus,
        normalizeJobPayload,
      },
      shellViewPort: {
        closeDialogs() {},
        isReaderOpen: () => false,
        resetEvents() {},
        setCancelDisabled() {},
      },
    });

    feature.startPolling(`job-${name}-subtask-succeeded`);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(calls.filter((call) => call[0] === "stop").length, 1, name);
    assert.equal(schedulerCalls.at(-1)?.terminal, false, name);
  }
});

test("job runtime startPolling immediately publishes placeholder to the library", async () => {
  const state = createLegacyStateFixture();
  const libraryCreated = [];
  const libraryUpdated = [];
  const cancelDisabledStates = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    buildJobDetailEndpoint: (jobId, apiPrefix) => `${apiPrefix}/jobs/${jobId}`,
    fetchJobPayload: async (jobId) => ({ job_id: jobId, status: "running", display_stage: "ocr" }),
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
    libraryEventPort: {
      publishJobCreated(job) {
        libraryCreated.push(job);
      },
      publishJobUpdated(job) {
        libraryUpdated.push(job);
      },
      requestRefresh() {},
    },
    pollingPort: {
      beginPoll: () => 1,
      finishPoll() {},
      isCurrentGeneration: () => true,
      startJob(jobId) {
        state.currentJobId = jobId;
        return { generation: 1, startedAt: "2026-06-17T00:00:00Z" };
      },
      startTimer() {},
      stop() {},
    },
    currentJobPort: {
      jobId: () => state.currentJobId,
    },
    secondaryResourcePort: {
      cachedFor: () => null,
    },
    renderContextPort: {
      applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }),
    },
    secondaryResourceSchedulerPort: {
      schedule() {},
    },
    jobEventsResource: {
      load: async () => ({ status: "success", data: { items: [] } }),
    },
    jobPresentationPort: {
      isTerminalStatus,
      normalizeJobPayload,
    },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled: (disabled) => cancelDisabledStates.push(disabled),
    },
  });

  feature.startPolling("job-library-placeholder");

  assert.deepEqual(cancelDisabledStates, [false], "新任务必须解除上一任务遗留的取消锁");
  assert.equal(libraryCreated[0].job_id, "job-library-placeholder");
  assert.equal(libraryCreated[0].status, "queued");
  assert.equal(libraryCreated[0].display_stage, "ocr");
  assert.equal(libraryUpdated[0].job_id, "job-library-placeholder");
  assert.equal(libraryUpdated[0].status, "queued");
  assert.equal(libraryUpdated[0].display_stage, "ocr");

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(libraryUpdated.at(-1).status, "running");
});

test("job runtime startPolling({ silent: true }) skips library create and workflow sections", async () => {
  const state = createLegacyStateFixture();
  const libraryCreated = [];
  const libraryUpdated = [];
  const workflowCalls = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    buildJobDetailEndpoint: (jobId, apiPrefix) => `${apiPrefix}/jobs/${jobId}`,
    fetchJobPayload: async (jobId) => ({ job_id: jobId, status: "running", display_stage: "ocr" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    submitJson: async () => ({}),
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    setText: () => {},
    setWorkflowSections: (job) => workflowCalls.push(job?.job_id || null),
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: {
      publishJobCreated(job) {
        libraryCreated.push(job);
      },
      publishJobUpdated(job) {
        libraryUpdated.push(job);
      },
      requestRefresh() {},
    },
    pollingPort: {
      beginPoll: () => 1,
      finishPoll() {},
      isCurrentGeneration: () => true,
      startJob(jobId) {
        state.currentJobId = jobId;
        return { generation: 1, startedAt: "2026-06-17T00:00:00Z" };
      },
      startTimer() {},
      stop() {},
    },
    currentJobPort: {
      jobId: () => state.currentJobId,
    },
    secondaryResourcePort: {
      cachedFor: () => null,
    },
    renderContextPort: {
      applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }),
    },
    secondaryResourceSchedulerPort: {
      schedule() {},
    },
    jobEventsResource: {
      load: async () => ({ status: "success", data: { items: [] } }),
    },
    jobPresentationPort: {
      isTerminalStatus,
      normalizeJobPayload,
    },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled() {},
    },
  });

  feature.startPolling("job-silent", { silent: true });

  assert.deepEqual(libraryCreated, [], "silent 不 publishJobCreated");
  assert.deepEqual(workflowCalls, [], "silent 不 setWorkflowSections");
  // silent：status/stage 变化仍会 notify（封面转圈），但不整页 refresh
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(libraryUpdated.length >= 1, "silent 首帧/阶段变化应 notify 书架以驱动封面 loading");
  assert.ok(
    libraryUpdated.every((job) => job.job_id === "job-silent"),
    "silent notify 仅当前 job",
  );
});

test("recovering a deleted persisted job clears it without showing a global error", async () => {
  const previousWindow = global.window;
  const storage = new Map([["retainpdf.activeJobId", "job-stale"]]);
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, `${value}`),
      removeItem: (key) => storage.delete(key),
    },
  };
  const state = createLegacyStateFixture();
  let currentJobId = "";
  const calls = [];
  const missing = Object.assign(new Error("未找到该任务，请检查 job_id 是否正确。"), { status: 404 });
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    fetchJobPayload: async () => { throw missing; },
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    setText: (...args) => calls.push(["text", ...args]),
    setWorkflowSections: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: {
      publishJobUpdated() {},
      requestRefresh: (...args) => calls.push(["refresh", ...args]),
    },
    pollingPort: {
      beginPoll: () => 1,
      finishPoll() {},
      isCurrentGeneration: () => true,
      startJob(jobId) {
        currentJobId = jobId;
        return { generation: 1, startedAt: "2026-09-03T00:00:00Z" };
      },
      getSnapshot: () => ({ generation: 1 }),
      startTimer: () => null,
      stop: () => calls.push(["stop"]),
    },
    currentJobPort: {
      jobId: () => currentJobId,
      syncSnapshot(_snapshot, jobId) {
        currentJobId = jobId;
      },
    },
    secondaryResourcePort: { cachedFor: () => null },
    renderContextPort: {
      applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }),
    },
    secondaryResourceSchedulerPort: { schedule() {} },
    resetStatePort: {
      resetSecondary() {},
      resetJob: () => calls.push(["reset-job"]),
    },
    jobPresentationPort: { isTerminalStatus, normalizeJobPayload },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled() {},
    },
  });

  try {
    feature.startPolling("job-stale", { silent: true, recovering: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(storage.has("retainpdf.activeJobId"), false);
    assert.equal(currentJobId, "");
    assert.ok(calls.some((call) => call[0] === "reset-job"));
    assert.ok(calls.some((call) => call[0] === "refresh"));
    assert.deepEqual(calls.filter((call) => call[0] === "text").at(-1), ["text", "error-box", "-"]);
  } finally {
    global.window = previousWindow;
  }
});

test("job runtime controller routes cancel button state through shell view port", async () => {
  const state = createLegacyStateFixture();
  state.currentJobId = "job-cancel";
  const calls = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    cancelJob: async (jobId, apiPrefix) => calls.push(["cancel", jobId, apiPrefix]),
    cancelOcrJob: async (jobId, apiPrefix) => calls.push(["cancel-ocr", jobId, apiPrefix]),
    fetchJobPayload: async (jobId) => ({ job_id: jobId, status: "cancelled" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    renderJob: () => calls.push(["render"]),
    renderJobSecondaryPatch: () => {},
    setText: (...args) => calls.push(["text", ...args]),
    setWorkflowSections: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: {
      publishJobUpdated() {},
      requestRefresh() {},
    },
    pollingPort: {
      beginPoll: () => 1,
      finishPoll() {},
      isCurrentGeneration: () => true,
      startJob: () => ({ startedAt: "2026-06-16T00:00:00Z" }),
      startTimer() {},
      stop() {},
    },
    currentJobPort: {
      jobId: () => "job-cancel",
    },
    secondaryResourcePort: {
      cachedFor: () => null,
    },
    renderContextPort: {
      applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }),
    },
    secondaryResourceSchedulerPort: {
      schedule() {},
    },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled: (disabled) => calls.push(["cancel-disabled", disabled]),
    },
  });

  await feature.cancelCurrentJob();

  assert.deepEqual(calls.slice(0, 2), [
    ["cancel-disabled", true],
    ["cancel", "job-cancel", "/api/v1"],
  ]);
});

test("job runtime unlocks cancel button when cancel request fails", async () => {
  const state = createLegacyStateFixture();
  state.currentJobId = "job-cancel-failed";
  const calls = [];
  const feature = mountJobRuntimeFeature({
    state,
    apiPrefix: "/api/v1",
    cancelJob: async () => { throw new Error("cancel unavailable"); },
    cancelOcrJob: async () => {},
    fetchJobPayload: async () => ({}),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    setText: (...args) => calls.push(["text", ...args]),
    setWorkflowSections: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    applyWorkflowMode: () => {},
    clearPageRanges: () => {},
    updateJobWarning: () => {},
    activateDetailTab: () => {},
    libraryEventPort: { publishJobUpdated() {}, requestRefresh() {} },
    currentJobPort: {
      jobId: () => "job-cancel-failed",
      snapshot: () => ({ job_id: "job-cancel-failed", workflow: "translate" }),
    },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled: (disabled) => calls.push(["cancel-disabled", disabled]),
    },
  });

  await feature.cancelCurrentJob();

  assert.deepEqual(calls.slice(0, 2), [
    ["cancel-disabled", true],
    ["cancel-disabled", false],
  ]);
  assert.match(calls.at(-1)?.[2] || "", /cancel unavailable/);
});

test("job runtime routes OCR-only cancellation to the OCR endpoint client", async () => {
  const calls = [];
  const feature = mountJobRuntimeFeature({
    state: createLegacyStateFixture(),
    apiPrefix: "/api/v1",
    cancelJob: async (...args) => calls.push(["cancel", ...args]),
    cancelOcrJob: async (...args) => calls.push(["cancel-ocr", ...args]),
    fetchJobPayload: async (jobId) => ({ job_id: jobId, status: "cancelled", workflow: "ocr" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobArtifactsManifest: async () => ({ artifacts: [] }),
    fetchJobStageActions: async () => ({ actions: [] }),
    retryJobStage: async () => ({}),
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
    pollingPort: {
      beginPoll: () => 1,
      finishPoll() {},
      isCurrentGeneration: () => true,
      startJob: () => ({ startedAt: "2026-06-16T00:00:00Z" }),
      startTimer() {},
      stop() {},
    },
    currentJobPort: {
      jobId: () => "job-ocr-cancel",
      snapshot: () => ({ job_id: "job-ocr-cancel", workflow: "ocr" }),
    },
    secondaryResourcePort: { cachedFor: () => null },
    renderContextPort: { applySnapshot: (input) => ({ job: input.payload, jobId: input.payload.job_id }) },
    secondaryResourceSchedulerPort: { schedule() {} },
    shellViewPort: {
      closeDialogs() {},
      isReaderOpen: () => false,
      resetEvents() {},
      setCancelDisabled() {},
    },
  });

  await feature.cancelCurrentJob();

  assert.deepEqual(calls[0], ["cancel-ocr", "job-ocr-cancel", "/api/v1"]);
});
