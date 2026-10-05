import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { parseProxyRules, resolveSystemProxy } = require("./system-proxy.js");

test("selects the first HTTP-compatible system proxy", () => {
  assert.equal(
    parseProxyRules("PROXY 127.0.0.1:7890; DIRECT"),
    "http://127.0.0.1:7890",
  );
  assert.equal(
    parseProxyRules("HTTPS proxy.example:8443; DIRECT"),
    "http://proxy.example:8443",
  );
  assert.equal(parseProxyRules("DIRECT"), "");
  assert.equal(parseProxyRules("SOCKS5 127.0.0.1:7891; DIRECT"), "");
});

test("resolves the Electron system proxy without exposing proxy rules", async () => {
  const messages = [];
  const resolved = await resolveSystemProxy(
    {
      resolveProxy: async (url) => {
        assert.equal(url, "https://cdn-mineru.openxlab.org.cn/");
        return "PROXY 127.0.0.1:7890; DIRECT";
      },
    },
    {
      logger: (message) => messages.push(message),
    },
  );

  assert.equal(resolved, "http://127.0.0.1:7890");
  assert.deepEqual(messages, [
    "[desktop] system HTTPS proxy detected for provider traffic",
  ]);
});

test("falls back to direct traffic when proxy resolution fails", async () => {
  const messages = [];
  const resolved = await resolveSystemProxy(
    {
      resolveProxy: async () => {
        throw new Error("proxy lookup failed");
      },
    },
    {
      logger: (message) => messages.push(message),
    },
  );

  assert.equal(resolved, "");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /proxy lookup failed/);
});
