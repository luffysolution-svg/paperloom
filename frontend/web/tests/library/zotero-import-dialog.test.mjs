import assert from "node:assert/strict";
import test from "node:test";
import { makeDom, selectOption } from "../helpers/dom.mjs";

const dom = makeDom();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ZoteroImportDialog } = await import("../../src/features/zotero/ui/ZoteroImportDialog.tsx");

test("switching Zotero libraries clears selection and ignores late pages from the previous library", async () => {
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  const originalFetch = globalThis.fetch;
  const response = (data) => Response.json({ data });
  const item = (title) => ({ key: "ITEM0001", title, attachments: [{ key: "PDF00001", available: true, title: "PDF" }] });
  const latePage = Promise.withResolvers();
  let pageSignal;
  globalThis.fetch = async (address, init) => {
    const url = new URL(address, "http://localhost");
    if (url.pathname.endsWith("/collections")) return response([]);
    if (url.pathname.endsWith("/zotero")) return response({
      supported: true, libraries: [{ id: "users/0", name: "Personal" }, { id: "groups/1", name: "Group" }],
    });
    assert.ok(url.pathname.endsWith("/items"));
    if (url.searchParams.get("start") === "1") {
      pageSignal = init.signal;
      return latePage.promise;
    }
    const personal = url.searchParams.get("library_id") === "users/0";
    return response({ items: [item(personal ? "Personal book" : "Group book")], total: personal ? 2 : 1 });
  };
  try {
    await act(async () => root.render(createElement(ZoteroImportDialog, {
      open: true, onOpenChange() {}, translateDocument() {}, requestLibraryRefresh() {},
    })));
    const button = (label) => [...document.querySelectorAll("button")].find(node => node.textContent.startsWith(label));
    await act(async () => document.querySelector(".home-zotero-attachment input").click());
    assert.ok(button("导入 1 个 PDF"));
    await act(async () => button("加载更多").click());
    await act(async () => selectOption(dom, document.querySelector("#home-zotero-library"), "groups/1"));
    assert.equal(pageSignal.aborted, true);
    assert.equal(button("导入 PDF").disabled, true);
    assert.equal(document.querySelector(".home-zotero-attachment input").checked, false);
    await act(async () => latePage.resolve(response({ items: [item("Late personal book")], total: 2 })));
    assert.deepEqual([...document.querySelectorAll(".home-zotero-item-title")].map(node => node.textContent), ["Group book"]);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
  }
});
