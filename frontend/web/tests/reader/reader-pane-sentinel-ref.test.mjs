import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const paneSource = readFileSync(
  new URL("../../../../frontend/packages/reader/src/pdf/PdfDocumentPane.tsx", import.meta.url),
  "utf8",
);

test("pane hands each page a stable sentinel ref callback", () => {
  assert.doesNotMatch(paneSource, /sentinelRef=\{\(el\) => registerSentinel/);
  assert.doesNotMatch(paneSource, /ref=\{\(el\) => registerSentinel/);
  assert.match(paneSource, /const getSentinelRef = useCallback\(\(pn: number\) => \{/);
  assert.match(paneSource, /sentinelRef=\{getSentinelRef\(pageNumber\)\}/);
  assert.match(paneSource, /ref=\{getSentinelRef\(pageNumber\)\}/);
});

test("stable sentinel callbacks are cached per page and still register the element", () => {
  const source = paneSource;
  assert.match(source, /sentinelCallbacksRef = useRef<Map<number, \(el: HTMLDivElement \| null\) => void>>\(new Map\(\)\)/);
  assert.match(source, /callback = \(el: HTMLDivElement \| null\) => registerSentinel\(pn, el\)/);
  assert.match(source, /callbacks\.set\(pn, callback\)/);
});
