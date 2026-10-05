import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesAnyText,
  nowIso,
  sequentialId,
  trimId,
} from "@/platform/mock/mock-utils.js";

test("trimId：空值兜底为空串并去首尾空白", () => {
  assert.equal(trimId("  doc-1  "), "doc-1");
  assert.equal(trimId(""), "");
  assert.equal(trimId(null), "");
  assert.equal(trimId(undefined), "");
  assert.equal(trimId(0), "");
  assert.equal(trimId("0"), "0");
});

test("sequentialId：三位零填充前缀 id", () => {
  assert.equal(sequentialId("fav", 1), "fav-001");
  assert.equal(sequentialId("col", 42), "col-042");
  assert.equal(sequentialId("fav", 1234), "fav-1234");
});

test("nowIso：返回可解析的 ISO 时间戳", () => {
  const iso = nowIso();
  assert.equal(Number.isNaN(Date.parse(iso)), false);
  assert.equal(new Date(iso).toISOString(), iso);
});

test("matchesAnyText：各段换行拼接、大小写不敏感字面命中", () => {
  assert.equal(matchesAnyText(["Attention Is All You Need", "attention.pdf"], "all you"), true);
  assert.equal(matchesAnyText(["Attention", "attention.pdf"], "ATTENTION.PDF"), true);
  assert.equal(matchesAnyText(["标题", null], "标题"), true);
  assert.equal(matchesAnyText([undefined, ""], "x"), false);
});
