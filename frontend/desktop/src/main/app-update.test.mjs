import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Response, ReadableStream } = globalThis;
let createDesktopUpdater;
try { ({ createDesktopUpdater } = require("./app-update.js")); } catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
}

async function fixture(t, options = {}) {
  assert.equal(typeof createDesktopUpdater, "function", "desktop updater is available");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperloom-update-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const content = Buffer.from("verified installer fixture");
  const digest = createHash("sha256").update(content).digest("hex");
  const filenames = ["PaperLoom-Windows-0.2.0-Setup.exe", "PaperLoom-Windows-0.2.0.exe", "PaperLoom-Mac-0.2.0.dmg", "PaperLoom-Linux-0.2.0.deb"];
  const release = {
    tag_name: "v0.2.0", name: "feat update", body: "release notes", draft: false, prerelease: false,
    html_url: "https://github.com/luffysolution-svg/paperloom/releases/tag/v0.2.0",
    assets: [...filenames, "SHA256SUMS.txt"].map((name, index) => ({
      id: index + 1, name, size: name === "SHA256SUMS.txt" ? 500 : content.length,
      browser_download_url: `https://github.com/luffysolution-svg/paperloom/releases/download/v0.2.0/${name}`,
    })),
  };
  const opened = [], states = [], calls = [];
  let checksum = digest;
  let activeJobs = false;
  const fetchImpl = async (url, init) => {
    calls.push(url);
    const response = await options.fetchResponse?.(url, init);
    if (response) return response;
    if (url.endsWith("/latest")) return Response.json(release);
    const selected = release.assets.find((item) => url === `https://api.github.com/repos/luffysolution-svg/paperloom/releases/assets/${item.id}`);
    if (url.endsWith("SHA256SUMS.txt") || selected?.name === "SHA256SUMS.txt") return new Response(filenames.map((name) => `${checksum}  ${name}`).join("\n"));
    return options.downloadResponse ? options.downloadResponse(init) : new Response(content);
  };
  const settings = {
    app: { isPackaged: true, getVersion: () => "0.1.7", getPath: () => root, quit: () => opened.push("quit") },
    platform: "win32", arch: "x64", fetchImpl, onState: (state) => states.push(state),
    openPath: async (file) => { opened.push(file); return ""; },
    launchPortable: async (plan) => opened.push(plan),
    hasActiveJobs: async () => activeJobs,
    ...options,
  };
  const updater = createDesktopUpdater(settings);
  return { updater, restart: () => createDesktopUpdater(settings), root, content, release, opened, states, calls, setChecksum: (value) => { checksum = value; }, setActive: () => { activeJobs = true; } };
}

for (const [platform, arch, portableFile, expectedName, expectedMode] of [
  ["win32", "x64", "", "PaperLoom-Windows-0.2.0-Setup.exe", "installer"],
  ["win32", "x64", "C:\\PaperLoom\\PaperLoom.exe", "PaperLoom-Windows-0.2.0.exe", "portable"],
  ["darwin", "arm64", "", "PaperLoom-Mac-0.2.0.dmg", "mac"],
  ["linux", "x64", "", "PaperLoom-Linux-0.2.0.deb", "linux"],
]) {
  test(`${platform} ${expectedMode}: downloads the matching verified package`, async (t) => {
    const f = await fixture(t, { platform, arch, portableFile });
    assert.equal((await f.updater.check()).status, "available");
    const state = await f.updater.download();
    assert.equal(state.status, "downloaded");
    assert.equal(state.mode, expectedMode);
    assert.deepEqual(await fs.readFile(path.join(f.root, "updates", expectedName)), f.content);
    assert.equal(f.states.some((state) => state.status === "downloading" && state.percent === 100), true);
    assert.deepEqual(f.opened, [], "downloads do not install or quit automatically");
    await f.updater.install();
    if (expectedMode === "portable") {
      assert.equal(f.opened[0].target, portableFile);
      assert.equal(f.opened[0].userData, f.root, "portable restart preserves the effective profile path");
      assert.equal(f.opened[1], "quit");
    } else {
      assert.equal(path.basename(f.opened[0]), expectedName);
      assert.equal(f.opened.includes("quit"), expectedMode === "installer");
    }
  });
}

for (const status of [502, 503, 504]) {
  test(`checking retries a temporary HTTP ${status} once`, async (t) => {
    let attempts = 0;
    const f = await fixture(t, { fetchResponse: (url) => {
      if (url.endsWith("/latest") && ++attempts === 1) return new Response("gateway failure", { status });
    } });
    assert.equal((await f.updater.check()).status, "available");
    assert.equal(attempts, 2);
  });
}

