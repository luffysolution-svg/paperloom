// 直接覆盖 recent-jobs 拆分出的纯逻辑模块：
// runtime-patch-merge / runtime-stage-snapshot / library-job-item-merge。

import test from "node:test";
import assert from "node:assert/strict";

import {
  hasStableLibraryIdentity,
  mergeRuntimePatch,
  stampBookIdentity,
} from "../../src/features/library/domain/recent-jobs/runtime-patch-merge.js";
import {
  buildRecentJobRuntimeSnapshot,
} from "../../src/features/library/domain/recent-jobs/runtime-stage-snapshot.js";
import {
  mergeLibraryJobItem,
} from "../../src/features/library/domain/recent-jobs/library-job-item-merge.js";

test("mergeRuntimePatch 同 stage/unit/total 下 current 不倒退", () => {
  const merged = mergeRuntimePatch(
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 5 } },
    { job_id: "j1", status: "running", display_stage: "translate", progress: { unit: "page", total: 10, current: 3 } },
  );
  assert.equal(merged.progress.current, 5);
  assert.equal(merged.progress_current, 5);
});

test("mergeRuntimePatch 终态不被后续非终态脏轮询冲掉", () => {
  const merged = mergeRuntimePatch(
    { job_id: "j1", status: "succeeded", display_stage: "done", progress: { unit: "page", total: 10, current: 10 } },
    { job_id: "j1", status: "running", display_stage: "render", progress: { unit: "page", total: 10, current: 2 } },
  );
  assert.equal(merged.status, "succeeded");
  assert.equal(merged.progress.current, 10);
});

test("mergeRuntimePatch 换 job_id 只继承书目身份，不继承旧运行态", () => {
  const merged = mergeRuntimePatch(
    {
      job_id: "old",
      document_id: "doc-1",
      title: "真书名",
      cover_url: "cover",
      status: "succeeded",
      display_stage: "done",
      progress: { current: 99 },
    },
    { job_id: "new", status: "queued", display_stage: "queued" },
  );
  assert.equal(merged.job_id, "new");
  assert.equal(merged.status, "queued");
  assert.equal(merged.document_id, "doc-1");
  assert.equal(merged.title, "真书名");
  assert.equal(merged.cover_url, "cover");
  assert.notEqual(merged.progress?.current, 99);
});

test("mergeRuntimePatch 无旧帧直接采用新帧", () => {
  const next = { job_id: "j1", status: "queued" };
  assert.equal(mergeRuntimePatch(null, next), next);
});

test("hasStableLibraryIdentity 取决于 document_id + 真书名", () => {
  assert.equal(hasStableLibraryIdentity({ job_id: "j1", document_id: "doc-1", title: "真书名" }), true);
  assert.equal(hasStableLibraryIdentity({ job_id: "j1", document_id: "doc-1", title: "j1" }), false);
  assert.equal(hasStableLibraryIdentity({ job_id: "j1", document_id: "doc-1", title: "mock-book" }), false);
  assert.equal(hasStableLibraryIdentity({ job_id: "j1", title: "真书名" }), false);
});

test("stampBookIdentity 换 id 时把旧 job_id 记为 source，同 id 则不记", () => {
  const changed = stampBookIdentity(
    { job_id: "new", title: "真书名" },
    { job_id: "old", document_id: "doc-1" },
    { job_id: "new" },
  );
  assert.equal(changed.source_job_id, "old");
  assert.equal(changed.document_id, "doc-1");

  const same = stampBookIdentity({ job_id: "same" }, { job_id: "same" }, { job_id: "same" });
  assert.equal(same.source_job_id, undefined);
});

test("buildRecentJobRuntimeSnapshot 运行中把 done 夹回 render", () => {
  const snapshot = buildRecentJobRuntimeSnapshot({ job_id: "j1", status: "running", display_stage: "done" });
  assert.equal(snapshot.stageKey, "render");
  assert.equal(snapshot.publicStage, "render");
});

test("buildRecentJobRuntimeSnapshot succeeded 才放行 done", () => {
  const snapshot = buildRecentJobRuntimeSnapshot({ job_id: "j1", status: "succeeded", display_stage: "done" });
  assert.equal(snapshot.stageKey, "done");
});

test("mergeLibraryJobItem 占位书名不覆盖旧真名", () => {
  const merged = mergeLibraryJobItem(
    { job_id: "j1", title: "真书名", display_name: "真书名" },
    { job_id: "j1", title: "j1", display_name: "j1" },
  );
  assert.equal(merged.title, "真书名");
  assert.equal(merged.display_name, "真书名");
});

test("mergeLibraryJobItem succeeded 钉进度到 100%", () => {
  const merged = mergeLibraryJobItem(
    { job_id: "j1", status: "running", progress: { total: 8, current: 4, percent: 50 } },
    { job_id: "j1", status: "succeeded", display_stage: "done" },
  );
  assert.equal(merged.progress.percent, 100);
  assert.equal(merged.progress.current, 8);
});
