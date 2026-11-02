import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import location from "./backup-location.js";

test("backup locations open only the backup directory or a named regular ZIP", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperloom-backup-location-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const opened = [];
  const revealed = [];
  const shell = { openPath: async (file) => { opened.push(file); return ""; }, showItemInFolder: (file) => revealed.push(file) };
  await location.openBackupLocation(root, {}, shell);
  const file = path.join(root, "backups", "paperloom-backup-test.zip");
  fs.writeFileSync(file, "test");
  await location.openBackupLocation(root, { name: "paperloom-backup-test.zip" }, shell);
  await location.openBackupLocation(root, { previous: true }, shell);
  assert.deepEqual(opened, [path.join(root, "backups"), path.join(root, "backups", "before-restore")]);
  assert.deepEqual(revealed, [file]);
  for (const name of ["../webdav.json", "webdav.json", "paperloom-backup-no.zip/../../webdav.json", "C:\\secrets.zip"]) {
    await assert.rejects(location.openBackupLocation(root, { name }, shell), /备份文件名无效/);
  }
  await assert.rejects(location.openBackupLocation(root, { name: "paperloom-backup-test.zip", previous: true }, shell));
  await assert.rejects(location.openBackupLocation(root, {}, { ...shell, openPath: async () => "打开失败" }), /打开失败/);
  assert.equal(fs.readFileSync(file, "utf8"), "test");
});
