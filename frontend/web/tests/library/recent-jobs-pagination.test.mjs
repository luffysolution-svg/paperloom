import test from "node:test";
import assert from "node:assert/strict";

import {
  collectRecentJobsPage,
} from "../../src/features/library/domain/recent-jobs/pagination.js";

test("分页溢出:同页填满后尾部有效条目不丢,offset 按实际消费行数推进", async () => {
  const serverItems = [
    { job_id: "job-skip-ocr", workflow: "ocr" },
    ...Array.from({ length: 24 }, (_, index) => ({ job_id: `job-p0-${index}`, workflow: "book" })),
  ];
  const fetchLibraryBookList = async (_apiPrefix, params) => ({
    items: serverItems.slice(params.offset, params.offset + params.limit),
  });
  const first = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 2,
    fetchLibraryBookList,
  });

  assert.deepEqual(first.collected.map((item) => item.job_id), ["job-p0-0", "job-p0-1"]);
  assert.equal(first.hasMore, true, "整页取满且无截断信号时还有更多");
  assert.equal(first.nextOffset, 3, "只消费 3 个原始行(1 过滤 + 2 收集),尾部不得跳过");

  const second = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: first.nextOffset,
    pageSize: 2,
    fetchLibraryBookList,
  });
  assert.deepEqual(
    second.collected.map((item) => item.job_id),
    ["job-p0-2", "job-p0-3"],
    "上一页尾部条目在下一页可回收",
  );
});

test("整页被过滤不判无更多:继续拉下一页回收有效条目", async () => {
  const calls = [];
  const fetchLibraryBookList = async (_apiPrefix, params) => {
    calls.push(params);
    if (params.offset === 0) {
      return {
        items: [
          { job_id: "job-filtered-ocr", workflow: "ocr" },
          { job_id: "job-parent-ocr", workflow: "ocr" },
        ],
        has_more: true,
      };
    }
    return { items: [{ job_id: "job-late", workflow: "book" }], has_more: false };
  };
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 2,
    fetchLibraryBookList,
  });

  assert.equal(calls.length, 2, "首个零增长页后必须继续拉下一页");
  assert.deepEqual(result.collected.map((item) => item.job_id), ["job-late"]);
  assert.equal(result.hasMore, false, "次页 has_more=false 才结束");
  assert.equal(result.nextOffset, 3, "两页各消费 2/1 个原始行");
});

test("连续两页零增长才判无更多", async () => {
  const calls = [];
  const fetchLibraryBookList = async (_apiPrefix, params) => {
    calls.push(params);
    return { items: [{ job_id: `job-filtered-${params.offset}-ocr`, workflow: "ocr" }], has_more: true };
  };
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 2,
    fetchLibraryBookList,
  });

  assert.equal(calls.length, 2, "单个零增长页不断流,连续两页才停");
  assert.deepEqual(result.collected, []);
  assert.equal(result.hasMore, false);
});

test("服务端限页小于 fetchLimit:has_more 为 true 时继续拉下一页", async () => {
  const calls = [];
  const fetchLibraryBookList = async (_apiPrefix, params) => {
    calls.push(params);
    if (params.offset === 0) {
      return {
        items: [
          { job_id: "job-capped-1", workflow: "book" },
          { job_id: "job-capped-2", workflow: "book" },
          { job_id: "job-capped-3", workflow: "book" },
        ],
        has_more: true,
      };
    }
    return { items: [{ job_id: "job-capped-4", workflow: "book" }], has_more: false };
  };
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 24,
    fetchLibraryBookList,
  });

  assert.equal(calls.length, 2, "短页但 has_more=true 时不得误判无更多");
  assert.deepEqual(result.collected.map((item) => item.job_id), [
    "job-capped-1",
    "job-capped-2",
    "job-capped-3",
    "job-capped-4",
  ]);
  assert.equal(result.hasMore, false);
  assert.equal(result.nextOffset, 4, "按实际返回条数推进 offset");
});
