import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/reader.html?job_id=job-markdown",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "document",
  "history",
  "location",
  "localStorage",
  "HTMLElement",
  "Element",
  "Event",
  "Node",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    writable: true,
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { setReaderAdapters } = await import("../../../../frontend/packages/reader/src/adapters.ts");
const { createReaderDataPort } = await import(
  "../../../../frontend/packages/reader/src/shared/data/data-port.ts"
);
const {
  ReaderMarkdownPanel,
  buildMarkdownOutline,
  findMarkdownSearchTargets,
  isProtectedMarkdownAssetUrl,
  startMarkdownImageLoading,
} = await import(
  "../../../../frontend/packages/reader/src/components/react-pdf/ReaderMarkdownPanel.tsx"
);
const {
  resetMarkdownMathEngineLoader,
  setMarkdownMathEngineLoader,
} = await import("../../../../frontend/packages/reader/src/shared/content/markdown-math.ts");
const { takeCompleteMarkdownChunk } = await import(
  "../../../../frontend/packages/reader/src/shared/content/markdown-windowing.ts"
);
const { retainPdfReaderAdapters } = await import(
  "../../src/app/reader/adapters/retainpdf.ts"
);
// parseMarkdownWithMath 由 reader 包直接导出，不属于 ReaderAdapters 注入面；
// 注册对象只应包含声明字段（避免 `...ext` 静默带入）。
const { parseMarkdownWithMath } = await import(
  "../../../../frontend/packages/reader/src/external.ts"
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await wait(10);
  }
  const status = dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent;
  const markdown = dom.window.document.querySelector("#reader-markdown-content")?.textContent;
  const image = dom.window.document.querySelector("#reader-markdown-content img");
  assert.fail(`等待超时：${description}; status=${status}; markdown=${markdown}; image=${image?.outerHTML}`);
}

test("OCR-only legacy Markdown and its protected image render in the reader panel", async () => {
  assert.equal(typeof parseMarkdownWithMath, "function");
  assert.equal(typeof retainPdfReaderAdapters.resolveMarkdownAssetUrl, "function");

  const calls = [];
  const dataPort = createReaderDataPort({
    loadMarkdownDocument: async (jobId) => {
      calls.push(`document:${jobId}`);
      return { ready: false, content: "" };
    },
    loadMarkdown: async (jobId) => {
      calls.push(`legacy:${jobId}`);
      return {
        ready: true,
        markdown: "# Visible OCR Markdown\n\n![OCR figure](images/page-1/figure.png)",
        images_base_url: "/api/v1/jobs/job-ocr/markdown/images/",
      };
    },
    fetchProtectedResource: async (url) => {
      calls.push(`image:${url}`);
      return {
        ok: true,
        blob: async () => new Blob(["ocr-image"], { type: "image/png" }),
      };
    },
  });
  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: dataPort,
    fetchProtected: dataPort.fetchProtected,
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    // document_id + active_job_id resolves to a real OCR job before this panel opens.
    jobId: "job-ocr",
    sourceOnly: false,
    layout: "docked",
    onClose: () => {},
  }));

  await waitFor(
    () => (
      dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "Visible OCR Markdown"
      && dom.window.document.querySelector("#reader-markdown-content img")?.src.startsWith("blob:")
      && dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent === "已加载"
    ),
    "OCR Markdown 正文与受保护图片渲染完成",
  );
  const image = dom.window.document.querySelector("#reader-markdown-content img");
  assert.equal(
    image?.getAttribute("data-reader-md-src"),
    "/api/v1/jobs/job-ocr/markdown/images/page-1/figure.png",
  );
  assert.deepEqual(calls, [
    "document:job-ocr",
    "legacy:job-ocr",
    "image:/api/v1/jobs/job-ocr/markdown/images/page-1/figure.png",
  ]);
  assert.equal(
    dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent,
    "已加载",
  );
  assert.ok(
    dom.window.document.querySelector("#reader-markdown-panel")?.classList.contains("reader-notes-panel--docked"),
  );
  assert.equal(
    dom.window.document.querySelector("#reader-markdown-panel .reader-notes-panel-drag"),
    null,
  );

  root.unmount();
  host.remove();
  setReaderAdapters(null);
});

