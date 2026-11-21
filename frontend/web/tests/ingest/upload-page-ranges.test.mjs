import test from "node:test";
import assert from "node:assert/strict";

import {
  constrainPageRangeValues,
  normalizePageNumberInput,
  normalizePageRangeValue,
  resolvePageRangeLimit,
  validatePageRangeValues,
} from "../../src/features/ingest/domain/upload/page-ranges.js";

test("normalizePageRangeValue collapses empty / single / duplicate ends", () => {
  assert.equal(normalizePageRangeValue("", ""), "");
  assert.equal(normalizePageRangeValue("2", ""), "2");
  assert.equal(normalizePageRangeValue("", "8"), "8");
  assert.equal(normalizePageRangeValue("2", "2"), "2");
  assert.equal(normalizePageRangeValue("2", "8"), "2-8");
  assert.equal(normalizePageRangeValue("  3 ", " 4 "), "3-4");
});

test("normalizePageNumberInput rejects non-numeric and floors to at least 1", () => {
  assert.equal(normalizePageNumberInput(""), "");
  assert.equal(normalizePageNumberInput("abc"), "");
  assert.equal(normalizePageNumberInput(undefined), "");
  assert.equal(normalizePageNumberInput("0"), 1);
  assert.equal(normalizePageNumberInput("2.9"), 2);
  assert.equal(normalizePageNumberInput(" 12 "), 12);
});

test("resolvePageRangeLimit prefers uploaded count, then front limit", () => {
  assert.equal(resolvePageRangeLimit(0, 999), 999);
  assert.equal(resolvePageRangeLimit(12, 999), 12);
  assert.equal(resolvePageRangeLimit(undefined, 0), 0);
  assert.equal(resolvePageRangeLimit(0, 0), 0);
});

test("constrainPageRangeValues clamps to max and keeps start<=end", () => {
  assert.deepEqual(
    constrainPageRangeValues({ start: "14", end: "20", maxPage: 12, source: "end" }),
    { start: "12", end: "12", maxPage: 12 },
  );
  assert.deepEqual(
    constrainPageRangeValues({ start: "9", end: "4", maxPage: 12, source: "start" }),
    { start: "4", end: "4", maxPage: 12 },
  );
  assert.deepEqual(
    constrainPageRangeValues({ start: "", end: "", maxPage: 12 }),
    { start: "", end: "", maxPage: 12 },
  );
  assert.deepEqual(
    constrainPageRangeValues({ start: "4", end: "8", maxPage: 12 }),
    { start: "4", end: "8", maxPage: 12 },
  );
  assert.deepEqual(
    constrainPageRangeValues({ start: "abc", end: "8", maxPage: 12 }),
    { start: "", end: "8", maxPage: 12 },
  );
});

test("validatePageRangeValues returns the first blocking reason", () => {
  assert.deepEqual(
    validatePageRangeValues({ start: "abc", end: "", maxPage: 12 }),
    { ok: false, message: "页码必须为数字" },
  );
  assert.deepEqual(
    validatePageRangeValues({ start: "0", end: "", maxPage: 12 }),
    { ok: false, message: "页码必须从 1 开始" },
  );
  assert.deepEqual(
    validatePageRangeValues({ start: "14", end: "", maxPage: 12 }),
    { ok: false, message: "页码不能超过 12" },
  );
  assert.deepEqual(
    validatePageRangeValues({ start: "9", end: "4", maxPage: 12 }),
    { ok: false, message: "起始页不能大于结束页" },
  );
  assert.deepEqual(
    validatePageRangeValues({ start: "8", end: "12", maxPage: 10 }),
    { ok: false, message: "页码不能超过 10" },
  );
  assert.deepEqual(
    validatePageRangeValues({ start: "2", end: "8", maxPage: 12 }),
    { ok: true },
  );
});
