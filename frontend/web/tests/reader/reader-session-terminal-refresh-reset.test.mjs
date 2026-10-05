import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/reader.html?job_id=job-reset&document_id=doc-a",
  pretendToBeVisual: true,
});
for (const key of ["window", "document", "history", "location", "HTMLElement", "Event", "Node"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    writable: true,
    configurable: true,
  });
}
globalThis.dispatchEvent = dom.window.dispatchEvent.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { setReaderAdapters } = await import("../../../../frontend/packages/reader/src/adapters.ts");
const { useReaderSession } = await import("../../../../frontend/packages/reader/src/hooks/use-reader-session.ts");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await wait(10);
  }
  assert.fail(`等待超时：${description}`);
}

test("switching session on the same jobId re-arms the terminal artifact refresh", async () => {
  const currentParam = (name) => new URLSearchParams(dom.window.location.search).get(name) || "";
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  let readerPayloadLoads = 0;
  const succeededPayload = (jobId) => ({
    job_id: jobId,
    status: "succeeded",
    workflow: "ocr",
  });

  setReaderAdapters({
    isMockMode: () => false,
    resolveResourceUrl: (url) => url,
    resolveReaderJobId: () => currentParam("job_id"),
    resolveReaderDocumentId: () => currentParam("document_id"),
    resolveReaderSourcePdf: () => "/reset-source.pdf",
    resolveReaderTranslatedPdfUrl: () => "",
    resolveReaderArtifactUrl: () => "",
    defaultReaderPageConfigPort: { messageTargetOrigin: () => "*" },
    defaultReaderDataPort: {
      fetchProtected: async () => ({
        ok: true,
        arrayBuffer: async () => pdfBytes.buffer.slice(0),
      }),
      loadJobPayload: async () => succeededPayload("job-reset"),
      loadReaderPayload: async () => {
        readerPayloadLoads += 1;
        return {
          jobPayload: succeededPayload("job-reset"),
          manifestPayload: {},
          regionsPayload: { items: [] },
          readerMetadata: null,
        };
      },
    },
  });

  const sessions = [];
  function HookHost() {
    const session = useReaderSession();
    React.useEffect(() => {
      sessions.push(session);
    }, [session]);
    return null;
  }

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(HookHost));

  try {
    await waitFor(
      () => sessions.some((session) => session.assetsReady
        && session.jobId === "job-reset"
        && session.documentId === "doc-a"),
      "session A ready",
    );
    assert.equal(readerPayloadLoads, 1);

    await sessions.at(-1).refreshJobStatus();
    await waitFor(() => readerPayloadLoads === 2, "first terminal artifact refresh");

    dom.window.history.replaceState(
      {},
      "",
      "/reader.html?job_id=job-reset&document_id=doc-b",
    );
    await waitFor(
      () => sessions.some((session) => session.assetsReady
        && session.jobId === "job-reset"
        && session.documentId === "doc-b"),
      "same job, new session identity ready",
    );
    const loadsAfterSwitch = readerPayloadLoads;

    await sessions.at(-1).refreshJobStatus();
    await waitFor(
      () => readerPayloadLoads > loadsAfterSwitch,
      "terminal artifact refresh re-armed for the new session",
    );
  } finally {
    root.unmount();
    host.remove();
    setReaderAdapters(null);
    dom.window.history.replaceState({}, "", "/reader.html?job_id=job-reset&document_id=doc-a");
  }
});