test("Markdown body paints before a delayed MathJax engine finishes", async () => {
  setMarkdownMathEngineLoader(async () => {
    await wait(120);
    return {
      convert: (tex, display) => `<svg data-tex="${tex}" data-display="${display}"></svg>`,
    };
  });
  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownPayload: async () => ({
        ready: true,
        markdown: "# Progressive\n\nFormula $x_i$ is visible.",
      }),
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId: "job-progressive",
    sourceOnly: false,
    onClose: () => {},
  }));

  await waitFor(
    () => (
      dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "Progressive"
      && /正文已显示/.test(
        dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent || "",
      )
    ),
    "MathJax 完成前先显示 Markdown 正文",
  );
  assert.match(
    dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent || "",
    /正文已显示/,
  );
  assert.ok(dom.window.document.querySelector("#reader-markdown-content .reader-md-math-failed"));

  await waitFor(
    () => Boolean(dom.window.document.querySelector("#reader-markdown-content svg[data-tex='x_i']")),
    "后台完成 MathJax SVG 升级",
  );

  root.unmount();
  host.remove();
  resetMarkdownMathEngineLoader();
  setReaderAdapters(null);
});

test("only local Markdown API images use the protected credentialed fetch path", () => {
  assert.equal(
    isProtectedMarkdownAssetUrl(
      "http://127.0.0.1:41000/api/v1/jobs/job-1/markdown/images/page-1/a.png",
    ),
    true,
  );
  assert.equal(
    isProtectedMarkdownAssetUrl("/api/v1/jobs/job-1/markdown/images/page-1/a.png"),
    true,
  );
  assert.equal(isProtectedMarkdownAssetUrl("https://example.test/public.png"), false);
  assert.equal(
    isProtectedMarkdownAssetUrl("https://attacker.test/api/v1/jobs/job-1/markdown/images/a.png"),
    false,
  );
  assert.equal(isProtectedMarkdownAssetUrl("data:image/png;base64,AA=="), false);
});

test("Markdown outline assigns stable duplicate-safe heading anchors", () => {
  const article = dom.window.document.createElement("article");
  article.innerHTML = "<h1>结果与讨论</h1><h2>Energy Profile</h2><h2>Energy Profile</h2><h3></h3>";

  assert.deepEqual(buildMarkdownOutline(article), [
    { id: "reader-md-结果与讨论", level: 1, text: "结果与讨论" },
    { id: "reader-md-energy-profile", level: 2, text: "Energy Profile" },
    { id: "reader-md-energy-profile-2", level: 2, text: "Energy Profile" },
  ]);
  assert.deepEqual(
    [...article.querySelectorAll("h1, h2")].map((heading) => heading.id),
    ["reader-md-结果与讨论", "reader-md-energy-profile", "reader-md-energy-profile-2"],
  );
});

test("Markdown search marks leaf content blocks without duplicating parent matches", () => {
  const article = dom.window.document.createElement("article");
  article.innerHTML = `
    <h2>Experiment</h2>
    <blockquote><p>The catalyst is stable.</p></blockquote>
    <p>A second catalyst appears.</p>
  `;

  const matches = findMarkdownSearchTargets(article, "CATALYST");
  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((element) => element.tagName), ["P", "P"]);
  assert.ok(matches.every((element) => element.classList.contains("reader-markdown-search-hit")));
  assert.equal(findMarkdownSearchTargets(article, "missing").length, 0);
  assert.equal(article.querySelectorAll(".reader-markdown-search-hit").length, 0);
});

test("protected Markdown images wait for the reader viewport before fetching", async () => {
  const previousObserver = globalThis.IntersectionObserver;
  let observerCallback = null;
  const observed = [];
  class FakeIntersectionObserver {
    constructor(callback, options) {
      observerCallback = callback;
      this.options = options;
    }
    observe(target) { observed.push(target); }
    unobserve() {}
    disconnect() {}
  }
  globalThis.IntersectionObserver = FakeIntersectionObserver;

  const root = dom.window.document.createElement("div");
  const image = dom.window.document.createElement("img");
  image.setAttribute(
    "data-reader-md-src",
    "/api/v1/jobs/job-1/markdown/images/page-1/figure.png",
  );
  root.appendChild(image);
  dom.window.document.body.appendChild(root);
  let fetchCount = 0;
  const cleanup = startMarkdownImageLoading([image], {
    root,
    fetchImage: async () => {
      fetchCount += 1;
      return { ok: true, blob: async () => new Blob(["png"]) };
    },
    onObjectUrl: () => {},
  });

  assert.equal(fetchCount, 0);
  assert.deepEqual(observed, [image]);
  assert.equal(image.getAttribute("src"), null);
  observerCallback([{ isIntersecting: true, target: image }]);
  await waitFor(() => fetchCount === 1 && Boolean(image.src), "图片进入阅读视口后才请求 blob");

  cleanup();
  root.remove();
  globalThis.IntersectionObserver = previousObserver;
});

