import test from "node:test";
import assert from "node:assert/strict";

const { buildApiHeaders, apiBase } = await import("@retainpdf/api/http");

function withEnv(names, values, fn) {
  const prev = new Map(names.map((n) => [n, process.env[n]]));
  for (const n of names) {
    if (values[n] === undefined) delete process.env[n];
    else process.env[n] = values[n];
  }
  try {
    return fn();
  } finally {
    for (const [n, value] of prev) {
      if (value === undefined) delete process.env[n];
      else process.env[n] = value;
    }
  }
}

test("canonical runtime: 非浏览器环境下 env 注入 apiBase 与 X-API-Key", () => {
  withEnv(
    ["RETAIN_PDF_FRONTEND_API_BASE", "RETAIN_PDF_FRONTEND_X_API_KEY"],
    { RETAIN_PDF_FRONTEND_API_BASE: "https://api.example.com/", RETAIN_PDF_FRONTEND_X_API_KEY: "env-key" },
    () => {
      assert.equal(apiBase(), "https://api.example.com");
      assert.equal(buildApiHeaders({ "Content-Type": "application/json" })["X-API-Key"], "env-key");
    },
  );
});

test("canonical runtime: 无 env 时回退 window.__FRONT_RUNTIME_CONFIG__", () => {
  withEnv(
    ["RETAIN_PDF_FRONTEND_API_BASE", "RETAIN_PDF_FRONTEND_X_API_KEY"],
    { RETAIN_PDF_FRONTEND_API_BASE: undefined, RETAIN_PDF_FRONTEND_X_API_KEY: undefined },
    () => {
      globalThis.window = {
        location: { protocol: "http:", hostname: "127.0.0.1" },
        __FRONT_RUNTIME_CONFIG__: { apiBase: "http://cfg:9000", xApiKey: "win-key" },
      };
      try {
        assert.equal(apiBase(), "http://cfg:9000");
        assert.equal(buildApiHeaders()["X-API-Key"], "win-key");
      } finally {
        delete globalThis.window;
      }
    },
  );
});
