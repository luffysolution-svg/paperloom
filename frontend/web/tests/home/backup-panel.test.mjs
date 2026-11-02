import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "Event", "MouseEvent", "Node"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], writable: true, configurable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { BackupPanel } = await import("../../src/features/settings/ui/BackupPanel.jsx");

function fixture() {
  const calls = [];
  const status = {
    items: [{ id: "one", name: "paperloom-backup-one.zip", created_at: "2026-11-02T01:00:00Z", bytes: 1024, file_count: 3, includes_credentials: false }],
    pending_restore: false, last_restore: null, restore_supported: true, restore_hint: null,
    active_tasks: 0, data_root: "/data", webdav: { url: "https://example.com/dav/", username: "user", password_configured: true },
  };
  const client = {
    status: async () => structuredClone(status),
    create: async (include) => { calls.push(["create", include]); },
    download: async (name) => { calls.push(["download", name]); },
    import: async (file) => { calls.push(["import", file.name]); status.pending_restore = true; },
    restore: async (name, remote) => { calls.push(["restore", name, remote]); status.pending_restore = true; },
    cancel: async () => { calls.push(["cancel"]); status.pending_restore = false; },
    saveSettings: async (input) => { calls.push(["settings", input]); return status.webdav; },
    test: async () => {},
    listRemote: async () => [],
    backupRemote: async () => { calls.push(["remote"]); },
  };
  return { calls, status, client };
}

function button(host, label) {
  const match = [...host.querySelectorAll("button")].find((node) => node.textContent === label);
  assert.ok(match, label);
  return match;
}

async function mount(client, active = true) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(BackupPanel, { client, active })); });
  return { host, root, async close() { await act(async () => root.unmount()); host.remove(); } };
}

test("restoring needs explicit confirmation and a staged restore can be cancelled", async () => {
  const { client, calls } = fixture();
  const view = await mount(client);
  try {
    assert.equal(button(view.host, "恢复").disabled, true);
    const confirm = [...view.host.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement.textContent.includes("我确认"));
    await act(async () => confirm.click());
    assert.equal(button(view.host, "恢复").disabled, false);
    await act(async () => button(view.host, "恢复").click());
    assert.deepEqual(calls[0], ["restore", "paperloom-backup-one.zip", false]);
    assert.match(view.host.textContent, /重启后替换资料库/);
    assert.equal(button(view.host, "创建迁移包").disabled, true);
    await act(async () => button(view.host, "取消待恢复操作").click());
    assert.equal(button(view.host, "创建迁移包").disabled, false);
  } finally { await view.close(); }
});

test("credentials are opt in and an untouched saved WebDAV password is omitted", async () => {
  const { client, calls } = fixture();
  const view = await mount(client);
  try {
    await act(async () => button(view.host, "创建迁移包").click());
    assert.deepEqual(calls[0], ["create", false]);
    await act(async () => view.host.querySelector('input[type="checkbox"]').click());
    await act(async () => button(view.host, "创建迁移包").click());
    assert.deepEqual(calls[1], ["create", true]);
    assert.match(view.host.textContent, /明文/);
    await act(async () => view.host.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    assert.deepEqual(calls[2], ["settings", { url: "https://example.com/dav/", username: "user" }]);
    assert.equal(view.host.querySelector('input[type="password"]').value, "");
  } finally { await view.close(); }
});

test("an inactive panel makes no requests; failed backups expose a retryable error", async () => {
  const { client } = fixture();
  let reads = 0;
  client.status = async () => { reads++; return fixture().status; };
  client.create = async () => { throw new Error("磁盘空间不足"); };
  const view = await mount(client, false);
  try {
    assert.equal(reads, 0);
    await act(async () => view.root.render(React.createElement(BackupPanel, { client, active: true })));
    await act(async () => button(view.host, "创建迁移包").click());
    assert.equal(view.host.querySelector('[role="alert"]').textContent, "磁盘空间不足");
    assert.equal(button(view.host, "创建迁移包").disabled, false);
  } finally { await view.close(); }
});
