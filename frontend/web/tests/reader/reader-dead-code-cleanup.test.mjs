import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { READER_DIALOG_MESSAGES } from "../../src/features/reader/domain/dialog/contract.ts";
import * as dialogRuntimePort from "../../src/features/reader/domain/dialog/runtime-port.ts";

const readerSrc = (relativePath) =>
  fileURLToPath(new URL(`../../../../frontend/packages/reader/src/${relativePath}`, import.meta.url));
const webSrc = (relativePath) =>
  fileURLToPath(new URL(`../../src/${relativePath}`, import.meta.url));

// 无引用死代码清理的守卫。删除依据：grep 全仓确认这些符号在 reader 内无调用方，
// 仅剩端口声明与宿主注入自循环，故从声明与宿主接线一并删除。

test("reader data port no longer declares/accepts loadTranslationItem", () => {
  const source = readFileSync(readerSrc("shared/data/data-port.ts"), "utf8");
  assert.doesNotMatch(source, /loadTranslationItem/);
});

test("web host data port no longer injects fetchTranslationItem", () => {
  const source = readFileSync(webSrc("features/reader/domain/host/data.ts"), "utf8");
  assert.doesNotMatch(source, /fetchTranslationItem/);
  assert.doesNotMatch(source, /getMockTranslationItem/);
  assert.doesNotMatch(source, /@retainpdf\/api\/translation-debug/);
});

test("dead defaultReaderDialogRuntimePort is removed while the factory stays", () => {
  assert.equal(
    Object.hasOwn(dialogRuntimePort, "defaultReaderDialogRuntimePort"),
    false,
  );
  assert.equal(typeof dialogRuntimePort.createReaderDialogRuntimePort, "function");
});

test("host READER_DIALOG_MESSAGES mirror matches the package runtime source", () => {
  const packageExternal = readFileSync(readerSrc("external.ts"), "utf8");
  const match = packageExternal.match(
    /READER_DIALOG_MESSAGES\s*=\s*Object\.freeze\(\{\s*progress:\s*"([^"]+)"/,
  );
  assert.ok(match, "package external.ts must define READER_DIALOG_MESSAGES");
  assert.equal(READER_DIALOG_MESSAGES.progress, match[1]);
  assert.equal(READER_DIALOG_MESSAGES.progress, "retainpdf-reader-progress");
});
