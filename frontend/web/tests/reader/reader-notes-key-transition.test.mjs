import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "Event"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useReaderAnnotations } = await import("../../../../frontend/packages/reader/src/hooks/use-reader-annotations.ts");

test("switching documents never writes the previous document notes into the new document", async () => {
  const a = { id: "a", page: 1, pane: "source", quote: "A", note: "", createdAt: "2026-10-11T00:00:00Z" };
  const b = { ...a, id: "b", quote: "B" };
  const rows = new Map([
    ["retainpdf.reader.notes.v1:doc:a", JSON.stringify([a])],
    ["retainpdf.reader.notes.v1:doc:b", JSON.stringify([b])],
  ]);
  const writes = [];
  globalThis.localStorage = {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, raw) => { writes.push([key, JSON.parse(raw)]); rows.set(key, raw); },
    removeItem: (key) => rows.delete(key),
  };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let current;
  function Probe({ doc }) { current = useReaderAnnotations(doc); return null; }
  try {
    await React.act(async () => root.render(React.createElement(Probe, { doc: { documentId: "a" } })));
    await React.act(async () => root.render(React.createElement(Probe, { doc: { documentId: "b" } })));
    assert.deepEqual(current.notes, [b]);
    assert.equal(writes.some(([key, list]) => key.endsWith(":doc:b") && list.some((note) => note.id === "a")), false);
  } finally {
    await React.act(async () => root.unmount());
    host.remove();
  }
});
