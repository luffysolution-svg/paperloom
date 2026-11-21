/** 换 PDF 时 useProtectedPdfFile 不能先吐一次旧文件，被放弃的下载要中止。
 *
 * 以前 hook 只把文件存在 state 里：url 变了以后的第一次渲染还返回旧文件，
 * PdfDocumentPane 拿「新 url + 旧字节」当 Document 的 key 先重挂一次，还把旧 PDF
 * 整份复制给 worker；effect 里只设 cancelled，不传 signal，快速切书时被放弃的
 * 大文件照样下完。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "Node", "Event"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useProtectedPdfFile } = await import("../../../../frontend/packages/reader/src/pdf/useProtectedPdfFile.ts");

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("换 url 的第一次渲染不再返回旧文件；切走时中止还没下完的请求", async () => {
  const oldFetch = globalThis.fetch;
  const pending = new Map();
  const signals = new Map();
  globalThis.fetch = (url, init = {}) => {
    const key = String(url);
    signals.set(key, init.signal);
    if (key.endsWith("/a.pdf")) return Promise.resolve(new Response(new Uint8Array([1, 1, 1])));
    return new Promise((resolve) => { pending.set(key, resolve); });
  };
  const renders = [];
  function Probe({ url }) {
    const state = useProtectedPdfFile(url);
    renders.push({ url, first: state.file ? state.file.data[0] : null, loading: state.loading });
    return null;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const base = "http://localhost/api/v1/jobs/switch-test";
  try {
    await React.act(async () => { root.render(React.createElement(Probe, { url: `${base}/a.pdf` })); await tick(); await tick(); });
    assert.equal(renders.at(-1).first, 1, "A 加载好了");

    renders.length = 0;
    await React.act(async () => { root.render(React.createElement(Probe, { url: `${base}/b.pdf` })); await tick(); });
    const firstForB = renders.find((entry) => entry.url.endsWith("/b.pdf"));
    assert.equal(firstForB.first, null, "换到 B 的第一次渲染不该还拿着 A 的字节");
    assert.equal(firstForB.loading, true);
    assert.ok(signals.get(`${base}/b.pdf`), "请求要带 AbortSignal");

    await React.act(async () => { root.render(React.createElement(Probe, { url: `${base}/c.pdf` })); await tick(); });
    assert.equal(signals.get(`${base}/b.pdf`).aborted, true, "切到 C 时 B 的下载要中止");

    // B 迟到也不能出现在 C 上
    await React.act(async () => { pending.get(`${base}/b.pdf`)(new Response(new Uint8Array([2]))); await tick(); await tick(); });
    assert.equal(renders.at(-1).url.endsWith("/c.pdf"), true);
    assert.equal(renders.at(-1).first, null, "迟到的 B 不会显示在 C 上");
    assert.equal(renders.at(-1).loading, true);
  } finally {
    await React.act(async () => root.unmount());
    host.remove();
    globalThis.fetch = oldFetch;
  }
});
