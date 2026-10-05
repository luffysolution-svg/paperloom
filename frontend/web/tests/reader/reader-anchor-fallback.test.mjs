import test from "node:test";
import assert from "node:assert/strict";

import { resolveReaderAnchorFallbackPage } from "../../../../frontend/packages/reader/src/hooks/use-reader-react-controller.ts";

test("anchor 回退：page_idx（0 基）+1，page（1 基）直用，number 按 0 基", () => {
  assert.equal(resolveReaderAnchorFallbackPage({ page_idx: 3 }), 4);
  assert.equal(resolveReaderAnchorFallbackPage({ page: 4 }), 4);
  assert.equal(resolveReaderAnchorFallbackPage(2), 3);
  assert.equal(resolveReaderAnchorFallbackPage({ page_idx: 0 }), 1);
  assert.equal(resolveReaderAnchorFallbackPage({ page: 1 }), 1);
});

test("anchor 回退：page_idx 优先于 page；非法值返回 null", () => {
  assert.equal(resolveReaderAnchorFallbackPage({ page_idx: 2, page: 9 }), 3);
  assert.equal(resolveReaderAnchorFallbackPage({}), null);
  assert.equal(resolveReaderAnchorFallbackPage(null), null);
  assert.equal(resolveReaderAnchorFallbackPage(undefined), null);
  assert.equal(resolveReaderAnchorFallbackPage({ page: 0 }), null);
  assert.equal(resolveReaderAnchorFallbackPage({ page_idx: -1 }), null);
});
