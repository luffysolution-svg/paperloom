import test from "node:test";
import assert from "node:assert/strict";
import { loadNotes, saveNotes } from "../../../../frontend/packages/reader/src/annotations/storage.ts";

const note = { id: "n1", page: 2, pane: "source", quote: "original", note: "keep", createdAt: "2026-10-11T00:00:00Z" };

function storage(initial = {}) {
  const rows = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, value) => rows.set(key, value),
    removeItem: (key) => rows.delete(key),
  };
  return rows;
}

test("notes survive retranslation of the same document", () => {
  storage();
  saveNotes({ documentId: "doc-a", jobId: "old-job" }, [note]);
  assert.deepEqual(loadNotes({ documentId: "doc-a", jobId: "new-job" }), [note]);
  assert.deepEqual(loadNotes({ documentId: "doc-b", jobId: "other-job" }), []);
});

test("current job legacy notes migrate to their known document without scanning unrelated jobs", () => {
  const rows = storage({
    "retainpdf.reader.notes.v1:job:old-job": JSON.stringify([note]),
    "retainpdf.reader.notes.v1:job:unrelated": JSON.stringify([{ ...note, id: "other" }]),
  });
  assert.deepEqual(loadNotes({ documentId: "doc-a", jobId: "old-job" }), [note]);
  assert.deepEqual(loadNotes({ documentId: "doc-a", jobId: "new-job" }), [note]);
  assert.equal(rows.has("retainpdf.reader.notes.v1:job:unrelated"), true);
});

test("failed migration writes preserve legacy notes", () => {
  const rows = storage({ "retainpdf.reader.notes.v1:job:old-job": JSON.stringify([note]) });
  localStorage.setItem = () => { throw new Error("storage unavailable"); };
  assert.deepEqual(loadNotes({ documentId: "doc-a", jobId: "old-job" }), [note]);
  assert.equal(rows.has("retainpdf.reader.notes.v1:job:old-job"), true);
});
