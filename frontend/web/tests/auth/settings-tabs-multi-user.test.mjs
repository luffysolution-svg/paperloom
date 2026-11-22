// 设置弹窗：多用户普通用户看不到接口设置、同步、备份、更新，多了「账户」；点到被藏的分栏落到第一个能看的。
// 2026-11-12 起谁能看见由装配层的分栏表定（app/home/shell/settings-sections.tsx 用 hiddenSettingsTabs 过滤），
// 外壳 SettingsDialog 有什么画什么。这里分两段：auth 给出的藏哪些；外壳拿到过滤后的表，打开被藏的分栏落到第一个。
import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "../helpers/async.mjs";
import { DOM_GLOBAL_KEYS, makeDom as makeDomWith } from "../helpers/dom.mjs";

test("普通用户：藏掉单机分栏，多「账户」；要打开「接口设置」时落到「账户」", async () => {
  const dom = makeDomWith("", {
    html: "<!doctype html><html><body><div id='root'></div></body></html>",
    keys: [...DOM_GLOBAL_KEYS, "HTMLSelectElement"],
  });
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { SettingsDialog } = await import("../../src/features/settings/ui/SettingsDialog.jsx");
  const { hiddenSettingsTabs } = await import("../../src/features/auth/index.js");
  const { createDialogStore } = await import("../../src/platform/store/dialog-store.js");
  const Icon = () => null;
  const section = (id, order, extra = {}) => ({ id, label: id, Icon, order, render: () => React.createElement("p", { id: `${id}-body` }, id), ...extra });
  const all = [
    section("account", 10), section("api", 30), section("glossary", 40), section("usage", 50),
    section("sync", 60), section("backup", 70), section("appearance", 90), section("update", 100),
  ];
  const hidden = new Set(hiddenSettingsTabs({ mode: "multi", user: { role: "user" } }));
  for (const id of ["api", "sync", "backup", "update"]) assert.ok(hidden.has(id), `普通用户应看不到 ${id}`);
  const store = createDialogStore(null);
  const root = createRoot(dom.window.document.getElementById("root"));
  root.render(React.createElement(SettingsDialog, { dialogStore: store, sections: all.filter(({ id }) => !hidden.has(id)) }));
  store.open({ tab: "api" });
  const doc = dom.window.document;
  await waitFor(() => doc.querySelector("[data-settings-tab]"), "设置弹窗");
  const tabs = [...doc.querySelectorAll("[data-settings-tab]")].map((el) => el.dataset.settingsTab);
  assert.deepEqual(tabs, ["account", "glossary", "usage", "appearance"]);
  await waitFor(() => doc.getElementById("account-body"), "落到账户分栏");
  root.unmount();
});

test("整库迁移与 MCP 与 Skills 分栏可见并按表挂载", async () => {
  const dom = makeDomWith("", {
    html: "<!doctype html><html><body><div id='root'></div></body></html>",
    keys: [...DOM_GLOBAL_KEYS, "HTMLSelectElement"],
  });
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { SettingsDialog } = await import("../../src/features/settings/ui/SettingsDialog.jsx");
  const { createDialogStore } = await import("../../src/platform/store/dialog-store.js");
  const Icon = () => null;
  const sections = [
    { id: "sync", label: "同步", Icon, order: 60, render: () => React.createElement("p", { id: "sync-body" }, "sync") },
    { id: "backup", label: "备份", Icon, order: 70, render: () => React.createElement("p", { id: "backup-body" }, "backup") },
    { id: "migration", label: "整库迁移", Icon, order: 75, render: () => React.createElement("p", { id: "migration-body" }, "migration") },
    { id: "agents", label: "MCP 与 Skills", Icon, order: 110, render: () => React.createElement("p", { id: "agent-panel-body" }, "MCP 与 Skills") },
  ];
  const store = createDialogStore(null);
  const doc = dom.window.document;
  const root = createRoot(doc.getElementById("root"));
  root.render(React.createElement(SettingsDialog, { dialogStore: store, sections }));
  store.open({ tab: "migration" });
  await waitFor(() => doc.getElementById("migration-body"), "整库迁移");
  assert.equal(doc.querySelector('[data-settings-tab="migration"]').textContent, "整库迁移");
  assert.equal(doc.querySelector('[data-settings-tab="agents"]').textContent, "MCP 与 Skills");
  doc.querySelector('[data-settings-tab="agents"]').dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  doc.querySelector('[data-settings-tab="agents"]').click();
  await waitFor(() => doc.getElementById("agent-panel-body"), "MCP 与 Skills 分栏");
  root.unmount();
});
