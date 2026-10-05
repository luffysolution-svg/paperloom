import test from "node:test";
import assert from "node:assert/strict";
import { isJobTerminal, isTerminalStatus, normalizeJobPayload } from "@retainpdf/domain/job";
import { mountJobRuntimeFeature } from "../../src/features/jobs/domain/runtime/controller.js";
import { createRuntimePollingStatePort } from "../../src/features/jobs/domain/runtime/runtime-polling-state.js";
import { createSecondaryResourceStatePort } from "../../src/features/jobs/domain/runtime/secondary-resource-cache.js";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";
import { eventPage } from "../helpers/job-events-fixture.mjs";

function succeededJob(workflow = "ocr", extra = {}) {
  return { job_id: "job-contract", workflow, status: "succeeded", stage_snapshot: null,
    background_snapshots: [], artifacts_display: [], ...extra };
}

test("modern succeeded jobs without PDF or runtime are terminal for every workflow", () => {
  for (const workflow of ["book", "ocr", "translate", "render"]) {
    const job = succeededJob(workflow);
    assert.equal(isJobTerminal(job), true, workflow);
    const normalized = normalizeJobPayload(job);
    assert.equal(isJobTerminal(normalized), true, workflow);
    assert.equal(normalized.stage_snapshot.terminal, true, workflow);
    assert.equal(normalized.progress_percent, 100, workflow);
  }
});

test("backend succeeded runtime reason and absent active snapshot survive repeated normalization", () => {
  let job = succeededJob("translate", {
    runtime: { current_stage: "translating", terminal_reason: "succeeded" },
  });
  for (let count = 0; count < 4; count += 1) {
    job = normalizeJobPayload(job);
    assert.equal(isJobTerminal(job), true, `normalization ${count}`);
    assert.equal(job.stage_snapshot.terminal, true);
    assert.equal(job.progress_percent, 100);
  }
});

test("explicit modern null snapshot remains authoritative over stale legacy display fields", () => {
  const job = succeededJob("book", { display_stage: "translation", stage: "translating" });
  assert.equal(isJobTerminal(job), true);
  assert.equal(isJobTerminal(normalizeJobPayload(job)), true);
});

test("old raw_response status or identity never completes a new current job", () => {
  const old = succeededJob();
  const normalized = normalizeJobPayload(old);
  assert.equal(isJobTerminal({ ...normalized, status: "running" }), false);
  assert.equal(isJobTerminal({ status: "succeeded", raw_response: { ...old, status: "running" } }), false);
  assert.equal(isJobTerminal({ job_id: "other-job", status: "succeeded", raw_response: old }), false);
  assert.equal(isJobTerminal({ status: "succeeded", display_stage: "translation", raw_response: old }), false);
  assert.equal(isJobTerminal({ status: "succeeded", stage_snapshot: { display_stage: "translation" }, raw_response: old }), false);
});

test("legacy runtime succeeded reason is accepted only without an active public stage", () => {
  const runtime = { terminal_reason: "succeeded" };
  assert.equal(isJobTerminal({ status: "succeeded", runtime }), true);
  for (const display_stage of ["ocr", "translation", "render"]) {
    assert.equal(isJobTerminal({ status: "succeeded", display_stage, runtime }), false);
    assert.equal(isJobTerminal({ status: "succeeded", stage_snapshot: { display_stage }, runtime }), false);
  }
  assert.equal(isJobTerminal({ status: "succeeded" }), false);
  assert.equal(isJobTerminal({ status: "succeeded", stage_snapshot: undefined }), false);
});

test("modern success stops the main poll and loads one complete head batch without PDF", async () => {
  const state = createLegacyStateFixture();
  const timers = new Map();
  let timerId = 0;
  const pollingPort = createRuntimePollingStatePort(state, {
    setIntervalFn(callback) { timers.set(++timerId, callback); return timerId; },
    clearIntervalFn(id) { timers.delete(id); },
  });
  const secondaryResourcePort = createSecondaryResourceStatePort(state);
  const queries = [];
  let status = "running";
  let mainReads = 0;
  let latest;
  const feature = mountJobRuntimeFeature({
    state, apiPrefix: "/api/v1", pollingPort, secondaryResourcePort,
    currentJobPort: { jobId: () => pollingPort.getSnapshot().jobId },
    resetStatePort: { resetSecondary: () => secondaryResourcePort.reset(), resetJob() {} },
    fetchJobPayload: async () => {
      mainReads += 1;
      return status === "running"
        ? { job_id: "job-contract", workflow: "ocr", status, stage_snapshot: { display_stage: "ocr" } }
        : succeededJob();
    },
    fetchJobEvents: async (_id, _prefix, query) => {
      queries.push(query);
      if (query.start === "tail") return eventPage([{ seq: 500 }], { next_cursor: "tail-cursor" });
      if (query.start === "head") return eventPage(
        Array.from({ length: 500 }, (_, index) => ({ seq: index + 1 })),
        { next_cursor: "head-fixed-bound", has_more: true },
      );
      assert.equal(query.cursor, "head-fixed-bound");
      return eventPage([{ seq: 501 }], { next_cursor: "head-complete" });
    },
    fetchJobArtifactsManifest: async () => ({ items: [] }),
    fetchJobStageActions: async () => ({ stages: [] }),
    renderContextPort: {
      applySnapshot({ payload }) { latest = payload; return { job: payload, jobId: payload.job_id }; },
      currentFor: jobId => ({ jobId, job: latest, events: secondaryResourcePort.cachedFor("events", jobId) }),
    },
    renderJob() {}, renderJobSecondaryPatch() {}, setText() {}, setWorkflowSections() {},
    resetUploadProgress() {}, resetUploadedFile() {}, applyWorkflowMode() {}, clearPageRanges() {},
    updateJobWarning() {}, activateDetailTab() {},
    shellViewPort: { isReaderOpen: () => false, setCancelDisabled() {}, closeDialogs() {}, resetEvents() {} },
    libraryEventPort: { publishJobUpdated() {}, publishJobCreated() {}, requestRefresh() {} },
    jobPresentationPort: { isJobTerminal, isTerminalStatus, normalizeJobPayload },
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  try {
    feature.startPolling("job-contract", { silent: true });
    await flush();
    assert.equal(timers.size, 1);
    const oldTick = [...timers.values()][0];
    status = "succeeded";
    oldTick();
    await flush();
    assert.equal(timers.size, 0, "the terminal response stops the main polling timer");
    assert.deepEqual(queries.map(query => query.start || query.cursor), ["tail", "head", "head-fixed-bound"]);
    assert.equal(secondaryResourcePort.cachedFor("events", "job-contract").items.length, 501);
    oldTick();
    await flush();
    assert.equal(mainReads, 2, "the stale timer cannot resurrect polling after terminal stop");
    assert.equal(queries.filter(query => query.start === "head").length, 1);
  } finally { feature.stopPolling(); }
});
