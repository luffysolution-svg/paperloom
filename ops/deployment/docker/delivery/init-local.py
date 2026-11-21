#!/usr/bin/env python3
"""Create local Compose credentials without replacing an existing configuration."""
from __future__ import annotations

import os
from pathlib import Path
import re
import secrets


def initialize(directory: Path) -> None:
    path = directory / ".env"
    descriptor = os.open(path, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(descriptor, "a+", encoding="utf-8", newline="") as handle:
        handle.seek(0)
        existing = handle.read()
        if re.search(r"^\s*(?:export\s+)?PAPERLOOM_API_KEY\s*=", existing, re.MULTILINE):
            print("Existing PAPERLOOM_API_KEY preserved.")
            return
        if os.name != "nt":
            os.fchmod(handle.fileno(), 0o600)
        if existing and not existing.endswith("\n"):
            handle.write("\n")
        handle.write(f"PAPERLOOM_API_KEY={secrets.token_hex(32)}\n")
    print("Added a random backend key to .env. The key stays server-side.")


if __name__ == "__main__":
    initialize(Path(__file__).resolve().parent)
