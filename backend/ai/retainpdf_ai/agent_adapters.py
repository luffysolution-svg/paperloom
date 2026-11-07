"""Prepare the ACP connector for a CLI the user already installed."""
from __future__ import annotations

import os
import logging
import subprocess
from pathlib import Path

from .agent_presets import PRESETS, cached_agent_command, cli_path, executable, launch_argv

ADAPTER_PACKAGES = {
    "codex-acp": "@agentclientprotocol/codex-acp@2.5.0",
    "claude-acp": "@agentclientprotocol/claude-agent-acp@0.101.0",
    "pi": "pi-acp@0.0.34",
    "zcode": "zcode-acp-server",
}


def effective_connection(connection, data_root):
    preset = next((p for p in PRESETS if p["id"] == connection.preset), None)
    if preset and connection.command == preset["command"]:
        if not executable(connection.command, {**os.environ, **connection.env}):
            cached = cached_agent_command(data_root, preset)
            if cached:
                return connection.model_copy(update={"command": cached})
    return connection


def prepare_adapter(connection, data_root):
    preset = next((p for p in PRESETS if p["id"] == connection.preset), None)
    if not preset or connection.command != preset["command"] or executable(connection.command, {**os.environ, **connection.env}):
        return
    if cached_agent_command(data_root, preset):
        return
    package = ADAPTER_PACKAGES.get(connection.preset)
    if not package:
        raise ValueError(f"未检测到 {preset['name']}。请先安装并登录，再重新连接。")
    if connection.preset != "zcode" and not executable(preset["host"], {**os.environ, **connection.env}):
        raise ValueError(f"未检测到 {preset['name']}。请先安装并登录，再重新连接。")
    if not executable("npm") or not executable("node"):
        raise ValueError("准备连接组件需要 Node.js。请先安装 Node.js，再点击连接。")
    directory = Path(data_root) / "cache" / "acp-adapters" / connection.preset
    directory.mkdir(parents=True, exist_ok=True)
    args = ["install", "--prefix", cli_path(directory), "--no-audit", "--no-fund", "--omit=dev", package]
    if connection.preset == "zcode" and os.name == "nt":
        args.append("--ignore-scripts")
    try:
        result = subprocess.run(launch_argv("npm", args, dict(os.environ)), stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=150,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("连接组件准备失败，请检查 Node.js 和网络后重试。") from exc
    if result.returncode or not cached_agent_command(data_root, preset):
        logging.getLogger(__name__).warning("ACP connector preparation failed: preset=%s exit_code=%s", connection.preset, result.returncode)
        raise ValueError("连接组件未准备成功，请检查 Node.js 和网络后重试。")
