import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  AGENTS,
  SKILLS,
  agentIntegrationStatus,
  installAgentIntegrations,
  uninstallAgentIntegrations,
  testAgentMcp,
} = require("./agent-installer.js");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const backendRoot = path.join(repoRoot, "frontend", "desktop", "app", "backend");

function makeSandbox(t, prefix = "paperloom-agent-") {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(homeDir, { recursive: true, force: true }));
  return homeDir;
}

test("installs global MCP and deduplicated shared skills across all 5 agents (Windows path with CJK and spaces)", (t) => {
  const homeDir = makeSandbox(t, "paperloom-win-");
  const cliPath = "F:\\软件安装\\Paper Loom\\resources\\backend\\bin\\retainpdf.exe";

  // Pre-seed existing user configs and unrelated skills to guarantee non-destructive merge.
  fs.mkdirSync(path.join(homeDir, ".codex", "skills", "my-own-skill"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, ".codex", "skills", "my-own-skill", "SKILL.md"), "user skill\n");
  fs.writeFileSync(
    path.join(homeDir, ".codex", "config.toml"),
    "[mcp_servers.other]\ncommand = \"other\"\nargs = [\"serve\"]\n",
  );
  fs.writeFileSync(
    path.join(homeDir, ".claude.json"),
    JSON.stringify({ projects: { "/tmp/demo": { trust: true } }, mcpServers: { existing: { command: "npx" } } }, null, 2),
  );
  fs.mkdirSync(path.join(homeDir, ".pi", "agent"), { recursive: true });
  fs.writeFileSync(
    path.join(homeDir, ".pi", "agent", "mcp.json"),
    JSON.stringify({ settings: { idleTimeout: 10 }, mcpServers: { github: { command: "npx" } } }, null, 2),
  );
  fs.mkdirSync(path.join(homeDir, ".hermes"), { recursive: true });
  fs.writeFileSync(
    path.join(homeDir, ".hermes", "config.yaml"),
    "model: claude\nmcp_servers:\n  filesystem:\n    command: \"npx\"\n    args:\n      - \"-y\"\nskills:\n  external_dirs:\n    - \"/opt/team-skills\"\n",
  );

  // Pre-seed stale duplicate skills in legacy locations that should be cleaned up.
  for (const staleDir of [
    path.join(homeDir, ".codex", "skills", "paperloom-pdf-ops"),
    path.join(homeDir, ".pi", "agent", "skills", "paperloom-paper-reader"),
    path.join(homeDir, ".hermes", "skills", "paperloom-paper-search"),
  ]) {
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, "SKILL.md"), "stale");
  }

  const opts = {
    homeDir,
    platform: "win32",
    env: {},
    repoRoot,
    backendRoot,
    cliPath,
    agents: AGENTS,
  };
  const first = installAgentIntegrations(opts);
  assert.equal(first.ok, true);
  assert.equal(first.scope, "global");
  assert.equal(first.configuredMcp.length, 5);
  assert.equal(first.cleanedDuplicates.length, 3);

  // Idempotency check: running a second time creates zero duplicates.
  const second = installAgentIntegrations(opts);
  assert.equal(second.ok, true);

  // 1. Codex: config.toml has single [mcp_servers.paperloom] + preserved [mcp_servers.other], skills only in ~/.agents/skills.
  const codexToml = fs.readFileSync(path.join(homeDir, ".codex", "config.toml"), "utf8");
  assert.equal((codexToml.match(/\[mcp_servers\.paperloom\]/g) || []).length, 1);
  assert.match(codexToml, /\[mcp_servers\.other\]/);
  assert.equal(fs.existsSync(path.join(homeDir, ".codex", "skills", "paperloom-pdf-ops")), false);
  assert.equal(fs.existsSync(path.join(homeDir, ".codex", "skills", "my-own-skill", "SKILL.md")), true);

  // 2. Claude Code: ~/.claude.json preserves projects & existing server, adds stdio paperloom, links skills to shared hub.
  const claudeJson = JSON.parse(fs.readFileSync(path.join(homeDir, ".claude.json"), "utf8"));
  assert.equal(claudeJson.projects["/tmp/demo"].trust, true);
  assert.equal(claudeJson.mcpServers.existing.command, "npx");
  assert.equal(claudeJson.mcpServers.paperloom.type, "stdio");
  assert.equal(claudeJson.mcpServers.paperloom.command, cliPath);
  assert.deepEqual(claudeJson.mcpServers.paperloom.args, ["agent", "mcp"]);
  for (const skill of SKILLS) {
    assert.equal(
      fs.realpathSync(path.join(homeDir, ".claude", "skills", skill)),
      fs.realpathSync(path.join(homeDir, ".agents", "skills", skill)),
    );
  }

  // 3. Pi: ~/.pi/agent/mcp.json preserves settings & other servers, reuses ~/.agents/skills with zero duplicate in ~/.pi/agent/skills.
  const piJson = JSON.parse(fs.readFileSync(path.join(homeDir, ".pi", "agent", "mcp.json"), "utf8"));
  assert.equal(piJson.settings.idleTimeout, 10);
  assert.equal(piJson.mcpServers.github.command, "npx");
  assert.equal(piJson.mcpServers.paperloom.command, cliPath);
  assert.equal(fs.existsSync(path.join(homeDir, ".pi", "agent", "skills", "paperloom-paper-reader")), false);

  // 4. WorkBuddy: ~/.workbuddy/mcp.json + linked skills.
  const wbJson = JSON.parse(fs.readFileSync(path.join(homeDir, ".workbuddy", "mcp.json"), "utf8"));
  assert.equal(wbJson.mcpServers.paperloom.command, cliPath);
  assert.equal(fs.existsSync(path.join(homeDir, ".workbuddy", "skills", "paperloom-pdf-ops", "SKILL.md")), true);

  // 5. Hermes: ~/.hermes/config.yaml has single paperloom entry, preserves filesystem & /opt/team-skills, registers ~/.agents/skills once.
  const hermesYaml = fs.readFileSync(path.join(homeDir, ".hermes", "config.yaml"), "utf8");
  assert.equal((hermesYaml.match(/^\s+paperloom:/gm) || []).length, 1);
  assert.equal((hermesYaml.match(/~\/\.agents\/skills/g) || []).length, 1);
  assert.match(hermesYaml, /filesystem:/);
  assert.match(hermesYaml, /\/opt\/team-skills/);
  assert.equal(fs.existsSync(path.join(homeDir, ".hermes", "skills", "paperloom-paper-search")), false);

  const status = agentIntegrationStatus(opts);
  assert.deepEqual(status.sharedSkills.sort(), [...SKILLS].sort());
  for (const agent of AGENTS) {
    assert.equal(status.agents[agent].mcpConfigured, true, `${agent} mcpConfigured`);
    assert.equal(status.agents[agent].mcpCommand, cliPath, `${agent} mcpCommand round-trip`);
    assert.equal(status.agents[agent].skillsConfigured, true, `${agent} skillsConfigured`);
    assert.deepEqual(status.agents[agent].duplicateSkillPaths, [], `${agent} duplicateSkillPaths`);
  }
});

