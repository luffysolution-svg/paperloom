import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_ASSISTANT_PERCENT,
  MAX_ASSISTANT_PERCENT,
  MAX_DOCUMENT_PERCENT,
  MIN_ASSISTANT_PERCENT,
  MIN_DOCUMENT_PERCENT,
  clampAssistantPercent,
  documentPercentForAssistant,
  panelPercent,
} from "../../../../frontend/packages/reader/src/components/react-pdf/reader-ai-split-constraints.ts";
import { normalizeReaderAiSplitLayout } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderAiSplitResizeHandle.tsx";

test("split constraints are one source of truth for defaults and bounds", () => {
  assert.equal(MIN_ASSISTANT_PERCENT, 30);
  assert.equal(MAX_ASSISTANT_PERCENT, 65);
  assert.equal(DEFAULT_ASSISTANT_PERCENT, 50);
  assert.equal(MIN_DOCUMENT_PERCENT, 100 - MAX_ASSISTANT_PERCENT);
  assert.equal(MAX_DOCUMENT_PERCENT, 100 - MIN_ASSISTANT_PERCENT);
  assert.equal(documentPercentForAssistant(DEFAULT_ASSISTANT_PERCENT), 50);
  assert.equal(panelPercent(MIN_ASSISTANT_PERCENT), "30%");
  assert.equal(panelPercent(MAX_ASSISTANT_PERCENT), "65%");
});

test("clampAssistantPercent matches the layout normalizer", () => {
  for (const [input, expected] of [
    [10, MIN_ASSISTANT_PERCENT],
    [90, MAX_ASSISTANT_PERCENT],
    [undefined, DEFAULT_ASSISTANT_PERCENT],
    [Number.NaN, DEFAULT_ASSISTANT_PERCENT],
    [42, 42],
  ]) {
    assert.equal(clampAssistantPercent(input), expected);
    assert.deepEqual(normalizeReaderAiSplitLayout({ "reader-assistant": input }), {
      "reader-document": documentPercentForAssistant(expected),
      "reader-assistant": expected,
    });
  }
});

test("resize handle derives every Panel bound from the shared constraints", async () => {
  const handle = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/ReaderAiSplitResizeHandle.tsx", import.meta.url),
    "utf8",
  );
  // No second set of literals living next to the shared module.
  assert.doesNotMatch(handle, /minSize="\d+%"/);
  assert.doesNotMatch(handle, /maxSize="\d+%"/);
  assert.doesNotMatch(handle, /defaultSize="\d+%"/);
  assert.match(handle, /minSize=\{panelPercent\(MIN_DOCUMENT_PERCENT\)\}/);
  assert.match(handle, /maxSize=\{panelPercent\(MAX_DOCUMENT_PERCENT\)\}/);
  assert.match(handle, /minSize=\{panelPercent\(MIN_ASSISTANT_PERCENT\)\}/);
  assert.match(handle, /maxSize=\{panelPercent\(MAX_ASSISTANT_PERCENT\)\}/);
});