test("mock markdown also flows through the Range path", async () => {
  dom.window.history.replaceState({}, "", "/reader.html?mock=succeeded&job_id=job-markdown");
  try {
    const { defaultReaderDataPort } = await import(
      "../../src/features/reader/domain/host/data.ts"
    );
    const source = await defaultReaderDataPort.loadMarkdownSource("mock-job-20260415");
    assert.ok(source?.rawUrl?.startsWith("mock://"), "mock 也提供 Range 来源");
    const first = await defaultReaderDataPort.loadMarkdownRange(source.rawUrl, 0, 63);
    assert.equal(first.status, 206);
    assert.ok(first.bytes.length > 0, "mock 切片返回字节");
    assert.equal(first.rangeEnd, first.bytes.length - 1);
    assert.equal(first.totalBytes, source.totalBytes);
  } finally {
    dom.window.history.replaceState({}, "", "/reader.html?job_id=job-markdown");
  }
});

test("markdown windowing slices at top-level blank lines and never inside a fence", () => {
  const text = "para one\n\n```\ncode\n\ncode\n```\n\npara two\n\npara three\n";
  const first = takeCompleteMarkdownChunk(text, { minChars: 1 });
  assert.equal(first.complete, "para one\n\n");
  // 围栏内的空行不算边界；第二块跨过整个代码块
  const second = takeCompleteMarkdownChunk(first.rest, { minChars: 1 });
  assert.equal(second.complete, "```\ncode\n\ncode\n```\n\n");
  assert.equal(takeCompleteMarkdownChunk("no blank line yet", { minChars: 1 }), null);
  assert.equal(takeCompleteMarkdownChunk("short\n\n", { minChars: 100 }), null);
});

test("reader markdown reads via HTTP Range and renders incrementally", async () => {
  const paragraphs = Array.from(
    { length: 30 },
    (_, index) => `第 ${index} 段 中文内容 ${"x".repeat(400)}`,
  );
  const full = `# 分段标题 Range\n\n${paragraphs.join("\n\n")}\n`;
  const bytes = new TextEncoder().encode(full);
  const calls = [];
  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownSource: async () => ({
        rawUrl: "/api/v1/jobs/job-range/markdown?raw=true",
        totalBytes: bytes.length,
        imagesBaseUrl: "",
      }),
      loadMarkdownRange: async (_url, start, end) => {
        calls.push([start, end]);
        // 每次只回 64 字节，强制走多段 Range；跨块多字节由单 TextDecoder 承担
        const length = Math.max(0, Math.min(end - start + 1, 64, bytes.length - start));
        const slice = bytes.slice(start, start + length);
        return {
          status: 206,
          bytes: slice,
          totalBytes: bytes.length,
          rangeEnd: start + slice.length - 1,
          etag: 'W/"v1"',
        };
      },
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId: "job-range",
    sourceOnly: false,
    onClose: () => {},
  }));

  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "分段标题 Range",
    "Range 首块渲染",
  );
  await waitFor(
    () => dom.window.document.querySelectorAll("#reader-markdown-content .reader-markdown-chunk p").length >= 30,
    "全部段落增量渲染",
  );
  assert.ok(calls.length > 1, "应分多次 Range 拉取，而不是整篇一次");
  assert.equal(calls[0][0], 0, "首段从 0 开始");
  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent === "已加载",
    "加载完成后状态回到已加载",
  );

  root.unmount();
  host.remove();
  setReaderAdapters(null);
});

function spyObjectUrls() {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const created = [];
  const revoked = [];
  URL.createObjectURL = (blob) => {
    const url = originalCreate.call(URL, blob);
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
    return originalRevoke.call(URL, url);
  };
  return {
    created,
    revoked,
    restore() {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    },
  };
}