test("WorkBuddy detects existing ~/.codebuddy and .mcp.json without creating duplicate config folders", (t) => {
  const homeDir = makeSandbox(t, "paperloom-codebuddy-");
  const codebuddyDir = path.join(homeDir, ".codebuddy");
  fs.mkdirSync(codebuddyDir, { recursive: true });
  fs.writeFileSync(path.join(codebuddyDir, ".mcp.json"), JSON.stringify({ mcpServers: { existing: { command: "node" } } }));

  const opts = {
    homeDir,
    platform: "darwin",
    env: {},
    repoRoot,
    backendRoot,
    cliPath: "/Applications/PaperLoom.app/Contents/Resources/backend/bin/retainpdf",
    agents: ["workbuddy"],
  };
  const result = installAgentIntegrations(opts);
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(homeDir, ".workbuddy")), false);
  assert.equal(fs.existsSync(path.join(codebuddyDir, "mcp.json")), false);
  const updated = JSON.parse(fs.readFileSync(path.join(codebuddyDir, ".mcp.json"), "utf8"));
  assert.equal(updated.mcpServers.existing.command, "node");
  assert.equal(updated.mcpServers.paperloom.command, opts.cliPath);
  assert.equal(result.status.agents.workbuddy.configDirName, ".codebuddy");
  assert.equal(result.status.agents.workbuddy.skillsConfigured, true);
});

