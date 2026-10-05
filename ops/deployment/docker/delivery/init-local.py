#!/usr/bin/env python3
"""Create local Compose credentials without replacing an existing configuration."""
from __future__ import annotations

import os
from pathlib import Path
import secrets


def initialize(directory: Path) -> None:
    path = directory / ".env"
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        print("Existing .env preserved. Ensure PAPERLOOM_API_KEY is configured.")
        return
    with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("# Local backend credential; do not commit or share this file.\n")
        handle.write(f"PAPERLOOM_API_KEY={secrets.token_hex(32)}\n")
    print("Created .env with a random backend key. The key stays server-side.")


if __name__ == "__main__":
    initialize(Path(__file__).resolve().parent)