test("ETag changes mid-Range restart clears old chunks, image cleanups, and blob URLs", async () => {
  const objectUrls = spyObjectUrls();
  const encoder = new TextEncoder();
  const v1 = `# V1 heading\n\n![figure](images/page-1/figure.png)\n\n${"a".repeat(9000)}\n\n`;
  const v2 = "# V2 heading\n\nshort body\n";
  const v1Bytes = encoder.encode(v1);
  const v2Bytes = encoder.encode(v2);
  const rangeCalls = [];
  const imageFetches = [];
  let call = 0;

  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownSource: async () => ({
        rawUrl: "/api/v1/jobs/job-etag/markdown?raw=true",
        totalBytes: 1_000_000,
        imagesBaseUrl: "/api/v1/jobs/job-etag/markdown/images/",
        etag: 'W/"v1"',
      }),
      loadMarkdownRange: async (_url, start, end, rangeEtag) => {
        call += 1;
        rangeCalls.push({ start, etag: rangeEtag });
        if (call === 1) {
          return { status: 206, bytes: v1Bytes, totalBytes: 1_000_000, rangeEnd: v1Bytes.length - 1, etag: 'W/"v1"' };
        }
        if (call === 2) {
          // 文件被就地改写：同一段的 ETag 与首段不一致，应触发从 0 重来。
          return { status: 206, bytes: encoder.encode("x"), totalBytes: v2Bytes.length, rangeEnd: start, etag: 'W/"v2"' };
        }
        return { status: 206, bytes: v2Bytes, totalBytes: v2Bytes.length, rangeEnd: v2Bytes.length - 1, etag: 'W/"v2"' };
      },
    },
    fetchProtected: async (url) => {
      imageFetches.push(url);
      return { ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) };
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId: "job-etag",
    sourceOnly: false,
    onClose: () => {},
  }));

  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "V2 heading",
    "ETag 变化后从 0 重建出 V2 正文",
  );
  // 旧 V1 分块必须被移除，绝不能混出两个版本。
  assert.equal(dom.window.document.querySelector("#reader-markdown-content h1")?.textContent, "V2 heading");
  assert.ok(!(dom.window.document.querySelector("#reader-markdown-content")?.textContent || "").includes("V1 heading"));
  assert.ok(rangeCalls.filter((entry) => entry.start === 0).length >= 2, "应回到字节 0 重新拉取");
  await waitFor(() => objectUrls.revoked.length > 0, "旧受保护图片的 blob URL 被回收");
  assert.ok(imageFetches.length >= 1, "V1 分块中的受保护图片确实发起过请求");

  root.unmount();
  host.remove();
  objectUrls.restore();
  setReaderAdapters(null);
});

test("server ignoring Range (200) rebuilds the whole document instead of appending", async () => {
  const encoder = new TextEncoder();
  const full = `# Full 200\n\n${Array.from({ length: 20 }, (_, i) => `段落 ${i} ${"z".repeat(400)}`).join("\n\n")}\n`;
  const fullBytes = encoder.encode(full);
  let rangeCalls = 0;

  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownSource: async () => ({
        rawUrl: "/api/v1/jobs/job-200/markdown?raw=true",
        totalBytes: fullBytes.length,
        imagesBaseUrl: "",
      }),
      loadMarkdownRange: async () => {
        rangeCalls += 1;
        return { status: 200, bytes: fullBytes, totalBytes: fullBytes.length, rangeEnd: null, etag: null };
      },
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId: "job-200",
    sourceOnly: false,
    onClose: () => {},
  }));

  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "Full 200",
    "服务端返回 200 时整篇渲染",
  );
  await waitFor(
    () => dom.window.document.querySelectorAll("#reader-markdown-content .reader-markdown-chunk p").length >= 20,
    "整篇内容一次重建完成",
  );
  assert.equal(rangeCalls, 1, "回整篇后不再继续 Range 拉取");

  root.unmount();
  host.remove();
  setReaderAdapters(null);
});

test("weak ETag is forwarded and a 200 If-Range miss rebuilds without duplicate content", async () => {
  const encoder = new TextEncoder();
  const full = `# Weak heading\n\n${"w".repeat(9000)}\n\n`;
  const fullBytes = encoder.encode(full);
  const etagArgs = [];
  let call = 0;

  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownSource: async () => ({
        rawUrl: "/api/v1/jobs/job-weak/markdown?raw=true",
        totalBytes: 1_000_000,
        imagesBaseUrl: "",
        etag: 'W/"weak-1"',
      }),
      loadMarkdownRange: async (_url, _start, _end, rangeEtag) => {
        call += 1;
        etagArgs.push(rangeEtag);
        if (call === 1) {
          return { status: 206, bytes: fullBytes, totalBytes: 1_000_000, rangeEnd: fullBytes.length - 1, etag: 'W/"weak-1"' };
        }
        // 弱 ETag 不能用于 If-Range：服务端忽略 Range 并回整篇 200。
        return { status: 200, bytes: fullBytes, totalBytes: fullBytes.length, rangeEnd: null, etag: null };
      },
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId: "job-weak",
    sourceOnly: false,
    onClose: () => {},
  }));

  await waitFor(
    () => dom.window.document.querySelectorAll("#reader-markdown-content h1").length === 1,
    "弱 ETag 后被回整篇也不产生重复标题",
  );
  assert.equal(etagArgs[0], 'W/"weak-1"');
  assert.equal(etagArgs[1], 'W/"weak-1"', "弱 ETag 原样透传给下一次 Range");
  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-panel .reader-notes-count")?.textContent === "已加载",
    "弱 ETag 回整篇后加载完成",
  );
  assert.equal(dom.window.document.querySelectorAll("#reader-markdown-content h1").length, 1);

  root.unmount();
  host.remove();
  setReaderAdapters(null);
});

