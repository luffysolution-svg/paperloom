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

function readJsonFile(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`配置文件无法读取：${file}`);
  }
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function installCodexProject(projectRoot, cli) {
  const file = path.join(projectRoot, "mcp.json");
  const config = readJsonFile(file);
  config.mcpServers = { ...(config.mcpServers || {}), paperloom: { command: cli, args: ["agent", "mcp"] } };
  writeJsonFile(file, config);
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

  if (installMcp && scope === "project" && agents.includes("codex")) {
    files.push(installCodexProject(projectRoot, cli));
    commands.push(`写入 ${path.join(projectRoot, "mcp.json")}`);
  }

  for (const agent of agents) {
    if (!installMcp) break;
    if (agent === "codex" && scope === "global") {
      runCommand("codex", ["mcp", "add", "paperloom", "--", cli, "agent", "mcp"], projectRoot);
      commands.push("codex mcp add paperloom");
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
      targets.push({ agent: "project", root: path.join(projectRoot, "skills") });
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

function agentIntegrationStatus(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  return {
    projectRoot,
    projectMcp: fs.existsSync(path.join(projectRoot, "mcp.json")),
    projectSkills: SKILLS.filter((skill) => fs.existsSync(path.join(projectRoot, "skills", skill))),
    globalSkills: SKILLS.filter((skill) => fs.existsSync(path.join(os.homedir(), ".agents", "skills", skill))),
  };
}

module.exports = { AGENTS, SKILLS, agentIntegrationStatus, installAgentIntegrations };
