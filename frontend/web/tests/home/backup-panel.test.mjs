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
    active_tasks: 0, data_root: "/data", backup_dir: "/data/backups", webdav: { url: "https://example.com/dav/", username: "user", password_configured: true },
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
    syncRemote: async (name) => { calls.push(["sync", name]); status.items.push({ ...status.items[0], id: "synced", name }); },
    delete: async (name, remote) => { calls.push(["delete", name, remote]); if (!remote) status.items = status.items.filter((item) => item.name !== name); },
    canOpenLocation: () => true,
    openLocation: async (name, previous) => { calls.push(["location", name, previous]); },
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

test("deletion needs a separate confirmation and local deletion leaves the cloud list intact", async () => {
  const { client, calls } = fixture();
  client.listRemote = async () => [{ name: "paperloom-backup-cloud.zip", bytes: 100, modified_at: "" }];
  const view = await mount(client);
  try {
    await act(async () => button(view.host, "查看云端备份").click());
    const local = view.host.querySelector('[aria-label="本地迁移包"]');
    await act(async () => button(local, "删除").click());
    assert.equal(calls.length, 0);
    await act(async () => button(local, "取消").click());
    assert.equal(calls.length, 0);
    await act(async () => button(local, "删除").click());
    await act(async () => button(local, "确认删除").click());
    assert.deepEqual(calls, [["delete", "paperloom-backup-one.zip", false]]);
    assert.equal(view.host.querySelector('[aria-label="本地迁移包"]'), null);
    assert.match(view.host.querySelector('[aria-label="WebDAV 迁移包"]').textContent, /cloud/);
    const remote = view.host.querySelector('[aria-label="WebDAV 迁移包"]');
    await act(async () => button(remote, "删除").click());
    await act(async () => button(remote, "确认删除").click());
    assert.deepEqual(calls[1], ["delete", "paperloom-backup-cloud.zip", true]);
  } finally { await view.close(); }
});

test("backup folder, file and previous data can be opened on the desktop", async () => {
  const { client, calls, status } = fixture();
  status.last_restore = { restored_at: "now", previous_data_dir: "/data/backups/before-restore/one" };
  const view = await mount(client);
  try {
    assert.match(view.host.textContent, /本地备份位置：\/data\/backups/);
    await act(async () => button(view.host, "打开备份文件夹").click());
    await act(async () => button(view.host, "位置").click());
    await act(async () => button(view.host, "打开原数据文件夹").click());
    assert.deepEqual(calls, [["location", undefined, undefined], ["location", "paperloom-backup-one.zip", undefined], ["location", undefined, true]]);
  } finally { await view.close(); }
});

test("a failed cloud upload refreshes the retained local package and keeps its error visible", async () => {
  const { client, status } = fixture();
  client.backupRemote = async () => {
    status.items.push({ ...status.items[0], id: "retained", name: "paperloom-backup-retained.zip" });
    throw new Error("上传失败，本地迁移包已保留");
  };
  const view = await mount(client);
  try {
    await act(async () => button(view.host, "立即备份").click());
    assert.match(view.host.querySelector('[role="alert"]').textContent, /本地迁移包已保留/);
    assert.match(view.host.querySelector('[aria-label="本地迁移包"]').textContent, /retained/);
    assert.equal(button(view.host, "立即备份").disabled, false);
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

test("a cloud backup can be synced locally without confirming a library replacement", async () => {
  const { client, calls } = fixture();
  client.listRemote = async () => [{ name: "paperloom-backup-cloud.zip", bytes: 100, modified_at: "" }];
  const view = await mount(client);
  try {
    await act(async () => button(view.host, "查看云端备份").click());
    const remote = view.host.querySelector('[aria-label="WebDAV 迁移包"]');
    assert.equal(button(remote, "恢复").disabled, true);
    await act(async () => button(remote, "同步到本地").click());
    assert.deepEqual(calls, [["sync", "paperloom-backup-cloud.zip"]]);
    assert.equal(button(remote, "已在本地").disabled, true);
    assert.match(view.host.querySelector('[aria-label="本地迁移包"]').textContent, /cloud/);
    assert.doesNotMatch(view.host.textContent, /重启后替换资料库/);
  } finally { await view.close(); }
});

test("an ongoing transfer shows measured progress and stops polling after completion", async () => {
  const { client, status } = fixture();
  status.operation = { state: "running", phase: "upload", completed: 512, total: 1024, unit: "bytes", message: null };
  let reads = 0;
  client.status = async () => { reads++; return structuredClone(status); };
  const view = await mount(client);
  try {
    const progress = view.host.querySelector('progress');
    assert.equal(progress.value, 512);
    assert.equal(progress.max, 1024);
    assert.match(view.host.querySelector('[role="status"]').textContent, /正在上传到 WebDAV/);
    assert.equal(button(view.host, "创建迁移包").disabled, true);
    status.operation.state = "completed";
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 360)); });
    assert.equal(view.host.querySelector('progress'), null);
    assert.equal(button(view.host, "创建迁移包").disabled, false);
    const finishedReads = reads;
    await new Promise((resolve) => setTimeout(resolve, 550));
    assert.equal(reads, finishedReads);
  } finally { await view.close(); }
});
