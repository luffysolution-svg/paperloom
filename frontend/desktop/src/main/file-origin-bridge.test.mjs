import assert from "node:assert/strict";
import test from "node:test";

import {
  apiUrlPatterns,
  installFileOriginBridge,
  rewriteRequestOrigin,
} from "./file-origin-bridge.js";

test("rewrites file:// and null origins to loopback, nothing else", () => {
  // Electron 44 的 file:// 页面握手 WebSocket 时带的就是 "file://"
  assert.deepEqual(rewriteRequestOrigin({ Origin: "file://", "X-API-Key": "k" }), { Origin: "http://127.0.0.1", "X-API-Key": "k" });
  assert.deepEqual(rewriteRequestOrigin({ origin: "null" }), { origin: "http://127.0.0.1" });
  const sameOrigin = { Origin: "http://127.0.0.1:40001" };
  assert.equal(rewriteRequestOrigin(sameOrigin), sameOrigin, "a real origin is left alone");
  const foreign = { Origin: "https://evil.example" };
  assert.equal(rewriteRequestOrigin(foreign), foreign, "never launders a web origin into loopback");
  const noOrigin = { Accept: "*/*" };
  assert.equal(rewriteRequestOrigin(noOrigin), noOrigin);
});

test("filters cover http requests and the WebSocket handshake on the apiBase host, any port", () => {
  assert.deepEqual(apiUrlPatterns("http://127.0.0.1:41000"), ["http://127.0.0.1/*", "ws://127.0.0.1/*"]);
});

test("installs a listener that only touches this window's requests", () => {
  const listeners = {};
  const webContents = {
    id: 7,
    session: {
      webRequest: {
        onBeforeSendHeaders: (filter, fn) => { listeners.send = { filter, fn }; },
      },
    },
  };
  const uninstall = installFileOriginBridge(webContents, "http://127.0.0.1:41000");
  assert.deepEqual(listeners.send.filter.urls, ["http://127.0.0.1/*", "ws://127.0.0.1/*"]);

  let out;
  listeners.send.fn({ webContentsId: 7, requestHeaders: { Origin: "file://" } }, (result) => { out = result; });
  assert.equal(out.requestHeaders.Origin, "http://127.0.0.1");
  listeners.send.fn({ webContentsId: 8, requestHeaders: { Origin: "file://" } }, (result) => { out = result; });
  assert.equal(out.requestHeaders.Origin, "file://", "another window's request is not rewritten");

  uninstall();
  assert.equal(listeners.send.fn, null);
});
