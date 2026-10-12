import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { SecretInput } = await import("../../src/features/credentials/ui/SecretInput.js");

test("secret fields are masked on each opening and explicit reveal preserves the value", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(SecretInput, {
      secretLabel: "翻译 API Key", defaultValue: "local-fixture-key", key: "first-open",
    })));
    assert.equal(host.querySelector("input").type, "password");
    await React.act(async () => host.querySelector("button").click());
    assert.equal(host.querySelector("input").type, "text");
    assert.equal(host.querySelector("input").value, "local-fixture-key");
    await React.act(async () => root.render(React.createElement(SecretInput, {
      secretLabel: "翻译 API Key", defaultValue: "local-fixture-key", key: "next-open",
    })));
    assert.equal(host.querySelector("input").type, "password");
    assert.equal(host.querySelector("input").value, "local-fixture-key");
  } finally {
    await React.act(async () => root.unmount());
    host.remove();
  }
});
