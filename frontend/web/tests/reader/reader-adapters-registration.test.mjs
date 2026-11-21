import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost/reader.html",
});
for (const key of ["window", "document", "localStorage", "location"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    writable: true,
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { retainPdfReaderAdapters } = await import(
  "../../src/app/reader/adapters/retainpdf.ts"
);
const ext = await import("../../src/app/reader/external.ts");
// 契约键集从包内真值派生（同源常量 + 编译期完整性断言），不再手工复制。
const { READER_ADAPTER_KEYS, READER_REQUIRED_ADAPTER_KEYS } = await import(
  "../../../../frontend/packages/reader/src/adapters.ts"
);

// ReaderAdapters 的完整声明字段集：注册对象只允许出现这些 key，
// 防止 `...ext` 全量 spread 把未声明的宿主导出静默带入运行时对象。
const DECLARED_ADAPTER_KEYS = new Set(READER_ADAPTER_KEYS);

const REQUIRED_ADAPTER_KEYS = [...READER_REQUIRED_ADAPTER_KEYS];

// 这些是 external.ts 的宿主导出，但不在 ReaderAdapters 声明内，绝不能泄漏进注册对象。
const NON_ADAPTER_EXPORTS = [
  "parseMarkdownWithMath",
  "askLibraryAi",
  "createReaderAskAnswerer",
  "createReaderMarkdownAnswerer",
  "MOCK_DOCUMENT_SOURCE_PDF_URL",
  "READER_DIALOG_MESSAGES",
  "READER_PROGRESS_COPY",
  "API_PREFIX",
  "normalizeServerFavorite",
  "createReaderServerFavoritesPort",
  "defaultCredentialsStatePort",
];

test("host registration injects only declared ReaderAdapters fields", () => {
  // 注册键集合 === 契约键集合：既不漏接必填、也不泄漏未声明字段。
  assert.deepEqual(
    Object.keys(retainPdfReaderAdapters).sort(),
    [...READER_ADAPTER_KEYS].sort(),
    "registration keys must equal the ReaderAdapters contract keys",
  );
  for (const key of Object.keys(retainPdfReaderAdapters)) {
    assert.ok(DECLARED_ADAPTER_KEYS.has(key), `undeclared adapter field leaked: ${key}`);
  }
  for (const key of REQUIRED_ADAPTER_KEYS) {
    assert.ok(
      Object.hasOwn(retainPdfReaderAdapters, key),
      `missing required adapter field: ${key}`,
    );
  }
  for (const key of NON_ADAPTER_EXPORTS) {
    assert.equal(
      Object.hasOwn(retainPdfReaderAdapters, key),
      false,
      `non-adapter external export leaked into registration object: ${key}`,
    );
  }
});

test("host registration preserves the exact injected host implementations", () => {
  // 这里只列**还存在**的适配器。曾经还列着 askDocumentAi / aiOperations /
  // conversations / askChat（AI 问答面板）和 createFavorite 那三个（收藏）——
  // 两边都被删光之后，assert.equal(undefined, undefined) 恒真，那几行守的是空气。
  assert.equal(retainPdfReaderAdapters.credentialsPort, ext.defaultCredentialsStatePort);
  assert.equal(retainPdfReaderAdapters.apiPrefix, ext.API_PREFIX);
  assert.equal(retainPdfReaderAdapters.fetchDocumentByJobId, ext.fetchDocumentByJobId);
  assert.equal(retainPdfReaderAdapters.resolveMarkdownAssetUrl, ext.resolveMarkdownAssetUrl);
  assert.equal(retainPdfReaderAdapters.resolveReaderDownloadUrls, ext.resolveReaderDownloadUrls);
  assert.equal(retainPdfReaderAdapters.resolveReaderDownloadName, ext.resolveReaderDownloadName);
  assert.equal(retainPdfReaderAdapters.downloadProtectedResource, ext.downloadProtectedResource);
  assert.equal(retainPdfReaderAdapters.failDownloadToast, ext.failDownloadToast);
  assert.equal(retainPdfReaderAdapters.resolveResourceUrl, ext.resolveResourceUrl);
  assert.equal(retainPdfReaderAdapters.fetchProtected, ext.fetchProtected);
  assert.equal(retainPdfReaderAdapters.liveTranslation, ext.liveTranslationPort);
  assert.equal(retainPdfReaderAdapters.pdf, ext.pdfPort);
  assert.equal(retainPdfReaderAdapters.sessionData, ext.sessionDataPort);
});