test("cancelling (jobId change) aborts in-flight Range requests and stale bytes never land", async () => {
  const encoder = new TextEncoder();
  const staleBytes = encoder.encode("# STALE CONTENT\n\n");
  const freshBytes = encoder.encode("# FRESH CONTENT\n\n");
  let resolveStale = null;
  const staleGate = new Promise((resolve) => { resolveStale = resolve; });
  const signals = {};

  setReaderAdapters({
    ...retainPdfReaderAdapters,
    defaultReaderDataPort: {
      loadMarkdownSource: async (jobId) => ({
        rawUrl: `/api/v1/jobs/${jobId}/markdown?raw=true`,
        totalBytes: null,
        imagesBaseUrl: "",
      }),
      loadMarkdownRange: async (url, _start, _end, _etag, signal) => {
        if (url.includes("job-cancel-a")) {
          signals.a = signal;
          await staleGate;
          return { status: 206, bytes: staleBytes, totalBytes: staleBytes.length, rangeEnd: staleBytes.length - 1, etag: null };
        }
        return { status: 206, bytes: freshBytes, totalBytes: freshBytes.length, rangeEnd: freshBytes.length - 1, etag: null };
      },
    },
  });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  const render = (jobId) => root.render(React.createElement(ReaderMarkdownPanel, {
    open: true,
    jobId,
    sourceOnly: false,
    onClose: () => {},
  }));
  render("job-cancel-a");

  await waitFor(() => Boolean(signals.a), "旧任务的 Range 请求已发出且携带 signal");
  assert.equal(signals.a.aborted, false);

  // 重来（切换 jobId）：旧 effect 清理应 abort 在途请求。
  render("job-cancel-b");
  await waitFor(
    () => dom.window.document.querySelector("#reader-markdown-content h1")?.textContent === "FRESH CONTENT",
    "新任务正文渲染",
  );
  assert.equal(signals.a.aborted, true, "旧 Range 请求被 AbortController 取消");

  // 迟到的旧响应不得落地覆盖新内容。
  resolveStale();
  await wait(60);
  const content = dom.window.document.querySelector("#reader-markdown-content")?.textContent || "";
  assert.ok(content.includes("FRESH CONTENT"));
  assert.ok(!content.includes("STALE CONTENT"), "已取消的旧响应不再落地");

  root.unmount();
  host.remove();
  setReaderAdapters(null);
});

test("windowing keeps reference definitions and loose ordered-list items in one chunk", async () => {
  const { marked } = await import("marked");

  // 引用式定义若与引用被切开，前一块的 [ref] 会退化成纯文本。
  const referenceDoc = "See [the docs][ref].\n\n[ref]: https://example.com\n\nNext paragraph.\n";
  const first = takeCompleteMarkdownChunk(referenceDoc, { minChars: 1 });
  assert.equal(first.complete, "See [the docs][ref].\n\n[ref]: https://example.com\n\n");
  const firstHtml = String(marked.parse(first.complete, { async: false }));
  assert.match(firstHtml, /<a href="https:\/\/example\.com">the docs<\/a>/);
  // 对照：朴素地按空行切开会让引用无法解析（说明缓解确实生效）。
  const naiveHtml = String(marked.parse("See [the docs][ref].\n\n", { async: false }));
  assert.doesNotMatch(naiveHtml, /<a /);

  // 松散有序列表的内部空行不应被当作块边界，否则会被渲染成多个 <ol>。
  const listDoc = "1. one\n\n2. two\n\n3. three\n\nAfter.\n";
  const listChunk = takeCompleteMarkdownChunk(listDoc, { minChars: 1 });
  assert.equal(listChunk.complete, "1. one\n\n2. two\n\n3. three\n\n");
  const listHtml = String(marked.parse(listChunk.complete, { async: false }));
  assert.equal((listHtml.match(/<ol/g) || []).length, 1);
  assert.equal((listHtml.match(/<li>/g) || []).length, 3);
  // 对照：分开渲染松散列表会得到多个起始于 1 的 <ol>（错误编号）。
  const naiveListHtml = String(marked.parse("1. one\n\n", { async: false }));
  assert.equal((naiveListHtml.match(/<ol/g) || []).length, 1);
  assert.equal((naiveListHtml.match(/<li>/g) || []).length, 1);
});
