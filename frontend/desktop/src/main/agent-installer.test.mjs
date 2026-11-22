import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { agentIntegrationStatus, installAgentIntegrations } = require("./agent-installer.js");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("project skills installation copies the canonical PaperLoom skills", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperloom-agent-installer-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = installAgentIntegrations({
    scope: "project",
    agents: ["codex"],
    installMcp: false,
    installSkills: true,
    projectRoot: root,
    repoRoot,
    backendRoot: path.resolve(process.cwd(), "frontend/desktop/app/backend"),
    cliPath: "paperloom",
  });
  assert.equal(result.ok, true);
  assert.equal(result.files.length, 3);
  assert.equal(fs.existsSync(path.join(root, "skills", "paperloom-paper-reader", "SKILL.md")), true);
  assert.deepEqual(agentIntegrationStatus({ projectRoot: root }).projectSkills.sort(), [
    "paperloom-paper-reader",
    "paperloom-paper-search",
    "paperloom-pdf-ops",
  ]);
});

test("project MCP installation merges the existing server map", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperloom-agent-mcp-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "mcp.json"), JSON.stringify({ mcpServers: { other: { command: "other" } } }));
  const result = installAgentIntegrations({
    scope: "project",
    agents: ["codex"],
    installMcp: true,
    installSkills: false,
    projectRoot: root,
    repoRoot,
    backendRoot: path.resolve(process.cwd(), "frontend/desktop/app/backend"),
    cliPath: "paperloom",
  });
  const config = JSON.parse(fs.readFileSync(path.join(root, "mcp.json"), "utf8"));
  assert.equal(result.ok, true);
  assert.equal(config.mcpServers.other.command, "other");
  assert.deepEqual(config.mcpServers.paperloom, { command: "paperloom", args: ["agent", "mcp"] });
});
