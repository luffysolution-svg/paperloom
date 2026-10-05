import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadReaderViewState,
  normalizeReaderViewState,
  readerViewStateScope,
  saveReaderViewState,
} from "../../../../frontend/packages/reader/src/shared/state/reader-view-state.ts";

function readerSource(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

test("reader view state persists reading mode alongside anchor/zoom", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  const scope = readerViewStateScope({ documentId: "doc-mode" });
  saveReaderViewState(scope, {
    anchor: { page: 4, fraction: 0.2 },
    zoom: 0.7,
    mode: "translated",
  }, storage);
  assert.deepEqual(loadReaderViewState(scope, storage), {
    schema: "retainpdf_reader_view_v1",
    anchor: { page: 4, fraction: 0.2 },
    zoom: 0.7,
    mode: "translated",
    updatedAt: loadReaderViewState(scope, storage).updatedAt,
  });

  saveReaderViewState(scope, { mode: "compare" }, storage);
  const reloaded = loadReaderViewState(scope, storage);
  assert.equal(reloaded.mode, "compare");
  assert.deepEqual(reloaded.anchor, { page: 4, fraction: 0.2 });
});

test("reader view state rejects unknown modes and keeps legacy payloads clean", () => {
  assert.deepEqual(normalizeReaderViewState({
    schema: "retainpdf_reader_view_v1",
    mode: "side-by-side",
    updatedAt: 5,
  }), {
    schema: "retainpdf_reader_view_v1",
    updatedAt: 5,
  });
  assert.equal(normalizeReaderViewState({
    schema: "retainpdf_reader_view_v1",
    mode: "source",
    updatedAt: 0,
  }).mode, "source");
  assert.equal(normalizeReaderViewState({
    schema: "retainpdf_reader_view_v1",
    updatedAt: 0,
  }).mode, undefined);
});

test("ReaderFab exposes notes as a tool row with a count badge", () => {
  const fab = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFab.tsx",
  );
  assert.match(fab, /ReaderFabToolId = ReaderToolId \| "notes"/);
  assert.match(fab, /notes: StickyNote/);
  assert.match(fab, /reader-fab-row-badge/);
  assert.match(fab, />批注</);
  assert.match(fab, /handleTool\("notes"\)/);
  assert.match(fab, /noteCount/);
});

test("ReaderAppReactPdf routes notes through ReaderFab instead of a duplicate left rail", () => {
  const app = readerSource(
    "../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx",
  );
  assert.match(app, /activeTool=\{fabActiveTool\}/);
  assert.match(app, /noteCount=\{annotations\.count\}/);
  assert.match(app, /onToggleTool=\{handleFabTool\}/);
  assert.doesNotMatch(app, /打开批注/);
});

test("ReaderFab exposes favorites/markdown/ai aligned with the tool registry", () => {
  const fab = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFab.tsx",
  );
  // 与 tools/registry.ts READER_TOOLS 对齐：不再只展示摘录。
  assert.doesNotMatch(fab, /filter\(\(tool\) => tool\.id === "favorites"\)/);
  assert.match(fab, /AUXILIARY_TOOLS = READER_TOOLS/);

  const app = readerSource(
    "../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx",
  );
  // FAB 的 markdown/ai 与 Dock 同行为：走辅助面板 toggle，而非 tools。
  assert.match(app, /if \(id === "markdown" \|\| id === "ai"\)/);
  assert.match(app, /assistantPanel \?\? tools\.active/);
});

test("ReaderAppReactPdf restores and persists reading mode with a sourceViewOnly guard", () => {
  const app = readerSource(
    "../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx",
  );
  assert.match(app, /modeScopeRef/);
  assert.match(app, /sourceViewOnly \? "source" : saved\?\.mode/);
  assert.match(app, /saveReaderViewState\(c\.viewStateKey, \{ mode: c\.mode \}\)/);
});

test("compare column width and reversed panes dead links are removed", () => {
  const shell = readerSource(
    "../../../../frontend/packages/reader/src/hooks/use-reader-shell.ts",
  );
  const grid = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/ReaderCompareGrid.tsx",
  );
  const controller = readerSource(
    "../../../../frontend/packages/reader/src/hooks/use-reader-react-controller.ts",
  );
  const app = readerSource(
    "../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx",
  );
  assert.doesNotMatch(shell, /compareColWidth|onWidthChange|comparePaneWidth/);
  assert.doesNotMatch(grid, /compareColWidth|reversePanes|is-reversed/);
  assert.doesNotMatch(controller, /compareColWidth/);
  assert.doesNotMatch(app, /compareColWidth|reversePanes/);
});
