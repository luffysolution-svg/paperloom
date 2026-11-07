"""Standalone MCP stdio / CLI transport; the host binds tools to the active turn."""
import argparse
import json
import os
import sys
import urllib.request


def forward(url, message):
    request = urllib.request.Request(url, json.dumps(message).encode("utf-8"),
        {"Content-Type": "application/json", "Authorization": "Bearer " + os.environ["RETAINPDF_TOOL_TOKEN"]})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def main():
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--stdio", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--url", required=True)
    parser.add_argument("--name", default="")
    parser.add_argument("--arguments", default="{}")
    args = parser.parse_args()
    if not args.stdio:
        message = {"jsonrpc": "2.0", "id": 1, "method": "tools/list" if args.list else "tools/call",
                   "params": {"name": args.name, "arguments": json.loads(args.arguments)}}
        print(json.dumps(forward(args.url, message), ensure_ascii=False))
        return
    for line in sys.stdin:
        message = {}
        try:
            message = json.loads(line)
            if "id" not in message:
                continue
            response = forward(args.url, message)
        except Exception:
            response = {"jsonrpc": "2.0", "id": message.get("id") if isinstance(message, dict) else None,
                        "error": {"code": -32603, "message": "PaperLoom tool bridge unavailable"}}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
