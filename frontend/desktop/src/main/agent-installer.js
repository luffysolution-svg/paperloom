const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { TextDecoder } = require("util");

const AGENTS = ["codex", "claude", "pi", "workbuddy", "hermes"];
const SKILLS = ["paperloom-pdf-ops", "paperloom-paper-reader", "paperloom-paper-search"];
const SHARED_SKILLS_SPEC = "~/.agents/skills";

function normalizeAgents(value) {
  const selected = Array.isArray(value) ? value.filter((agent) => AGENTS.includes(agent)) : [];
  return selected.length ? [...new Set(selected)] : [...AGENTS];
}

function resolveRuntimeContext(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const homeDir = path.resolve(options.homeDir || os.homedir());
  const repoRoot = options.repoRoot || path.resolve(__dirname, "..", "..", "..");
  const backendRoot = options.backendRoot || path.resolve(__dirname, "..", "..", "app", "backend");
  const cliPath = `${options.cliPath || ""}`.trim();
  return { platform, env, homeDir, repoRoot, backendRoot, cliPath };
}

function resolveSkillRoot({ repoRoot, backendRoot }) {
  const bundled = path.join(backendRoot, "agent-skills");
  const repo = path.join(repoRoot, "skills");
  if (fs.existsSync(repo)) return repo;
  return bundled;
}

