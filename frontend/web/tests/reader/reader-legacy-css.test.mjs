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
