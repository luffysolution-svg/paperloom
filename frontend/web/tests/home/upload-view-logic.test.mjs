import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveFileLabel,
  resolveUploadProgress,
} from "../../src/features/ingest/domain/upload/view-derivations.js";
import { createUploadViewStore } from "../../src/features/ingest/domain/upload/view-store.js";

test("resolveUploadProgress computes percent or falls back to indeterminate", () => {
  assert.deepEqual(resolveUploadProgress(50, 100), { percent: 50, text: "上传中 50%" });
  assert.deepEqual(resolveUploadProgress(150, 100), { percent: 100, text: "上传中 100%" });
  assert.deepEqual(resolveUploadProgress(0, 0), { percent: 18, text: "上传中" });
  assert.deepEqual(resolveUploadProgress(Number.NaN, 100), { percent: 18, text: "上传中" });
});

test("resolveFileLabel uses file name or the default label", () => {
  assert.deepEqual(resolveFileLabel({ name: "book.pdf" }, "默认"), {
    label: "book.pdf",
    labelTitle: "book.pdf",
  });
  assert.deepEqual(resolveFileLabel(null, "默认"), { label: "默认", labelTitle: "" });
});

test("createUploadViewStore applies extracted action reducers", () => {
  const store = createUploadViewStore();
  assert.equal(store.getSnapshot().label, "添加 PDF");

  store.actions.setTileText({ label: "book.pdf", labelTitle: "book.pdf", status: "就绪", statusVisible: true });
  assert.equal(store.getSnapshot().label, "book.pdf");
  assert.equal(store.getSnapshot().labelTitle, "book.pdf");
  assert.equal(store.getSnapshot().status, "就绪");
  assert.equal(store.getSnapshot().statusVisible, true);

  store.actions.setProgress({ percent: 42, text: "上传中 42%" });
  assert.equal(store.getSnapshot().progressVisible, true);
  assert.equal(store.getSnapshot().uploading, true);
  assert.equal(store.getSnapshot().progressPercent, 42);

  store.actions.resetUploadedFileView();
  assert.equal(store.getSnapshot().uploading, false);
  assert.equal(store.getSnapshot().status, "未上传文件");
  assert.equal(store.getSnapshot().label, "点击选择文件或拖到这里");
});
