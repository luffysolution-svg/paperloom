import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ReaderProvider,
} from "../../../../frontend/packages/reader/src/components/react-pdf/reader-context.tsx";
import { ReaderZoomHud } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderZoomHud.tsx";
import { ReaderWorkspaceTabs } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderWorkspaceTabs.tsx";
import { ReaderAssistantDock } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderAssistantDock.tsx";
import { ReaderFab } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFab.tsx";
import {
  ReaderFabDownloadSection,
  ReaderFabToolRow,
} from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFabMenu.tsx";
import {
  FAB_DOWNLOAD_ORDER,
  resolveFabDownloadUrls,
} from "../../../../frontend/packages/reader/src/components/react-pdf/use-reader-fab-downloads.ts";
import {
  clampFabPos,
  loadFabPos,
  saveFabPos,
} from "../../../../frontend/packages/reader/src/components/react-pdf/use-reader-fab-position.ts";

const NOOP = () => {};

function readerSource(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function withProvider(value, hud, node) {
  return renderToStaticMarkup(
    createElement(ReaderProvider, { value, hud }, node),
  );
}

test("zoom hud reads userZoom from reader context and page from hud context", () => {
  const markup = withProvider(
    { userZoom: 0.65, onZoomChange: NOOP, goToPage: NOOP },
    { currentPage: 7, numPages: 42 },
    createElement(ReaderZoomHud, { mode: "compare", modeControls: null }),
  );
  assert.match(markup, />65%</);
  assert.match(markup, /7 \/ 42/);
});

test("explicit zoom hud props override the context", () => {
  const markup = withProvider(
    { userZoom: 0.65, onZoomChange: NOOP, goToPage: NOOP },
    { currentPage: 7, numPages: 42 },
    createElement(ReaderZoomHud, {
      userZoom: 0.8,
      currentPage: 3,
      numPages: 10,
      mode: "compare",
      modeControls: null,
    }),
  );
  assert.match(markup, />80%</);
  assert.match(markup, /3 \/ 10/);
});

test("zoom hud still renders standalone with props and no provider", () => {
  const markup = renderToStaticMarkup(createElement(ReaderZoomHud, {
    userZoom: 0.5,
    currentPage: 1,
    numPages: 5,
    mode: "compare",
    modeControls: null,
  }));
  assert.match(markup, />50%</);
  assert.match(markup, /1 \/ 5/);
});

test("workspace tabs take sourceOnly from context and keep disabled copy", () => {
  const markup = withProvider(
    { sourceViewOnly: true },
    { currentPage: 1, numPages: 1 },
    createElement(ReaderWorkspaceTabs, {
      mode: "source",
      documentReady: true,
      onModeChange: NOOP,
    }),
  );
  assert.match(markup, /对照 需要文档任务/);
  assert.match(markup, /翻译文件 需要文档任务/);
});

test("assistant dock falls back to context callbacks without crashing", () => {
  const markup = withProvider(
    { assistant: { select: NOOP, close: NOOP } },
    { currentPage: 1, numPages: 1 },
    createElement(ReaderAssistantDock, { active: null }),
  );
  assert.match(markup, /reader-assistant-rail/);
  assert.match(markup, /aria-label="打开Markdown"/);
});

function downloadContext(overrides = {}) {
  return {
    fetchProtected: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
    jobId: "",
    jobPayload: null,
    manifestPayload: null,
    sourceUrl: "http://reader.local/source.pdf",
    translatedUrl: "http://reader.local/translated.pdf",
    sourceOnly: true,
    ...overrides,
  };
}

test("fab consumes download/sourceOnly from context and renders the trigger", () => {
  const markup = withProvider(
    { sourceOnly: true, download: downloadContext() },
    { currentPage: 1, numPages: 1 },
    createElement(ReaderFab, {
      activeTool: null,
      noteCount: 0,
      onToggleTool: NOOP,
    }),
  );
  assert.match(markup, /reader-fab-trigger/);
  assert.match(markup, /aria-label="打开工具菜单"/);
});

test("fab download urls keep source-only artifacts and never fall back sideBySide", () => {
  assert.deepEqual(FAB_DOWNLOAD_ORDER, ["source", "sideBySide", "translated"]);
  assert.deepEqual(resolveFabDownloadUrls(downloadContext()), {
    source: "http://reader.local/source.pdf",
    translated: "http://reader.local/translated.pdf",
    sideBySide: "",
  });
});

test("fab download section keeps grid classes, busy state and disabled reason", () => {
  const markup = renderToStaticMarkup(createElement(ReaderFabDownloadSection, {
    urls: { source: "http://reader.local/source.pdf", translated: "", sideBySide: "" },
    items: ["source", "translated"],
    busyActions: new Set(["source"]),
    onDownload: NOOP,
  }));
  assert.match(markup, /reader-fab-download-grid/);
  assert.match(markup, /reader-fab-chip is-busy/);
  assert.match(markup, /reader-fab-chip-label">原文</);
  assert.match(markup, /译文 PDF 尚未生成或清单不可用/);
});

test("fab tool row keeps the menu row contract", () => {
  const Icon = () => createElement("i");
  const markup = renderToStaticMarkup(createElement(ReaderFabToolRow, {
    index: 1,
    icon: Icon,
    title: "摘录",
    sub: "本书云端收藏",
    active: false,
    disabled: false,
    onClick: NOOP,
  }));
  assert.match(markup, /role="menuitem"/);
  assert.match(markup, /reader-fab-row-title">摘录</);
});

test("fab position helpers clamp to viewport and persist", () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  try {
    globalThis.window = { innerWidth: 1000, innerHeight: 800 };
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    assert.deepEqual(clampFabPos(5000, 5000), { x: 936, y: 736 });
    assert.deepEqual(clampFabPos(-50, -50), { x: 12, y: 12 });
    saveFabPos({ x: 120, y: 240 });
    assert.deepEqual(loadFabPos(), { x: 120, y: 240 });
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});

test("ReaderFab delegates drag/menu/download/menu rows to sibling modules", () => {
  const fab = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFab.tsx",
  );
  assert.match(fab, /useReaderFabPosition\(/);
  assert.match(fab, /useReaderFabMenu\(/);
  assert.match(fab, /useReaderFabDownloads\(/);
  assert.match(fab, /ReaderFabDownloadSection/);
  assert.match(fab, /from "\.\/ReaderFabMenu\.js"/);
  assert.ok(fab.split("\n").length < 300, "ReaderFab.tsx should shrink below 300 lines");

  const menu = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/ReaderFabMenu.tsx",
  );
  assert.match(menu, /READER_DOWNLOAD_ACTIONS/);
  assert.match(menu, /readerDownloadDisabledReason/);

  const downloads = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/use-reader-fab-downloads.ts",
  );
  assert.match(downloads, /downloadProtectedResource/);

  const position = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/use-reader-fab-position.ts",
  );
  assert.match(position, /DRAG_THRESHOLD/);
  assert.match(position, /localStorage/);

  const menuHook = readerSource(
    "../../../../frontend/packages/reader/src/components/react-pdf/use-reader-fab-menu.ts",
  );
  assert.match(menuHook, /mousedown/);
  assert.match(menuHook, /Escape/);
});

test("ReaderAppReactPdf provides context and stops drilling controller props", () => {
  const app = readerSource("../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx");
  assert.match(app, /<ReaderProvider value=\{readerContext\} hud=\{readerHud\}>/);
  assert.match(app, /from "\.\/components\/react-pdf\/reader-context\.js"/);
  // 这些此前纯透传的 props 不再出现在 use-site。
  for (const prop of [
    "bindShell={",
    "shellEl={",
    "mountSource={",
    "mountTranslated={",
    "sourceUrl={",
    "translatedUrl={",
    "activeRegion={",
    "onMetrics={",
    "onNumPagesChange={",
    "userZoom={",
    "onZoomChange={",
    "currentPage={",
    "numPages={",
  ]) {
    assert.doesNotMatch(app, new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
