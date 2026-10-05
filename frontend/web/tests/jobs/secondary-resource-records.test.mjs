import test from "node:test";
import assert from "node:assert/strict";

import {
  SECONDARY_RESOURCE_TYPES,
  emptySecondaryResourceRecord,
  normalizeSecondaryResourceRecord,
  normalizeSecondaryResourcesState,
  secondaryResourceFields,
  shouldRefreshSecondary,
} from "../../src/features/jobs/domain/runtime/secondary-resource-records.js";

test("secondaryResourceFields maps each resource type to host-state keys", () => {
  assert.deepEqual(secondaryResourceFields("events"), {
    payload: "currentJobEvents",
    jobId: "currentJobEventsJobId",
    fetchedAt: "currentJobEventsFetchedAt",
    inFlight: "currentJobEventsFetchInFlight",
  });
  assert.deepEqual(secondaryResourceFields("manifest"), {
    payload: "currentJobManifest",
    jobId: "currentJobManifestJobId",
    fetchedAt: "currentJobManifestFetchedAt",
    inFlight: "currentJobManifestFetchInFlight",
  });
  assert.equal(secondaryResourceFields("unknown"), null);
});

test("normalizeSecondaryResourceRecord reads flat host fields with coercion", () => {
  const record = normalizeSecondaryResourceRecord(
    {
      currentJobEvents: { items: [{ seq: 1 }] },
      currentJobEventsJobId: "  job-a  ",
      currentJobEventsFetchedAt: "1234",
      currentJobEventsFetchInFlight: 1,
    },
    "events",
  );
  assert.deepEqual(record, {
    payload: { items: [{ seq: 1 }] },
    jobId: "job-a",
    fetchedAt: 1234,
    inFlight: true,
    ownerGen: null,
  });
  assert.deepEqual(normalizeSecondaryResourceRecord({}, "unknown"), emptySecondaryResourceRecord());
});

test("normalizeSecondaryResourcesState builds a record for every resource type", () => {
  const state = normalizeSecondaryResourcesState({ currentJobManifestJobId: "job-m" });
  assert.deepEqual(Object.keys(state).sort(), [...SECONDARY_RESOURCE_TYPES].sort());
  assert.equal(state.manifest.jobId, "job-m");
  assert.equal(state.events.jobId, "");
  assert.deepEqual(state.stageActions, emptySecondaryResourceRecord());
});

test("shouldRefreshSecondary honors force, missing timestamps, and intervals", () => {
  assert.equal(shouldRefreshSecondary(0, 5000, true), true);
  assert.equal(shouldRefreshSecondary(0, 5000, false), true);
  assert.equal(shouldRefreshSecondary(Number.NaN, 5000, false), true);
  assert.equal(shouldRefreshSecondary(Date.now(), 60000, false), false);
  assert.equal(shouldRefreshSecondary(Date.now() - 5000, 1000, false), true);
});