test("respects Linux/macOS custom environment directories (CODEX_HOME, PI_CODING_AGENT_DIR, HERMES_HOME)", (t) => {
  const homeDir = makeSandbox(t, "paperloom-linux-");
  const customCodex = path.join(homeDir, "xdg", "codex");
  const customPi = path.join(homeDir, "xdg", "pi-agent");
  const customHermes = path.join(homeDir, "xdg", "hermes");
  const env = {
    CODEX_HOME: customCodex,
    PI_CODING_AGENT_DIR: customPi,
    HERMES_HOME: customHermes,
  };
  const opts = {
    homeDir,
    platform: "linux",
    env,
    repoRoot,
    backendRoot,
    cliPath: "/usr/local/bin/paperloom",
    agents: ["codex", "pi", "hermes"],
  };
  const result = installAgentIntegrations(opts);
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(customCodex, "config.toml")), true);
  assert.equal(fs.existsSync(path.join(customPi, "mcp.json")), true);
  assert.equal(fs.existsSync(path.join(customHermes, "config.yaml")), true);
  assert.equal(fs.existsSync(path.join(homeDir, ".codex")), false);
  assert.equal(fs.existsSync(path.join(homeDir, ".pi")), false);
  assert.equal(fs.existsSync(path.join(homeDir, ".hermes")), false);
});

test("uninstalling one agent keeps shared skills for remaining agents and removes them when last agent is removed", (t) => {
  const homeDir = makeSandbox(t, "paperloom-uninstall-");
  const baseOpts = {
    homeDir,
    platform: process.platform,
    env: {},
    repoRoot,
    backendRoot,
    cliPath: "/opt/paperloom/retainpdf",
  };
  installAgentIntegrations({ ...baseOpts, agents: ["codex", "claude", "hermes"] });

  // Remove only Claude: Codex & Hermes stay intact, shared ~/.agents/skills remains.
  const partial = uninstallAgentIntegrations({ ...baseOpts, agents: ["claude"] });
  assert.equal(partial.ok, true);
  assert.equal(partial.status.agents.claude.mcpConfigured, false);
  assert.equal(partial.status.agents.claude.skillsConfigured, false);
  assert.equal(partial.status.agents.codex.mcpConfigured, true);
  assert.equal(partial.status.agents.codex.skillsConfigured, true);
  assert.equal(partial.status.sharedSkills.length, 3);

  // Remove remaining agents: shared ~/.agents/skills/paperloom-* is cleaned up too.
  const full = uninstallAgentIntegrations({ ...baseOpts, agents: ["codex", "hermes"] });
  assert.equal(full.ok, true);
  assert.equal(full.status.agents.codex.mcpConfigured, false);
  assert.equal(full.status.agents.hermes.mcpConfigured, false);
  assert.equal(full.status.agents.hermes.skillsConfigured, false);
  assert.deepEqual(full.status.sharedSkills, []);
});

test("live MCP handshake check validates UTF-8 initialize and tools/list when local CLI binary exists", (t) => {
  const cliName = process.platform === "win32" ? "paperloom.exe" : "paperloom";
  const cliPath = path.join(repoRoot, "target", "release", cliName);
  if (!fs.existsSync(cliPath)) {
    t.skip(`local release CLI not built at ${cliPath}`);
    return;
  }
  const cleanEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
  };
  const probe = testAgentMcp({ cliPath, env: cleanEnv });
  assert.equal(probe.ok, true, probe.error || "MCP handshake failed");
  assert.ok(probe.toolCount >= 20, `expected >=20 tools, got ${probe.toolCount}`);
  assert.equal(probe.hasSearchScholarly, true);
});
