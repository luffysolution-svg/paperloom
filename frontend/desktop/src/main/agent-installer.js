const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const AGENTS = ["codex", "claude", "pi"];
const SKILLS = ["paperloom-pdf-ops", "paperloom-paper-reader", "paperloom-paper-search"];

function normalizeAgents(value) {
  const selected = Array.isArray(value) ? value.filter((agent) => AGENTS.includes(agent)) : [];
  return selected.length ? [...new Set(selected)] : [...AGENTS];
}

function resolveSkillRoot({ repoRoot, backendRoot }) {
  const source = path.join(repoRoot, "skills");
  if (fs.existsSync(source)) return source;
  return path.join(backendRoot, "agent-skills");
}

function copySkills(sourceRoot, targetRoot) {
  const copyTree = (source, target) => {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      for (const entry of fs.readdirSync(source)) {
        copyTree(path.join(source, entry), path.join(target, entry));
      }
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  };
  const installed = [];
  for (const skill of SKILLS) {
    const source = path.join(sourceRoot, skill);
    if (!fs.existsSync(source)) continue;
    const target = path.join(targetRoot, skill);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (path.resolve(source) !== path.resolve(target)) {
      copyTree(source, target);
    }
    installed.push(target);
  }
  return installed;
}

function resolveCommand(command) {
  const result = spawnSync("where.exe", [command], { encoding: "utf8", windowsHide: true });
  return result.status === 0 ? `${result.stdout || ""}`.split(/\r?\n/).find(Boolean) || command : command;
}

function runCommand(command, args, cwd) {
  const result = spawnSync(resolveCommand(command), args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || "命令执行失败"}`.trim();
    throw new Error(`${command} ${args.join(" ")}：${detail}`);
  }
  return `${result.stdout || ""}`.trim();
}

function installCodexProject(projectRoot, cli) {
  const configRoot = path.join(projectRoot, ".codex");
  const file = path.join(configRoot, "config.toml");
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = existing.split(/\r?\n/);
  const kept = [];
  let removing = false;
  for (const line of lines) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1] || "";
    if (section === "mcp_servers.paperloom" || section.startsWith("mcp_servers.paperloom.")) {
      removing = true;
      continue;
    }
    if (removing && section) removing = false;
    if (!removing) kept.push(line);
  }
  while (kept.length && !kept.at(-1)) kept.pop();
  kept.push(
    "",
    "[mcp_servers.paperloom]",
    `command = ${JSON.stringify(cli)}`,
    'args = ["agent", "mcp"]',
    "",
  );
  fs.mkdirSync(configRoot, { recursive: true });
  fs.writeFileSync(file, kept.join("\n"), "utf8");
  return file;
}

function installAgentIntegrations(options = {}) {
  const scope = options.scope === "global" ? "global" : "project";
  const agents = normalizeAgents(options.agents);
  const installMcp = options.installMcp !== false;
  const installSkills = options.installSkills !== false;
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const repoRoot = options.repoRoot || path.resolve(__dirname, "..", "..", "..");
  const backendRoot = options.backendRoot || path.resolve(__dirname, "..", "..", "app", "backend");
  const cli = options.cliPath || "paperloom";
  const sourceRoot = resolveSkillRoot({ repoRoot, backendRoot });
  const commands = [];
  const files = [];
  const warnings = [];

  for (const agent of agents) {
    if (!installMcp) break;
    if (agent === "codex") {
      if (scope === "global") {
        runCommand("codex", ["mcp", "add", "paperloom", "--", cli, "agent", "mcp"], projectRoot);
        commands.push("codex mcp add paperloom");
      } else {
        files.push(installCodexProject(projectRoot, cli));
        commands.push(`写入 ${path.join(projectRoot, ".codex", "config.toml")}`);
      }
    }
    if (agent === "claude") {
      const scopeFlag = scope === "global" ? "user" : "project";
      try { runCommand("claude", ["mcp", "remove", "paperloom", "--scope", scopeFlag], projectRoot); } catch {}
      runCommand("claude", ["mcp", "add", "--scope", scopeFlag, "--transport", "stdio", "paperloom", "--", cli, "agent", "mcp"], projectRoot);
      commands.push(`claude mcp add --scope ${scopeFlag} paperloom`);
    }
    if (agent === "pi") {
      const args = ["mcp", "add", "paperloom"];
      if (scope === "project") args.push("--local", "--cwd", projectRoot);
      args.push("--", cli, "agent", "mcp");
      runCommand("pi", args, projectRoot);
      commands.push(`pi mcp add${scope === "project" ? " --local" : ""} paperloom`);
    }
  }

  if (installSkills) {
    const targets = [];
    if (scope === "project") {
      if (agents.includes("codex")) targets.push({ agent: "codex", root: path.join(projectRoot, ".agents", "skills") });
      if (agents.includes("claude")) targets.push({ agent: "claude", root: path.join(projectRoot, ".claude", "skills") });
      if (agents.includes("pi")) targets.push({ agent: "pi", root: path.join(projectRoot, ".pi", "agent", "skills") });
    } else {
      if (agents.includes("codex")) targets.push({ agent: "codex", root: path.join(os.homedir(), ".agents", "skills") });
      if (agents.includes("claude")) targets.push({ agent: "claude", root: path.join(os.homedir(), ".claude", "skills") });
      if (agents.includes("pi")) targets.push({ agent: "pi", root: path.join(os.homedir(), ".pi", "agent", "skills") });
    }
    for (const target of targets) {
      const installed = copySkills(sourceRoot, target.root);
      files.push(...installed);
      if (!installed.length) warnings.push(`没有找到可安装的 Skills：${sourceRoot}`);
    }
  }

  return { ok: true, scope, agents, installMcp, installSkills, files, commands, warnings };
}

function hasPaperloomConfig(file) {
  return fs.existsSync(file) && fs.readFileSync(file, "utf8").includes("paperloom");
}

function agentIntegrationStatus(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const projectSkillRoots = [
    path.join(projectRoot, ".agents", "skills"),
    path.join(projectRoot, ".claude", "skills"),
    path.join(projectRoot, ".pi", "agent", "skills"),
  ];
  const globalSkillRoots = [
    path.join(os.homedir(), ".agents", "skills"),
    path.join(os.homedir(), ".claude", "skills"),
    path.join(os.homedir(), ".pi", "agent", "skills"),
  ];
  return {
    projectRoot,
    projectMcp: hasPaperloomConfig(path.join(projectRoot, ".codex", "config.toml"))
      || hasPaperloomConfig(path.join(projectRoot, ".mcp.json"))
      || hasPaperloomConfig(path.join(projectRoot, ".pi", "mcp.json")),
    projectSkills: SKILLS.filter((skill) => projectSkillRoots.some((root) => fs.existsSync(path.join(root, skill)))),
    globalSkills: SKILLS.filter((skill) => globalSkillRoots.some((root) => fs.existsSync(path.join(root, skill)))),
  };
}

module.exports = { AGENTS, SKILLS, agentIntegrationStatus, installAgentIntegrations };
