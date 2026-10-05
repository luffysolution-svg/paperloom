import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const slotUrl = new URL("../../../../frontend/packages/reader/src/pdf/PdfPageSlot.tsx", import.meta.url);
const paneUrl = new URL("../../../../frontend/packages/reader/src/pdf/PdfDocumentPane.tsx", import.meta.url);

test("PdfPageSlot dropped the unused scrollRoot prop and write-only ref", async () => {
  const slot = await readFile(slotUrl, "utf8");
  assert.doesNotMatch(slot, /scrollRoot/);
  // The pane-level observer still needs scrollRoot, but the leaf must not.
  assert.doesNotMatch(slot, /slotRef/);
  // The stable per-page sentinel forwarding must survive the cleanup.
  assert.match(slot, /sentinelRefRef\.current\?\.\(el\)/);
  assert.match(slot, /ref=\{sentinelCallbackRef\}/);
});

test("PdfDocumentPane keeps its external scrollRoot prop but stops forwarding it", async () => {
  const pane = await readFile(paneUrl, "utf8");
  assert.match(pane, /scrollRoot\?: HTMLElement \| null/);
  const slotUsage = pane.match(/<PdfPageSlot[\s\S]*?\/>/)?.[0] ?? "";
  assert.ok(slotUsage, "expected a <PdfPageSlot ... /> render");
  assert.doesNotMatch(slotUsage, /scrollRoot/);
  assert.match(slotUsage, /sentinelRef=\{getSentinelRef\(pageNumber\)\}/);
});