function writeFileAtomic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.paperloom-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.tmp`;
  fs.writeFileSync(temp, content, "utf8");
  fs.renameSync(temp, filePath);
}

function copyTree(source, target) {
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
}

function removeEntryIfExists(target) {
  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(target);
      return true;
    }
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function resolveAgentPaths(ctx) {
  const { homeDir, env } = ctx;
  const sharedSkillsDir = path.join(homeDir, ".agents", "skills");

  const codexHome = `${env.CODEX_HOME || ""}`.trim()
    ? path.resolve(env.CODEX_HOME)
    : path.join(homeDir, ".codex");
  const piAgentDir = `${env.PI_CODING_AGENT_DIR || ""}`.trim()
    ? path.resolve(env.PI_CODING_AGENT_DIR)
    : path.join(homeDir, ".pi", "agent");
  const hermesHome = `${env.HERMES_HOME || ""}`.trim()
    ? path.resolve(env.HERMES_HOME)
    : path.join(homeDir, ".hermes");

  let workbuddyDir = path.join(homeDir, ".workbuddy");
  let workbuddyDirName = ".workbuddy";
  if (`${env.WORKBUDDY_CONFIG_DIR || ""}`.trim()) {
    workbuddyDir = path.resolve(env.WORKBUDDY_CONFIG_DIR);
    workbuddyDirName = path.basename(workbuddyDir);
  } else if (fs.existsSync(path.join(homeDir, ".workbuddy"))) {
    workbuddyDir = path.join(homeDir, ".workbuddy");
    workbuddyDirName = ".workbuddy";
  } else if (`${env.CODEBUDDY_CONFIG_DIR || ""}`.trim()) {
    workbuddyDir = path.resolve(env.CODEBUDDY_CONFIG_DIR);
    workbuddyDirName = path.basename(workbuddyDir);
  } else if (fs.existsSync(path.join(homeDir, ".codebuddy"))) {
    workbuddyDir = path.join(homeDir, ".codebuddy");
    workbuddyDirName = ".codebuddy";
  }

  const workbuddyMcpPath = !fs.existsSync(path.join(workbuddyDir, "mcp.json"))
    && fs.existsSync(path.join(workbuddyDir, ".mcp.json"))
    ? path.join(workbuddyDir, ".mcp.json")
    : path.join(workbuddyDir, "mcp.json");

  return {
    sharedSkillsDir,
    codex: {
      rootDir: codexHome,
      mcpConfigPath: path.join(codexHome, "config.toml"),
      skillsDir: sharedSkillsDir,
      legacySkillsDir: path.join(codexHome, "skills"),
    },
    claude: {
      rootDir: path.join(homeDir, ".claude"),
      mcpConfigPath: path.join(homeDir, ".claude.json"),
      skillsDir: path.join(homeDir, ".claude", "skills"),
    },
    pi: {
      rootDir: piAgentDir,
      mcpConfigPath: path.join(piAgentDir, "mcp.json"),
      skillsDir: sharedSkillsDir,
      legacySkillsDir: path.join(piAgentDir, "skills"),
    },
    workbuddy: {
      rootDir: workbuddyDir,
      configDirName: workbuddyDirName,
      mcpConfigPath: workbuddyMcpPath,
      skillsDir: path.join(workbuddyDir, "skills"),
    },
    hermes: {
      rootDir: hermesHome,
      mcpConfigPath: path.join(hermesHome, "config.yaml"),
      skillsDir: sharedSkillsDir,
      legacySkillsDir: path.join(hermesHome, "skills"),
    },
  };
}

// ---------- TOML helpers (Codex) ----------

function readTomlServerCommand(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let inPaperloom = false;
  for (const line of lines) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1]?.trim() || "";
    if (section) {
      inPaperloom = section === "mcp_servers.paperloom";
      continue;
    }
    if (!inPaperloom) continue;
    const match = line.match(/^\s*command\s*=\s*(.+?)\s*$/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return match[1].replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return null;
}

function upsertCodexMcp(filePath, cli) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1]?.trim() || "";
    if (section === "mcp_servers.paperloom" || section.startsWith("mcp_servers.paperloom.")) {
      skipping = true;
      continue;
    }
    if (skipping && section) skipping = false;
    if (!skipping) kept.push(line);
  }
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  if (kept.length) kept.push("");
  kept.push(
    "[mcp_servers.paperloom]",
    `command = ${JSON.stringify(cli)}`,
    'args = ["agent", "mcp"]',
    "startup_timeout_sec = 30.0",
    "tool_timeout_sec = 600.0",
    "",
  );
  writeFileAtomic(filePath, kept.join("\n"));
  return filePath;
}

function removeCodexMcp(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const existing = fs.readFileSync(filePath, "utf8");
  const lines = existing.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  let removed = false;
  for (const line of lines) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1]?.trim() || "";
    if (section === "mcp_servers.paperloom" || section.startsWith("mcp_servers.paperloom.")) {
      skipping = true;
      removed = true;
      continue;
    }
    if (skipping && section) skipping = false;
    if (!skipping) kept.push(line);
  }
  if (!removed) return false;
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  writeFileAtomic(filePath, kept.length ? `${kept.join("\n")}\n` : "");
  return true;
}

// ---------- JSON helpers (Claude Code, Pi, WorkBuddy) ----------

function readJsonObject(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`配置文件 JSON 格式无效，未覆盖：${filePath}（${error.message}）`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`配置文件根节点不是 JSON 对象，未覆盖：${filePath}`);
  }
  return parsed;
}

function readJsonMcpCommand(filePath) {
  try {
    const data = readJsonObject(filePath);
    const entry = data?.mcpServers?.paperloom;
    if (entry && typeof entry === "object" && typeof entry.command === "string") {
      return entry.command;
    }
    return null;
  } catch {
    return null;
  }
}

function upsertJsonMcp(filePath, cli, { includeStdioType = false } = {}) {
  const data = readJsonObject(filePath);
  const servers = data.mcpServers && typeof data.mcpServers === "object" && !Array.isArray(data.mcpServers)
    ? { ...data.mcpServers }
    : {};
  servers.paperloom = includeStdioType
    ? { type: "stdio", command: cli, args: ["agent", "mcp"] }
    : { command: cli, args: ["agent", "mcp"] };
  const next = { ...data, mcpServers: servers };
  writeFileAtomic(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return filePath;
}

function removeJsonMcp(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const data = readJsonObject(filePath);
  if (!data.mcpServers || !Object.prototype.hasOwnProperty.call(data.mcpServers, "paperloom")) {
    return false;
  }
  const servers = { ...data.mcpServers };
  delete servers.paperloom;
  const next = { ...data, mcpServers: servers };
  writeFileAtomic(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return true;
}

// ---------- YAML helpers (Hermes) ----------

function yamlQuote(value) {
  return JSON.stringify(`${value}`);
}

function unquoteYamlScalar(raw) {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    if (trimmed.startsWith('"')) {
      try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
    }
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function findTopLevelYamlBlock(lines, key) {
  const pattern = new RegExp(`^${key}\\s*:(.*)$`);
  const start = lines.findIndex((line) => pattern.test(line));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() && !/^\s/.test(line) && !line.trimStart().startsWith("#")) break;
    end += 1;
  }
  return { start, end, inlineValue: lines[start].match(pattern)[1].trim() };
}

function stripYamlChildBlock(blockLines, childKey) {
  const out = [];
  let skippingIndent = null;
  let removed = false;
  const childRe = new RegExp(`^(\\s+)${childKey}\\s*:`);
  for (const line of blockLines) {
    const trimmed = line.trim();
    const indent = line.match(/^(\s*)/)[1].length;
    if (skippingIndent !== null) {
      if (!trimmed || indent > skippingIndent) {
        continue;
      }
      skippingIndent = null;
    }
    const match = line.match(childRe);
    if (match) {
      skippingIndent = match[1].length;
      removed = true;
      continue;
    }
    out.push(line);
  }
  return { lines: out, removed };
}

function readHermesMcpCommand(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const block = findTopLevelYamlBlock(lines, "mcp_servers");
  if (!block) return null;
  let inPaperloom = false;
  let paperloomIndent = 0;
  for (let i = block.start + 1; i < block.end; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (!inPaperloom) {
      if (/^paperloom\s*:/.test(trimmed)) {
        inPaperloom = true;
        paperloomIndent = indent;
      }
      continue;
    }
    if (indent <= paperloomIndent) break;
    const cmdMatch = trimmed.match(/^command\s*:\s*(.+)$/);
    if (cmdMatch) return unquoteYamlScalar(cmdMatch[1]);
  }
  return null;
}

function upsertHermesMcp(filePath, cli) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const block = findTopLevelYamlBlock(lines, "mcp_servers");
  const entryLines = [
    "  paperloom:",
    `    command: ${yamlQuote(cli)}`,
    "    args:",
    '      - "agent"',
    '      - "mcp"',
  ];
  let nextLines;
  if (!block) {
    nextLines = [...lines];
    while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
    if (nextLines.length) nextLines.push("");
    nextLines.push("mcp_servers:", ...entryLines);
  } else {
    const before = lines.slice(0, block.start);
    const body = block.inlineValue === "{}" || block.inlineValue === "null"
      ? []
      : lines.slice(block.start + 1, block.end);
    const after = lines.slice(block.end);
    const stripped = stripYamlChildBlock(body, "paperloom").lines;
    while (stripped.length && !stripped[stripped.length - 1].trim()) stripped.pop();
    nextLines = [...before, "mcp_servers:", ...stripped, ...entryLines];
    if (after.length) nextLines.push("", ...after);
  }
  while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
  writeFileAtomic(filePath, `${nextLines.join("\n")}\n`);
  return filePath;
}

function removeHermesMcp(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const block = findTopLevelYamlBlock(lines, "mcp_servers");
  if (!block) return false;
  const before = lines.slice(0, block.start);
  const body = lines.slice(block.start + 1, block.end);
  const after = lines.slice(block.end);
  const { lines: stripped, removed } = stripYamlChildBlock(body, "paperloom");
  if (!removed) return false;
  const hasRemaining = stripped.some((line) => line.trim() && !line.trim().startsWith("#"));
  const nextLines = hasRemaining
    ? [...before, lines[block.start], ...stripped, ...after]
    : [...before, ...after];
  while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
  writeFileAtomic(filePath, nextLines.length ? `${nextLines.join("\n")}\n` : "");
  return true;
}

function normalizeComparablePath(raw, homeDir) {
  const expanded = raw.startsWith("~/") || raw.startsWith("~\\")
    ? path.join(homeDir, raw.slice(2))
    : raw;
  return path.resolve(expanded).replace(/\\/g, "/").toLowerCase();
}

function hermesHasExternalSharedSkills(filePath, sharedSkillsDir, homeDir) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const block = findTopLevelYamlBlock(lines, "skills");
  if (!block) return false;
  const targetNorm = normalizeComparablePath(sharedSkillsDir, homeDir);
  let inExternal = false;
  let externalIndent = 0;
  for (let i = block.start + 1; i < block.end; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (!inExternal) {
      const inlineMatch = trimmed.match(/^external_dirs\s*:\s*\[(.+)\]$/);
      if (inlineMatch) {
        const items = inlineMatch[1].split(",").map((part) => unquoteYamlScalar(part));
        if (items.some((item) => normalizeComparablePath(item, homeDir) === targetNorm)) return true;
      } else if (/^external_dirs\s*:/.test(trimmed)) {
        inExternal = true;
        externalIndent = indent;
      }
      continue;
    }
    if (indent <= externalIndent && !trimmed.startsWith("-")) break;
    const itemMatch = trimmed.match(/^-\s*(.+)$/);
    if (itemMatch && normalizeComparablePath(unquoteYamlScalar(itemMatch[1]), homeDir) === targetNorm) {
      return true;
    }
  }
  return false;
}

function upsertHermesExternalSkillsDir(filePath, sharedSkillsDir, homeDir) {
  if (hermesHasExternalSharedSkills(filePath, sharedSkillsDir, homeDir)) return filePath;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const block = findTopLevelYamlBlock(lines, "skills");
  const entryLine = `    - ${yamlQuote(SHARED_SKILLS_SPEC)}`;
  let nextLines;
  if (!block) {
    nextLines = [...lines];
    while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
    if (nextLines.length) nextLines.push("");
    nextLines.push("skills:", "  external_dirs:", entryLine);
  } else {
    const before = lines.slice(0, block.start);
    const body = block.inlineValue === "{}" || block.inlineValue === "null"
      ? []
      : lines.slice(block.start + 1, block.end);
    const after = lines.slice(block.end);
    const extIdx = body.findIndex((line) => /^\s+external_dirs\s*:/.test(line));
    const nextBody = [...body];
    if (extIdx < 0) {
      while (nextBody.length && !nextBody[nextBody.length - 1].trim()) nextBody.pop();
      nextBody.push("  external_dirs:", entryLine);
    } else {
      const extLine = nextBody[extIdx];
      const extIndent = extLine.match(/^(\s*)/)[1].length;
      const inlineList = extLine.match(/external_dirs\s*:\s*\[(.*)\]\s*$/);
      if (inlineList) {
        const currentItems = inlineList[1].trim()
          ? inlineList[1].split(",").map((part) => unquoteYamlScalar(part)).filter(Boolean)
          : [];
        const replacement = [
          `${" ".repeat(extIndent)}external_dirs:`,
          ...currentItems.map((item) => `${" ".repeat(extIndent + 2)}- ${yamlQuote(item)}`),
          `${" ".repeat(extIndent + 2)}- ${yamlQuote(SHARED_SKILLS_SPEC)}`,
        ];
        nextBody.splice(extIdx, 1, ...replacement);
      } else {
        let insertAt = extIdx + 1;
        while (insertAt < nextBody.length) {
          const cur = nextBody[insertAt];
          const curTrim = cur.trim();
          const curIndent = cur.match(/^(\s*)/)[1].length;
          if (curTrim && curIndent <= extIndent && !curTrim.startsWith("-")) break;
          insertAt += 1;
        }
        nextBody.splice(insertAt, 0, `${" ".repeat(extIndent + 2)}- ${yamlQuote(SHARED_SKILLS_SPEC)}`);
      }
    }
    nextLines = [...before, "skills:", ...nextBody];
    if (after.length) nextLines.push("", ...after);
  }
  while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
  writeFileAtomic(filePath, `${nextLines.join("\n")}\n`);
  return filePath;
}

function removeHermesExternalSkillsDir(filePath, sharedSkillsDir, homeDir) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const block = findTopLevelYamlBlock(lines, "skills");
  if (!block) return false;
  const targetNorm = normalizeComparablePath(sharedSkillsDir, homeDir);
  const body = lines.slice(block.start + 1, block.end);
  let removed = false;
  const filtered = [];
  for (const line of body) {
    const itemMatch = line.trim().match(/^-\s*(.+)$/);
    if (itemMatch && normalizeComparablePath(unquoteYamlScalar(itemMatch[1]), homeDir) === targetNorm) {
      removed = true;
      continue;
    }
    filtered.push(line);
  }
  if (!removed) return false;
  const before = lines.slice(0, block.start);
  const after = lines.slice(block.end);
  const nextLines = [...before, lines[block.start], ...filtered, ...after];
  while (nextLines.length && !nextLines[nextLines.length - 1].trim()) nextLines.pop();
  writeFileAtomic(filePath, nextLines.length ? `${nextLines.join("\n")}\n` : "");
  return true;
}

// ---------- Skills installation & deduplication ----------

function installCanonicalSkills(sourceRoot, sharedSkillsDir) {
  const installed = [];
  for (const skill of SKILLS) {
    const source = path.join(sourceRoot, skill);
    if (!fs.existsSync(source)) continue;
    const target = path.join(sharedSkillsDir, skill);
    if (path.resolve(source) !== path.resolve(target)) {
      removeEntryIfExists(target);
      copyTree(source, target);
    }
    installed.push(target);
  }
  return installed;
}

function linkOrCopySkills(sharedSkillsDir, targetDir, platform) {
  const installed = [];
  let mode = "linked";
  fs.mkdirSync(targetDir, { recursive: true });
  for (const skill of SKILLS) {
    const source = path.join(sharedSkillsDir, skill);
    if (!fs.existsSync(source)) continue;
    const target = path.join(targetDir, skill);
    if (path.resolve(source) === path.resolve(target)) {
      installed.push(target);
      continue;
    }
    removeEntryIfExists(target);
    try {
      fs.symlinkSync(source, target, platform === "win32" ? "junction" : "dir");
    } catch {
      mode = "copied";
      copyTree(source, target);
    }
    installed.push(target);
  }
  return { installed, mode };
}

function cleanupDuplicateSkills(legacySkillsDir, sharedSkillsDir) {
  if (!legacySkillsDir || !fs.existsSync(legacySkillsDir)) return [];
  if (path.resolve(legacySkillsDir) === path.resolve(sharedSkillsDir)) return [];
  const removed = [];
  for (const skill of SKILLS) {
    const candidate = path.join(legacySkillsDir, skill);
    if (removeEntryIfExists(candidate)) {
      removed.push(candidate);
    }
  }
  return removed;
}

function findInstalledSkills(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return SKILLS.filter((skill) => fs.existsSync(path.join(dir, skill, "SKILL.md")));
}

function findDuplicateSkillPaths(legacySkillsDir, sharedSkillsDir) {
  if (!legacySkillsDir || !fs.existsSync(legacySkillsDir)) return [];
  if (path.resolve(legacySkillsDir) === path.resolve(sharedSkillsDir)) return [];
  return SKILLS
    .map((skill) => path.join(legacySkillsDir, skill))
    .filter((candidate) => {
      try {
        fs.lstatSync(candidate);
        return true;
      } catch {
        return false;
      }
    });
}

function detectLinkMode(skillsDir, sharedSkillsDir) {
  const present = findInstalledSkills(skillsDir);
  if (!present.length) return "missing";
  const allLinked = present.every((skill) => {
    const target = path.join(skillsDir, skill);
    const source = path.join(sharedSkillsDir, skill);
    try {
      return fs.lstatSync(target).isSymbolicLink()
        && fs.existsSync(source)
        && fs.realpathSync(target) === fs.realpathSync(source);
    } catch {
      return false;
    }
  });
  return allLinked ? "linked" : "copied";
}

function detectPiMcpAdapter(piAgentDir) {
  const settingsPath = path.join(piAgentDir, "settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, "utf8");
      if (content.includes("pi-mcp-adapter")) return true;
    } catch {
      // ignore unreadable settings
    }
  }
  const extensionDir = path.join(piAgentDir, "extensions");
  if (fs.existsSync(extensionDir)) {
    try {
      const entries = fs.readdirSync(extensionDir);
      if (entries.some((entry) => entry.includes("mcp"))) return true;
    } catch {
      // ignore
    }
  }
  const npmDir = path.join(piAgentDir, "npm", "node_modules", "pi-mcp-adapter");
  return fs.existsSync(npmDir);
}

// ---------- Public API ----------

function agentIntegrationStatus(options = {}) {
  const ctx = resolveRuntimeContext(options);
  const paths = resolveAgentPaths(ctx);
  const sourceRoot = resolveSkillRoot(ctx);
  const sharedSkills = findInstalledSkills(paths.sharedSkillsDir);
  const sharedReady = sharedSkills.length === SKILLS.length;

  const codexCmd = readTomlServerCommand(paths.codex.mcpConfigPath);
  const claudeCmd = readJsonMcpCommand(paths.claude.mcpConfigPath);
  const piCmd = readJsonMcpCommand(paths.pi.mcpConfigPath);
  const workbuddyCmd = readJsonMcpCommand(paths.workbuddy.mcpConfigPath);
  const hermesCmd = readHermesMcpCommand(paths.hermes.mcpConfigPath);

  const claudeSkills = findInstalledSkills(paths.claude.skillsDir);
  const workbuddySkills = findInstalledSkills(paths.workbuddy.skillsDir);
  const hermesExternal = hermesHasExternalSharedSkills(paths.hermes.mcpConfigPath, paths.sharedSkillsDir, ctx.homeDir);
  const hermesLocalSkills = findInstalledSkills(paths.hermes.legacySkillsDir);

  return {
    platform: ctx.platform,
    homeDir: ctx.homeDir,
    cliPath: ctx.cliPath,
    cliAvailable: Boolean(ctx.cliPath && fs.existsSync(ctx.cliPath)),
    sharedSkillsDir: paths.sharedSkillsDir,
    sharedSkills,
    allSkills: [...SKILLS],
    skillSourceFound: fs.existsSync(sourceRoot),
    agents: {
      codex: {
        detected: fs.existsSync(paths.codex.rootDir),
        mcpConfigured: Boolean(codexCmd),
        mcpCommand: codexCmd || "",
        mcpConfigPath: paths.codex.mcpConfigPath,
        skillsConfigured: sharedReady,
        skillsMode: sharedReady ? "shared" : "missing",
        skillsPath: paths.sharedSkillsDir,
        duplicateSkillPaths: findDuplicateSkillPaths(paths.codex.legacySkillsDir, paths.sharedSkillsDir),
      },
      claude: {
        detected: fs.existsSync(paths.claude.rootDir) || fs.existsSync(paths.claude.mcpConfigPath),
        mcpConfigured: Boolean(claudeCmd),
        mcpCommand: claudeCmd || "",
        mcpConfigPath: paths.claude.mcpConfigPath,
        skillsConfigured: claudeSkills.length === SKILLS.length,
        skillsMode: detectLinkMode(paths.claude.skillsDir, paths.sharedSkillsDir),
        skillsPath: paths.claude.skillsDir,
        duplicateSkillPaths: [],
      },
      pi: {
        detected: fs.existsSync(paths.pi.rootDir),
        mcpConfigured: Boolean(piCmd),
        mcpCommand: piCmd || "",
        mcpConfigPath: paths.pi.mcpConfigPath,
        skillsConfigured: sharedReady,
        skillsMode: sharedReady ? "shared" : "missing",
        skillsPath: paths.sharedSkillsDir,
        duplicateSkillPaths: findDuplicateSkillPaths(paths.pi.legacySkillsDir, paths.sharedSkillsDir),
        adapterInstalled: detectPiMcpAdapter(paths.pi.rootDir),
      },
      workbuddy: {
        detected: fs.existsSync(paths.workbuddy.rootDir),
        configDirName: paths.workbuddy.configDirName,
        mcpConfigured: Boolean(workbuddyCmd),
        mcpCommand: workbuddyCmd || "",
        mcpConfigPath: paths.workbuddy.mcpConfigPath,
        skillsConfigured: workbuddySkills.length === SKILLS.length,
        skillsMode: detectLinkMode(paths.workbuddy.skillsDir, paths.sharedSkillsDir),
        skillsPath: paths.workbuddy.skillsDir,
        duplicateSkillPaths: [],
      },
      hermes: {
        detected: fs.existsSync(paths.hermes.rootDir),
        mcpConfigured: Boolean(hermesCmd),
        mcpCommand: hermesCmd || "",
        mcpConfigPath: paths.hermes.mcpConfigPath,
        skillsConfigured: (sharedReady && hermesExternal) || hermesLocalSkills.length === SKILLS.length,
        skillsMode: sharedReady && hermesExternal
          ? "external_dir"
          : hermesLocalSkills.length === SKILLS.length ? "local" : "missing",
        skillsPath: hermesExternal ? paths.sharedSkillsDir : paths.hermes.legacySkillsDir,
        duplicateSkillPaths: hermesExternal
          ? findDuplicateSkillPaths(paths.hermes.legacySkillsDir, paths.sharedSkillsDir)
          : [],
      },
    },
  };
}

function installAgentIntegrations(options = {}) {
  const ctx = resolveRuntimeContext(options);
  const paths = resolveAgentPaths(ctx);
  const agents = normalizeAgents(options.agents);
  const installMcp = options.installMcp !== false;
  const installSkills = options.installSkills !== false;
  const cli = ctx.cliPath || "paperloom";
  const sourceRoot = resolveSkillRoot(ctx);

  const configuredMcp = [];
  const installedFiles = [];
  const cleanedDuplicates = [];
  const warnings = [];

  if (installMcp) {
    if (!ctx.cliPath) {
      warnings.push("未检测到内置 CLI 路径，已写入 paperloom 命令名；请确保 paperloom 已在终端 PATH 中。");
    }
    for (const agent of agents) {
      if (agent === "codex") {
        configuredMcp.push({ agent, path: upsertCodexMcp(paths.codex.mcpConfigPath, cli) });
      } else if (agent === "claude") {
        configuredMcp.push({
          agent,
          path: upsertJsonMcp(paths.claude.mcpConfigPath, cli, { includeStdioType: true }),
        });
      } else if (agent === "pi") {
        configuredMcp.push({ agent, path: upsertJsonMcp(paths.pi.mcpConfigPath, cli) });
        if (!detectPiMcpAdapter(paths.pi.rootDir)) {
          warnings.push("Pi 需安装 pi-mcp-adapter 才能加载 mcp.json：请在终端运行 pi install npm:pi-mcp-adapter。");
        }
      } else if (agent === "workbuddy") {
        configuredMcp.push({ agent, path: upsertJsonMcp(paths.workbuddy.mcpConfigPath, cli) });
      } else if (agent === "hermes") {
        configuredMcp.push({ agent, path: upsertHermesMcp(paths.hermes.mcpConfigPath, cli) });
      }
    }
  }

  if (installSkills) {
    const canonical = installCanonicalSkills(sourceRoot, paths.sharedSkillsDir);
    if (!canonical.length) {
      warnings.push(`未找到内置科研 Skills 目录：${sourceRoot}`);
    } else {
      installedFiles.push(...canonical);
      if (agents.includes("codex")) {
        cleanedDuplicates.push(...cleanupDuplicateSkills(paths.codex.legacySkillsDir, paths.sharedSkillsDir));
      }
      if (agents.includes("pi")) {
        cleanedDuplicates.push(...cleanupDuplicateSkills(paths.pi.legacySkillsDir, paths.sharedSkillsDir));
      }
      if (agents.includes("hermes")) {
        upsertHermesExternalSkillsDir(paths.hermes.mcpConfigPath, paths.sharedSkillsDir, ctx.homeDir);
        cleanedDuplicates.push(...cleanupDuplicateSkills(paths.hermes.legacySkillsDir, paths.sharedSkillsDir));
      }
      if (agents.includes("claude")) {
        const linked = linkOrCopySkills(paths.sharedSkillsDir, paths.claude.skillsDir, ctx.platform);
        installedFiles.push(...linked.installed);
      }
      if (agents.includes("workbuddy")) {
        const linked = linkOrCopySkills(paths.sharedSkillsDir, paths.workbuddy.skillsDir, ctx.platform);
        installedFiles.push(...linked.installed);
      }
    }
  }

  return {
    ok: true,
    scope: "global",
    agents,
    installMcp,
    installSkills,
    cliPath: cli,
    configuredMcp,
    files: installedFiles,
    cleanedDuplicates,
    warnings,
    status: agentIntegrationStatus(options),
  };
}

function uninstallAgentIntegrations(options = {}) {
  const ctx = resolveRuntimeContext(options);
  const paths = resolveAgentPaths(ctx);
  const agents = normalizeAgents(options.agents);
  const removeMcp = options.removeMcp !== false;
  const removeSkills = options.removeSkills !== false;

  const removedMcp = [];
  const removedSkills = [];

  for (const agent of agents) {
    if (removeMcp) {
      if (agent === "codex" && removeCodexMcp(paths.codex.mcpConfigPath)) {
        removedMcp.push({ agent, path: paths.codex.mcpConfigPath });
      } else if (agent === "claude" && removeJsonMcp(paths.claude.mcpConfigPath)) {
        removedMcp.push({ agent, path: paths.claude.mcpConfigPath });
      } else if (agent === "pi" && removeJsonMcp(paths.pi.mcpConfigPath)) {
        removedMcp.push({ agent, path: paths.pi.mcpConfigPath });
      } else if (agent === "workbuddy" && removeJsonMcp(paths.workbuddy.mcpConfigPath)) {
        removedMcp.push({ agent, path: paths.workbuddy.mcpConfigPath });
      } else if (agent === "hermes" && removeHermesMcp(paths.hermes.mcpConfigPath)) {
        removedMcp.push({ agent, path: paths.hermes.mcpConfigPath });
      }
    }
    if (removeSkills) {
      if (agent === "codex") {
        removedSkills.push(...cleanupDuplicateSkills(paths.codex.legacySkillsDir, paths.sharedSkillsDir));
      } else if (agent === "claude") {
        removedSkills.push(...cleanupDuplicateSkills(paths.claude.skillsDir, paths.sharedSkillsDir));
      } else if (agent === "pi") {
        removedSkills.push(...cleanupDuplicateSkills(paths.pi.legacySkillsDir, paths.sharedSkillsDir));
      } else if (agent === "workbuddy") {
        removedSkills.push(...cleanupDuplicateSkills(paths.workbuddy.skillsDir, paths.sharedSkillsDir));
      } else if (agent === "hermes") {
        removeHermesExternalSkillsDir(paths.hermes.mcpConfigPath, paths.sharedSkillsDir, ctx.homeDir);
        removedSkills.push(...cleanupDuplicateSkills(paths.hermes.legacySkillsDir, paths.sharedSkillsDir));
      }
    }
  }

  // Only remove the canonical shared hub (~/.agents/skills/paperloom-*) when no remaining
  // configured agent (Codex, Pi, Hermes, Claude, WorkBuddy) still references it.
  if (removeSkills) {
    const remaining = agentIntegrationStatus(options).agents;
    const stillUsedBySharedClient = ["codex", "pi", "hermes"].some((id) => !agents.includes(id) && remaining[id].mcpConfigured);
    const stillUsedByLinkedClient = ["claude", "workbuddy"].some((id) => remaining[id].skillsConfigured);
    if (!stillUsedBySharedClient && !stillUsedByLinkedClient) {
      for (const skill of SKILLS) {
        const candidate = path.join(paths.sharedSkillsDir, skill);
        if (removeEntryIfExists(candidate)) removedSkills.push(candidate);
      }
    }
  }

  return {
    ok: true,
    agents,
    removedMcp,
    removedSkills,
    status: agentIntegrationStatus(options),
  };
}

function testAgentMcp(options = {}) {
  const ctx = resolveRuntimeContext(options);
  const cli = ctx.cliPath;
  if (!cli || !fs.existsSync(cli)) {
    return {
      ok: false,
      cliPath: cli || "",
      error: "未找到 PaperLoom 内置 CLI 可执行文件，无法执行 MCP 握手检测。",
    };
  }
  const input = [
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "paperloom-settings", version: "1" } },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_capabilities", arguments: {} } }),
  ].join("\n") + "\n";

  const result = spawnSync(cli, ["agent", "mcp"], {
    input,
    timeout: 12000,
    windowsHide: true,
    env: ctx.env,
  });

  if (result.error) {
    return { ok: false, cliPath: cli, error: `启动 MCP 失败：${result.error.message}` };
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || Buffer.alloc(0)).toString("utf8").trim();
    return { ok: false, cliPath: cli, error: stderr || `MCP 进程异常退出（代码 ${result.status}）` };
  }

  let decoded;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(result.stdout || Buffer.alloc(0));
  } catch (error) {
    return { ok: false, cliPath: cli, error: `MCP 输出包含非法 UTF-8 字节：${error.message}` };
  }

  const responses = decoded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);

  const initResp = responses.find((item) => item.id === 1);
  const toolsResp = responses.find((item) => item.id === 2);
  const capResp = responses.find((item) => item.id === 3);

  const tools = toolsResp?.result?.tools;
  if (!initResp?.result?.serverInfo || !Array.isArray(tools) || !tools.length) {
    return {
      ok: false,
      cliPath: cli,
      error: "MCP 握手未返回完整的 initialize 或 tools/list 响应。",
    };
  }

  const capContent = capResp?.result?.structuredContent;
  const backendConnected = Boolean(capContent && capContent.ok === true);
  const backendMessage = backendConnected
    ? "本地 PaperLoom 后端已连通"
    : (capContent?.error?.message || "MCP 握手正常（后端未启动或未写入 runtime 文件）");

  return {
    ok: true,
    cliPath: cli,
    protocolVersion: initResp.result.protocolVersion || "",
    serverVersion: initResp.result.serverInfo.version || "",
    toolCount: tools.length,
    hasSearchScholarly: tools.some((tool) => tool.name === "search_scholarly"),
    backendConnected,
    backendMessage,
  };
}

module.exports = {
  AGENTS,
  SKILLS,
  SHARED_SKILLS_SPEC,
  agentIntegrationStatus,
  installAgentIntegrations,
  uninstallAgentIntegrations,
  testAgentMcp,
};
