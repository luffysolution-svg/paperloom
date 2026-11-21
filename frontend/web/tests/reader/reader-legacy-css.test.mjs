import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const READER_ROOT = join(REPO_ROOT, "frontend/packages/reader");
const STYLES_ROOT = join(READER_ROOT, "styles");
const SCRIPTS_ROOT = join(READER_ROOT, "scripts");

const REMOVED_SHARDS = [
  "chrome-legacy.css",
  "layout-legacy.css",
  "markdown-legacy.css",
  // AI 问答面板（含 ReaderAgentOperationPanel）删掉之后留下的四份皮肤，共 1428 行，
  // 仍然被 entry.css import 进产物，而**一条选择器都命不中**（逐条核过：复合
  // 选择器里只要有一个类零写入者，整条就永远不匹配）。
  //
  // 这个清单原来不含它们，所以没有任何门禁会红。
  "float-ai.css",
  "float-ai-aui.css",
  "float-ai-composer.css",
  "float-ai-operations.css",
];

function cssFilesUnder(root) {
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) pending.push(join(current, entry));
    } else if (current.endsWith(".css")) {
      files.push(current);
    }
  }
  return files.sort();
}

test("legacy Reader CSS shards are deleted", () => {
  for (const name of REMOVED_SHARDS) {
    assert.equal(
      existsSync(join(STYLES_ROOT, name)),
      false,
      `${name} must be deleted; the current entry never imports it`,
    );
  }
});

test("no CSS entry or shard imports a removed legacy file", () => {
  const offenders = [];
  for (const file of cssFilesUnder(STYLES_ROOT).concat(cssFilesUnder(SCRIPTS_ROOT))) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("@import")) continue;
    for (const name of REMOVED_SHARDS) {
      if (source.includes(name)) offenders.push(`${file} -> ${name}`);
    }
  }
  assert.deepEqual(offenders, []);
});