test("HTTP 504 on checksum and installer downloads falls back to the official asset API", async (t) => {
  const cancelled = [];
  const f = await fixture(t, { fetchResponse: (url, init) => {
    if (url.startsWith("https://github.com/")) {
      return new Response(new ReadableStream({ cancel: () => { cancelled.push(url); } }), { status: 504 });
    }
    assert.equal(init.headers.Accept, url.endsWith("/latest") ? "application/vnd.github+json" : "application/octet-stream");
  } });
  await f.updater.check();
  assert.equal((await f.updater.download()).status, "downloaded");
  const [installer] = f.release.assets;
  const checksum = f.release.assets.at(-1);
  assert.deepEqual(f.calls.slice(1), [
    checksum.browser_download_url,
    `https://api.github.com/repos/luffysolution-svg/paperloom/releases/assets/${checksum.id}`,
    installer.browser_download_url,
    `https://api.github.com/repos/luffysolution-svg/paperloom/releases/assets/${installer.id}`,
  ]);
  assert.deepEqual(cancelled, [checksum.browser_download_url, installer.browser_download_url]);
  assert.deepEqual(await fs.readFile(path.join(f.root, "updates", installer.name)), f.content);
  assert.deepEqual(f.opened, []);
});

test("persistent gateway failures stop after two version requests", async (t) => {
  const f = await fixture(t, { fetchResponse: () => new Response("gateway failure", { status: 504 }) });
  const state = await f.updater.check();
  assert.equal(state.status, "error");
  assert.match(state.error, /检查更新.*HTTP 504/);
  assert.equal(f.calls.length, 2);
});

for (const name of ["SHA256SUMS.txt", "PaperLoom-Windows-0.2.0-Setup.exe"]) {
  test(`persistent gateway failures for ${name} retain a manual retry and remove partial files`, async (t) => {
    const f = await fixture(t, { fetchResponse: (url) => {
      const selected = f.release.assets.find((item) => item.name === name);
      if (url === selected.browser_download_url || url.endsWith(`/assets/${selected.id}`)) {
        return new Response("gateway failure", { status: 504 });
      }
    } });
    await f.updater.check();
    const state = await f.updater.download();
    assert.equal(state.status, "error");
    assert.match(state.error, name === "SHA256SUMS.txt" ? /下载校验文件.*HTTP 504/ : /下载更新包.*HTTP 504/);
    assert.equal(state.canDownload, true);
    assert.equal(state.htmlUrl, f.release.html_url);
    assert.equal(f.calls.length, name === "SHA256SUMS.txt" ? 3 : 4);
    assert.deepEqual(await fs.readdir(path.join(f.root, "updates")), []);
    assert.deepEqual(f.opened, []);
  });
}

for (const status of [403, 404]) {
  test(`HTTP ${status} does not retry or switch download endpoints`, async (t) => {
    const f = await fixture(t, { fetchResponse: (url) => {
      if (!url.endsWith("/latest")) return new Response("not available", { status });
    } });
    await f.updater.check();
    assert.equal((await f.updater.download()).status, "error");
    assert.equal(f.calls.length, 2);
  });
}

test("cancelling a failed download prevents the fallback request", async (t) => {
  const f = await fixture(t, { fetchResponse: (url) => {
    if (url.endsWith("SHA256SUMS.txt")) {
      return new Response(new ReadableStream({ cancel: () => { f.updater.cancel(); } }), { status: 504 });
    }
  } });
  await f.updater.check();
  assert.equal((await f.updater.download()).status, "available");
  assert.equal(f.calls.length, 2);
  assert.deepEqual(await fs.readdir(path.join(f.root, "updates")), []);
});

test("a failed package stream is not retried into the same partial file", async (t) => {
  let chunks = 0;
  const f = await fixture(t, { downloadResponse: () => new Response(new ReadableStream({
    pull(controller) {
      if (chunks++ === 0) controller.enqueue(Buffer.from("partial"));
      else controller.error(new Error("connection reset"));
    },
  })) });
  await f.updater.check();
  assert.equal((await f.updater.download()).status, "error");
  assert.equal(f.calls.length, 3);
  assert.deepEqual(await fs.readdir(path.join(f.root, "updates")), []);
});

test("checksum mismatch removes the download and never enables installation", async (t) => {
  const f = await fixture(t);
  await f.updater.check();
  f.setChecksum("0".repeat(64));
  assert.equal((await f.updater.download()).status, "error");
  assert.match(f.updater.getState().error, /校验/);
  assert.deepEqual(await fs.readdir(path.join(f.root, "updates")), []);
  assert.equal((await f.updater.install()).status, "error");
  assert.deepEqual(f.opened, []);
  // Retry from the retained release without reopening GitHub.
  f.setChecksum(createHash("sha256").update(f.content).digest("hex"));
  assert.equal((await f.updater.download()).status, "downloaded");
});

