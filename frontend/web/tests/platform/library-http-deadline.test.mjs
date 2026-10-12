import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchLibraryBookList } from "@retainpdf/api/library-books";

test("a library HTTP request that never responds is aborted and releases its connection", { timeout: 25_000 }, async () => {
  let connection;
  const server = http.createServer((request) => { connection = request.socket; });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  globalThis.window = { __FRONT_RUNTIME_CONFIG__: { apiBase: `http://127.0.0.1:${server.address().port}` } };
  let guard;
  try {
    const result = await Promise.race([
      fetchLibraryBookList("/api/v1").then(() => "completed", (error) => error.name),
      new Promise((resolve) => { guard = setTimeout(() => resolve("stalled"), 22_000); }),
    ]);
    assert.equal(result, "TimeoutError");
    const deadline = Date.now() + 1000;
    while (!connection.destroyed && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(connection.destroyed, true);
  } finally {
    clearTimeout(guard);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
