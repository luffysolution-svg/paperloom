import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

import { ReaderErrorNotice } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderErrorNotice.tsx";
import { ReaderReactBoot } from "../../../../frontend/packages/reader/src/components/react-pdf/ReaderReactBoot.tsx";
import { useReaderReactController } from "../../../../frontend/packages/reader/src/hooks/use-reader-react-controller.ts";
import { setReaderAdapters } from "../../../../frontend/packages/reader/src/adapters.ts";

function installDom(url = "http://localhost/reader.html?job_id=job-errors") {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url,
    pretendToBeVisual: true,
  });
  const keys = [
    "window",
    "document",
    "history",
    "location",
    "localStorage",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "MutationObserver",
    "getSelection",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, globalThis[key]]));
  for (const key of keys) {
    const value = key === "getSelection"
      ? dom.window.getSelection.bind(dom.window)
      : [
          "requestAnimationFrame",
          "cancelAnimationFrame",
          "addEventListener",
          "removeEventListener",
          "dispatchEvent",
        ].includes(key)
        ? dom.window[key].bind(dom.window)
        : dom.window[key];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return {
    dom,
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
      }
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

function readerSource(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

// —— 呈现层 ——

test("ReaderErrorNotice renders nothing on the happy path", () => {
  assert.equal(
    renderToStaticMarkup(createElement(ReaderErrorNotice, {})),
    "",
  );
  assert.equal(
    renderToStaticMarkup(createElement(ReaderErrorNotice, {
      regionsFailed: false,
      metadataFailed: false,
    })),
    "",
  );
});

test("ReaderErrorNotice states which optional artifact failed and keeps reading viable", () => {
  const regions = renderToStaticMarkup(createElement(ReaderErrorNotice, { regionsFailed: true }));
  assert.match(regions, /译文区域加载失败，正文仍可正常阅读/);
  assert.match(regions, /data-reader-error-notice="true"/);
  assert.match(regions, /aria-label="关闭提示"/);

  const metadata = renderToStaticMarkup(createElement(ReaderErrorNotice, { metadataFailed: true }));
  assert.match(metadata, /阅读元数据加载失败，正文仍可正常阅读/);
  assert.doesNotMatch(metadata, /译文区域/);

  const both = renderToStaticMarkup(createElement(ReaderErrorNotice, {
    regionsFailed: true,
    metadataFailed: true,
  }));
  assert.match(both, /译文区域、阅读元数据加载失败/);
});

test("ReaderReactBoot shows the notice only after a clean boot and never reuses the fatal screen", () => {
  const loading = renderToStaticMarkup(createElement(ReaderReactBoot, {
    loading: true,
    failed: false,
    text: "正在加载",
    percent: 40,
    regionsError: true,
  }));
  assert.match(loading, /reader-boot-loading/);
  assert.doesNotMatch(loading, /reader-error-notice/);

  const fatal = renderToStaticMarkup(createElement(ReaderReactBoot, {
    loading: false,
    failed: true,
    text: "PDF 下载失败，请重试",
    percent: 100,
    regionsError: true,
  }));
  assert.match(fatal, /reader-react-error/);
  assert.doesNotMatch(fatal, /reader-error-notice/);

  const readyWithError = renderToStaticMarkup(createElement(ReaderReactBoot, {
    loading: false,
    failed: false,
    text: "对照阅读已就绪",
    percent: 100,
    regionsError: true,
    metadataError: true,
  }));
  assert.match(readyWithError, /reader-error-notice/);
  assert.doesNotMatch(readyWithError, /reader-react-error/);
  assert.doesNotMatch(readyWithError, /reader-boot-loading/);

  const readyHappy = renderToStaticMarkup(createElement(ReaderReactBoot, {
    loading: false,
    failed: false,
    text: "对照阅读已就绪",
    percent: 100,
  }));
  assert.doesNotMatch(readyHappy, /reader-error-notice/);
});

test("ReaderErrorNotice can be dismissed without leaving the reader shell and re-arms on a fresh failure", async () => {
  const env = installDom("http://localhost/reader.html");
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => {
      root.render(createElement(ReaderErrorNotice, { regionsFailed: true }));
    });
    assert.ok(document.querySelector(".reader-error-notice"));
    await act(async () => {
      document.querySelector(".reader-error-notice-dismiss").click();
    });
    assert.equal(document.querySelector(".reader-error-notice"), null);

    await act(async () => {
      root.render(createElement(ReaderErrorNotice, {}));
    });
    await act(async () => {
      root.render(createElement(ReaderErrorNotice, { metadataFailed: true }));
    });
    assert.ok(document.querySelector(".reader-error-notice"));
  } finally {
    await act(async () => root.unmount());
    env.restore();
  }
});

// —— 会话透出：data-port → session-assets → session → controller ——

test("reader session exposes optional artifact failures from the payload", async () => {
  const env = installDom();
  const root = createRoot(document.getElementById("root"));
  let latest = null;
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

  setReaderAdapters({
    isMockMode: () => false,
    resolveResourceUrl: (url) => url,
    resolveReaderJobId: () => "job-errors",
    resolveReaderDocumentId: () => "",
    resolveReaderSourcePdf: (manifest) => manifest.source_url,
    resolveReaderTranslatedPdfUrl: () => "",
    resolveReaderArtifactUrl: () => "",
    defaultReaderPageConfigPort: { messageTargetOrigin: () => "*" },
    defaultReaderDataPort: {
      fetchProtected: async () => ({
        ok: true,
        arrayBuffer: async () => pdfBytes.buffer.slice(0),
      }),
      loadReaderPayload: async (jobId) => ({
        jobPayload: { job_id: jobId, status: "succeeded", workflow: "ocr" },
        manifestPayload: { source_url: `/${jobId}.pdf` },
        regionsPayload: { items: [] },
        readerMetadata: null,
        readerErrors: {
          regions: new Error("regions unavailable"),
          metadata: new Error("metadata unavailable"),
        },
      }),
    },
  });

  function Harness() {
    latest = useReaderReactController();
    return null;
  }

  const waitFor = async (predicate, description) => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (predicate()) return;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
    assert.fail(`等待超时：${description}`);
  };

  try {
    await act(async () => root.render(createElement(Harness)));
    await waitFor(
      () => latest?.session.assetsReady && latest.session.jobId === "job-errors",
      "error session ready",
    );
    assert.equal(latest.session.readerErrors.regions.message, "regions unavailable");
    assert.equal(latest.session.readerErrors.metadata.message, "metadata unavailable");
  } finally {
    await act(async () => root.unmount());
    setReaderAdapters(null);
    env.restore();
  }
});

// —— 键盘「0」与可见模式同源 ——

test("reader keyboard binds its zoom reset to the visible PDF mode", () => {
  const app = readerSource("../../../../frontend/packages/reader/src/ReaderAppReactPdf.tsx");
  assert.match(app, /useReaderKeyboard\(\{[\s\S]*?mode:\s*visiblePdfMode/);

  const controller = readerSource(
    "../../../../frontend/packages/reader/src/hooks/use-reader-react-controller.ts",
  );
  assert.doesNotMatch(controller, /useReaderKeyboard/);
});
