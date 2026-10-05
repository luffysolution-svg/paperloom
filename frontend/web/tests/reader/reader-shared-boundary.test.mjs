import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const READER_SRC = join(REPO_ROOT, "frontend/packages/reader/src");
const SHARED_ROOT = join(READER_SRC, "shared");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

function sourceFilesUnder(root) {
  const pending = [root];
  const files = [];
  while (pending.length > 0) {
    const current = pending.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) pending.push(join(current, entry));
    } else if (SOURCE_EXTENSIONS.has(current.slice(current.lastIndexOf(".")))) {
      files.push(current);
    }
  }
  return files.sort();
}

function importSpecifiers(source) {
  const pattern = /\b(?:import\s*(?:\(|(?:type\s+)?(?:[^"'();]*?\s+from\s+)?)|export\s+(?:type\s+)?[^"';]*?\s+from\s+|require\s*\()\s*["']([^"']+)["']/g;
  return Array.from(source.matchAll(pattern), (match) => match[1]);
}

function isUpwardExternal(specifier) {
  return /(^|\/)external(\.js)?$/.test(specifier);
}

function isUpwardPdf(specifier) {
  return /^(?:\.\.\/)+pdf\//.test(specifier);
}

test("reader shared state/content no longer import pdf or external", () => {
  for (const file of [
    join(SHARED_ROOT, "state/reader-view-state.ts"),
    join(SHARED_ROOT, "content/markdown-render.ts"),
  ]) {
    const specifiers = importSpecifiers(readFileSync(file, "utf8"));
    for (const specifier of specifiers) {
      assert.ok(
        !isUpwardExternal(specifier),
        `${relative(REPO_ROOT, file)} must not import external (${specifier})`,
      );
      assert.ok(
        !isUpwardPdf(specifier),
        `${relative(REPO_ROOT, file)} must not import pdf (${specifier})`,
      );
    }
  }
});

test("shared/ has no upward references to pdf/ or external", () => {
  const offenders = [];
  for (const file of sourceFilesUnder(SHARED_ROOT)) {
    for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
      const upward = isUpwardExternal(specifier) || isUpwardPdf(specifier);
      if (!upward) continue;
      offenders.push(`${relative(REPO_ROOT, file)} -> ${specifier}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("pane id type lives in shared/types and is still re-exported by the DOM contract", () => {
  const sharedType = join(SHARED_ROOT, "types/reader-dom.ts");
  assert.ok(existsSync(sharedType), "shared/types/reader-dom.ts must exist");
  assert.match(readFileSync(sharedType, "utf8"), /export type ReaderPaneId/);

  const contract = readFileSync(join(READER_SRC, "pdf/reader-dom-contract.ts"), "utf8");
  assert.match(
    contract,
    /export type \{ ReaderPaneId \} from "\.\.\/shared\/types\/reader-dom\.js"/,
    "pdf/reader-dom-contract.ts must keep re-exporting ReaderPaneId",
  );
});

test("scroll progress type lives in shared/types and is still re-exported by pdf shell", () => {
  const sharedType = join(SHARED_ROOT, "types/reader-scroll.ts");
  assert.ok(existsSync(sharedType), "shared/types/reader-scroll.ts must exist");
  assert.match(readFileSync(sharedType, "utf8"), /export type PageScrollProgress/);

  const shell = readFileSync(join(READER_SRC, "pdf/scroll-to-page.ts"), "utf8");
  assert.match(
    shell,
    /export type \{ PageScrollProgress \} from "\.\.\/shared\/types\/reader-scroll\.js"/,
    "pdf/scroll-to-page.ts must keep re-exporting PageScrollProgress",
  );
});

test("assistant panel type lives in a leaf so context does not import the dock", () => {
  const leaf = join(READER_SRC, "components/react-pdf/reader-assistant-types.ts");
  assert.ok(existsSync(leaf), "reader-assistant-types.ts must exist");
  assert.match(readFileSync(leaf, "utf8"), /export type ReaderAssistantPanel/);

  const context = readFileSync(
    join(READER_SRC, "components/react-pdf/reader-context.tsx"),
    "utf8",
  );
  assert.doesNotMatch(context, /from "\.\/ReaderAssistantDock\.js"/);
  assert.match(context, /from "\.\/reader-assistant-types\.js"/);

  const dock = readFileSync(
    join(READER_SRC, "components/react-pdf/ReaderAssistantDock.tsx"),
    "utf8",
  );
  assert.match(dock, /export type \{ ReaderAssistantPanel \} from "\.\/reader-assistant-types\.js"/);
});
