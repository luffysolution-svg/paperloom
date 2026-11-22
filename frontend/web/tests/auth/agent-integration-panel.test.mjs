import test from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { DOM_GLOBAL_KEYS, makeDom as makeDomWith } from "../helpers/dom.mjs";
import { waitFor } from "../helpers/async.mjs";

test("agent-integration-catalog generates official config snippets for all 5 agents and universal JSON", async () => {
  const { AGENT_CATALOG, buildManualSnippets } = await import(
    "../../src/features/settings/ui/agent-integration-catalog.ts"
  );
  assert.deepEqual(
    AGENT_CATALOG.map((item) => item.id),
    ["codex", "claude", "pi", "workbuddy", "hermes"],
  );

  const cli = "F:\\软件安装\\PaperLoom\\resources\\backend\\bin\\retainpdf.exe";
  const universal = buildManualSnippets("universal", { cliPath: cli });
  const parsedUniversal = JSON.parse(universal[0].code);
  assert.equal(parsedUniversal.mcpServers.paperloom.command, cli);
  assert.deepEqual(parsedUniversal.mcpServers.paperloom.args, ["agent", "mcp"]);

  const codex = buildManualSnippets("codex", { cliPath: cli });
  assert.match(codex[0].code, /codex mcp add paperloom/);
  assert.ok(!codex[0].code.includes("\\\\"), "Shell 命令里的 Windows 路径不应双重转义反斜杠");
  assert.match(codex[1].code, /\[mcp_servers\.paperloom\]/);

  const claude = buildManualSnippets("claude", { cliPath: cli });
  assert.match(claude[0].code, /claude mcp add --scope user --transport stdio paperloom/);
  assert.equal(JSON.parse(claude[1].code).mcpServers.paperloom.type, "stdio");

  const pi = buildManualSnippets("pi", { cliPath: cli });
  assert.match(pi[0].code, /pi install npm:pi-mcp-adapter/);
  assert.equal(JSON.parse(pi[1].code).mcpServers.paperloom.command, cli);

  const workbuddy = buildManualSnippets("workbuddy", { cliPath: cli, workbuddyConfigPath: "~/.codebuddy/mcp.json" });
  assert.equal(workbuddy[0].pathLabel, "~/.codebuddy/mcp.json");

  const hermes = buildManualSnippets("hermes", { cliPath: cli });
  assert.match(hermes[0].code, /mcp_servers:/);
  assert.match(hermes[0].code, /external_dirs:/);
  assert.match(hermes[0].code, /~\/\.agents\/skills/);
});

test("AgentIntegrationPanel renders manual copyable snippets even without desktop bridge", async () => {
  const dom = makeDomWith("", {
    html: "<!doctype html><html><body><div id='root'></div></body></html>",
    keys: [...DOM_GLOBAL_KEYS],
  });
  const { AgentIntegrationPanel } = await import(
    "../../src/features/settings/ui/AgentIntegrationPanel.jsx"
  );
  const root = createRoot(dom.window.document.getElementById("root"));
  await act(async () => {
    root.render(createElement(AgentIntegrationPanel));
  });
  const doc = dom.window.document;
  await waitFor(() => doc.querySelector("[data-agent-manual-section]"), "手动配置面板");
  assert.ok(doc.querySelector("[data-copy-snippet='universal-json']"), "缺少通用 MCP JSON 复制按钮");
  // Switching to install view shows all 5 agent cards with zero raw JSON debug dump.
  await act(async () => {
    doc.querySelector("[data-segment-value='install']").click();
  });
  for (const id of ["codex", "claude", "pi", "workbuddy", "hermes"]) {
    assert.ok(doc.querySelector(`[data-agent-card="${id}"]`), `缺少 ${id} 客户端卡片`);
  }
  assert.equal(doc.querySelector(".agent-integration-status"), null, "不应再展示原始 JSON 调试框");
  root.unmount();
});
