# Agent host configuration

PaperLoom exposes one local stdio entry point. Configure each host to run `paperloom agent mcp`; do not duplicate tool logic in host-specific scripts.

## Claude Code

Copy the root `.mcp.json` into the project or register the same server in Claude Code settings. Load the three canonical skills from `skills/`.

## Codex

Use the root `mcp.json` as the project MCP configuration. The command must resolve to the same PaperLoom binary used by the local CLI.

## Pi, OpenCode, ZCode, DeepSeek Harness and WorkBuddy

Add a stdio server named `paperloom` with command `paperloom` and arguments `agent mcp`. If the host only accepts an absolute executable, use the output of `where paperloom` on Windows or `which paperloom` on Unix.

The host should mount `skills/paperloom-pdf-ops`, `skills/paperloom-paper-reader`, and `skills/paperloom-paper-search` as read-only instructions. The host does not receive API keys from this repository.

## Smoke check

```text
paperloom agent doctor --json
paperloom agent capabilities --json
```

The MCP handshake must expose the same capabilities and tool names as the CLI. A missing backend may make write capabilities unavailable, but it must not make the process print a secret or hang during initialization.