test("tampering after download is detected before opening the installer", async (t) => {
  const f = await fixture(t);
  await f.updater.check();
  await f.updater.download();
  await fs.writeFile(path.join(f.root, "updates", "PaperLoom-Windows-0.2.0-Setup.exe"), "tampered");
  assert.equal((await f.updater.install()).status, "error");
  assert.deepEqual(f.opened, []);
});

test("active jobs block the installation while retaining the verified download", async (t) => {
  const f = await fixture(t);
  await f.updater.check();
  await f.updater.download();
  f.setActive();
  const state = await f.updater.install();
  assert.equal(state.status, "downloaded");
  assert.match(state.error, /任务/);
  assert.deepEqual(f.opened, []);
});

test("unsupported architectures and foreign download URLs never fetch an executable", async (t) => {
  const f = await fixture(t, { arch: "arm64" });
  assert.equal((await f.updater.check()).status, "error");
  const other = await fixture(t);
  other.release.assets[0].browser_download_url = "https://evil.example/payload.exe";
  assert.equal((await other.updater.check()).status, "error");
  assert.equal(other.calls.length, 1);
});

test("drafts, prereleases, same version and downgrades never become installable", async (t) => {
  for (const patch of [{ draft: true }, { prerelease: true }, { tag_name: "v0.1.7" }, { tag_name: "v0.1.6" }]) {
    const f = await fixture(t);
    Object.assign(f.release, patch);
    assert.notEqual((await f.updater.check()).status, "available");
    assert.notEqual((await f.updater.download()).status, "downloaded");
    assert.equal(f.calls.length, 1);
  }
});

test("failed native installer opening keeps the package for another attempt", async (t) => {
  let failure = true;
  const f = await fixture(t, { openPath: async () => failure ? "no installer association" : "" });
  await f.updater.check();
  await f.updater.download();
  assert.equal((await f.updater.install()).status, "downloaded");
  assert.match(f.updater.getState().error, /no installer/);
  assert.deepEqual(f.opened, []);
  failure = false;
  assert.equal((await f.updater.install()).status, "installing");
});

test("duplicate downloads share one request and cancellation releases the connection", async (t) => {
  let disconnected;
  const socketClosed = new Promise((resolve) => { disconnected = resolve; });
  const server = http.createServer((request, response) => {
    request.socket.once("close", disconnected);
    response.writeHead(200); response.write("partial");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const f = await fixture(t, { downloadResponse: (init) => fetch(`http://127.0.0.1:${server.address().port}`, init) });
  await f.updater.check();
  const first = f.updater.download();
  const second = f.updater.download();
  const readyDeadline = Date.now() + 3000;
  while (!f.states.some((state) => state.status === "downloading" && state.percent > 0)) {
    assert.ok(Date.now() < readyDeadline, "download did not receive data");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  f.updater.cancel();
  await Promise.all([first, second]);
  assert.equal(f.calls.filter((url) => url.endsWith("Setup.exe")).length, 1);
  assert.equal(f.updater.getState().status, "available");
  assert.deepEqual(await fs.readdir(path.join(f.root, "updates")), []);
  await Promise.race([socketClosed, new Promise((_resolve, reject) => setTimeout(() => reject(new Error("download socket did not close")), 2000).unref())]);
});

test("multi-chunk downloads write the complete file rather than truncating or overwriting chunks", async (t) => {
  const f = await fixture(t, { downloadResponse: () => new Response(new ReadableStream({
    start(controller) {
      for (const byte of Buffer.from("verified installer fixture")) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  })) });
  await f.updater.check();
  assert.equal((await f.updater.download()).status, "downloaded");
  assert.deepEqual(await fs.readFile(path.join(f.root, "updates", "PaperLoom-Windows-0.2.0-Setup.exe")), f.content);
});

test("a failed portable replacement is reported on the next startup rather than silently lost", async (t) => {
  const f = await fixture(t, { portableFile: "C:\\PaperLoom\\PaperLoom.exe" });
  await fs.mkdir(path.join(f.root, "updates"));
  await fs.writeFile(path.join(f.root, "updates", "portable-update-result.json"), JSON.stringify({ ok: false, error: "access denied" }));
  assert.match(f.restart().getState().error || "", /access denied/);
});

test("a new task appearing during portable preparation blocks commit and keeps the current app open", async (t) => {
  let checks = 0;
  const f = await fixture(t, { portableFile: "C:\\PaperLoom\\PaperLoom.exe",
    hasActiveJobs: async () => ++checks > 1,
    launchPortable: async (_plan, beforeCommit) => { await beforeCommit(); throw new Error("must not commit"); },
  });
  await f.updater.check(); await f.updater.download();
  const state = await f.updater.install();
  assert.equal(state.status, "downloaded");
  assert.match(state.error, /任务/);
  assert.deepEqual(f.opened, []);
});
