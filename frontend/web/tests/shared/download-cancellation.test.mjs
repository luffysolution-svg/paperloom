import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<download-toast></download-toast>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
window.showSaveFilePicker = async () => { throw new DOMException("User cancelled", "AbortError"); };
const { downloadProtectedResource } = await import("../../src/features/reader/domain/dialog/downloads.ts");
const { mountArtifactDownloadsFeature } = await import("../../src/features/artifacts/domain/controller.ts");
const { downloadProtectedResponse } = await import("../../src/platform/utils/downloads.ts");

function toastFixture() {
  const states = [];
  let hidden = 0;
  const host = document.querySelector("download-toast");
  host.setState = (state) => states.push(state);
  host.hide = () => { hidden++; };
  return { states, hidden: () => hidden };
}

test("cancelling a processing-result download dismisses its preparing toast and resets the button", async () => {
  const toast = toastFixture();
  const busy = [];
  const feature = mountArtifactDownloadsFeature({ state: {}, fetchProtected: async () => new Response("pdf"), setText() {},
    runtimePort: { currentJobId: () => "job-cancel" },
    viewPort: { isLinkDisabled: () => false, setLinkBusy: (_link, value) => busy.push(value) } });
  const link = document.createElement("a");
  link.id = "pdf-btn";
  link.dataset.url = "/api/v1/jobs/job-cancel/pdf";
  await feature.handleProtectedArtifactClick({ currentTarget: link, preventDefault() {} });
  assert.equal(toast.states[0].visible, true);
  assert.equal(toast.hidden(), 1);
  assert.equal(busy.at(-1), false);
  assert.ok(toast.states.every((state) => state.tone === "progress"));
});

test("cancelling a Reader download dismisses its preparing toast without reporting success", async () => {
  const toast = toastFixture();
  const progress = [];
  const result = await downloadProtectedResource(async () => new Response("pdf"), "/pdf", "paper.pdf", "", value => progress.push(value));
  assert.equal(result, "");
  assert.equal(toast.hidden(), 1);
  assert.deepEqual(progress, []);
});

test("cancelling the save dialog stops the unread response body", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  const result = await downloadProtectedResponse({ fetchResponse: async () => response, fallbackName: "paper.pdf", target: { kind: "aborted" } });
  assert.equal(result, "");
  assert.equal(cancelled, true);
});
