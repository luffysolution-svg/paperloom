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
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "paperloom-paper-reader", "SKILL.md")), true);
  assert.deepEqual(agentIntegrationStatus({ projectRoot: root }).projectSkills.sort(), [
    "paperloom-paper-reader",
    "paperloom-paper-search",
    "paperloom-pdf-ops",
  ]);
});

test("project MCP installation merges the existing server map", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperloom-agent-mcp-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".codex"));
  fs.writeFileSync(path.join(root, ".codex", "config.toml"), "[mcp_servers.other]\ncommand = \"other\"\n");
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
  const config = fs.readFileSync(path.join(root, ".codex", "config.toml"), "utf8");
  assert.equal(result.ok, true);
  assert.match(config, /\[mcp_servers\.other\]/);
  assert.match(config, /\[mcp_servers\.paperloom\]/);
  assert.match(config, /command = "paperloom"/);
  assert.match(config, /args = \["agent", "mcp"\]/);
});

test("project skills follow each agent's discovery directory", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperloom-agent-skills-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = installAgentIntegrations({
    scope: "project",
    agents: ["codex", "claude", "pi"],
    installMcp: false,
    installSkills: true,
    projectRoot: root,
    repoRoot,
    backendRoot: path.resolve(process.cwd(), "frontend/desktop/app/backend"),
  });
  assert.equal(result.files.length, 9);
  for (const rootName of [".agents/skills", ".claude/skills", ".pi/agent/skills"]) {
    assert.equal(fs.existsSync(path.join(root, rootName, "paperloom-paper-reader", "SKILL.md")), true);
  }
});
