"""Agentero catalog parity: ecf14d84, 2026-11-07 (16 BYOA presets)."""
import os
import shutil
import sys
from pathlib import Path


def _preset(id, name, command, args=(), host="", install="", hint=""):
    return dict(id=id, name=name, command=command, args=list(args), host=host or command, install=install, hint=hint)


PRESETS = [
    _preset("codex-acp", "Codex", "codex-acp", host="codex", install="npm i -g @agentclientprotocol/codex-acp", hint="先运行 codex login；适配器复用 Codex 的配置与登录。"),
    _preset("claude-acp", "Claude Code", "claude-agent-acp", host="claude", install="npm i -g @agentclientprotocol/claude-agent-acp", hint="先运行 claude auth login。"),
    _preset("opencode", "OpenCode", "opencode", ["acp"]),
    _preset("pi", "Pi", "pi-acp", host="pi", install="npm i -g pi-acp", hint="复用 Pi 配置；PaperLoom 文档工具通过本轮工具桥接调用。"),
    _preset("grok-build", "Grok Build", "grok", ["agent", "stdio"]),
    _preset("codebuddy", "CodeBuddy", "codebuddy", ["--acp"]),
    _preset("cursor-agent", "Cursor Agent", "cursor-agent", ["acp"]),
    _preset("hermes", "Hermes Agent", "hermes", ["acp"]),
    _preset("antigravity-acp", "Antigravity", "agy_acp_server.exe" if os.name == "nt" else "agy_acp_server.par", ["--uid="] if sys.platform.startswith("linux") else [], hint="安装官方独立 ACP server；它的认证与 IDE 登录独立。可填写完整路径。"),
    _preset("qodercli", "Qoder CLI", "qodercli", ["--acp"]),
    _preset("qoder-cn", "Qoder CN", "qodercn", ["--acp"]),
    _preset("dsh", "DeepSeek Harness", "dsh", ["--profile", "acp"], install="npm i -g @deepseek-ai/dsh"),
    _preset("kimi-code", "Kimi Code", "kimi", ["acp"]),
    _preset("zcode", "ZCode", "zcode-acp-server", ["server"], install="npm i -g zcode-acp-server --ignore-scripts" if os.name == "nt" else "npm i -g zcode-acp-server", hint="复用 ~/.zcode。桌面版 CLI 可用 ZCODE_BIN 指向 zcode.cjs。"),
    _preset("minimax-code", "MiniMax Code", "mcode", ["acp"], hint="先运行 mcode login。"),
    _preset("mimo-code", "MiMo Code", "mimo", ["acp"]),
]


def executable(command: str, env: dict | None = None) -> str:
    environment = env or os.environ
    found = shutil.which(command, path=environment.get("PATH")) or (command if Path(command).is_file() else "")
    if found or Path(command).name != command:
        return found
    home = Path(environment.get("USERPROFILE") or environment.get("HOME") or str(Path.home()))
    directories = [home / ".local/bin", home / ".cargo/bin", home / ".bun/bin"]
    if os.name == "nt":
        directories += [home / "AppData/Roaming/npm", home / "AppData/Local/codebuddy/bin"]
    for directory in directories:
        found = shutil.which(command, path=str(directory))
        if found:
            return found
    return ""


def host_executable(command: str, env: dict) -> str:
    path = executable(command, env)
    if command == "codex" and os.name == "nt" and path and Path(path).suffix.lower() in {".cmd", ".bat"}:
        modules = Path(path).parent / "node_modules"
        native = next(modules.glob("@openai/codex*/vendor/*/codex/codex.exe"), None)
        if native:
            return str(native)
    return path


def cached_agent_command(data_root, preset) -> str:
    suffix = ".cmd" if os.name == "nt" else ""
    path = Path(data_root) / "cache" / "acp-adapters" / preset["id"] / "node_modules" / ".bin" / (preset["command"] + suffix)
    return str(path) if path.is_file() else ""


def preset_catalog(data_root=None) -> list[dict]:
    return [{**p, "installed": bool(executable(p["command"]) or (data_root and cached_agent_command(data_root, p))),
             "host_installed": bool(executable(p["host"])), "can_prepare": p["id"] in {"codex-acp", "claude-acp", "pi", "zcode"}} for p in PRESETS]


def cli_path(path) -> str:
    """Node entry points and npm --prefix reject Windows verbatim paths."""
    value = str(path)
    if os.name == "nt":
        if value.startswith("\\\\?\\UNC\\"):
            return "\\\\" + value[8:]
        if value.startswith("\\\\?\\"):
            return value[4:]
    return value


def launch_argv(command: str, args: list[str], env: dict) -> list[str]:
    """Run npm shims directly with Node on Windows, without cmd interpolation."""
    path = executable(command, env)
    if not path:
        raise ValueError("找不到 Agent 启动程序，请安装对应适配器或填写完整路径。")
    if os.name == "nt" and Path(path).suffix.lower() in {".cmd", ".bat"}:
        import re
        shim = Path(path).read_text(encoding="utf-8", errors="replace")
        targets = [value for value in re.findall(r'%dp0%[\\/]([^"\r\n]+)"', shim, re.I)
                   if Path(value).name.lower() not in {"node.exe", "node"}]
        if not targets:
            raise ValueError("无法解析此 Windows 启动脚本，请直接填写可执行文件或 node 与脚本参数。")
        target = cli_path(Path(path).parent / targets[0])
        if Path(target).suffix.lower() in {".exe", ".com"}:
            return [target, *args]
        node = executable("node", env)
        if not node:
            raise ValueError("此 Agent 需要 Node.js，请先安装 Node.js。")
        return [cli_path(node), target, *args]
    return [cli_path(path), *args]
