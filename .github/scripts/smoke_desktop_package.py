"""Exercise an installed desktop package using an isolated user profile."""
from __future__ import annotations

import argparse
import io
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time
import urllib.request
import zipfile


def pdf(text: str) -> bytes:
    stream = f"BT /F1 12 Tf 40 100 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream",
    ]
    result = b"%PDF-1.4\n"
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{number} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(result)
    result += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
    result += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:])
    return result + f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


def eventually(check, description: str, timeout: int = 180):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            value = check()
            if value:
                return value
        except (OSError, ValueError):
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Timed out waiting for {description}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    root.mkdir(parents=True, exist_ok=False)
    profile = root / "profile"
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    process = None
    log = None

    def stop():
        nonlocal process, log
        if process is not None:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            else:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                if os.name == "nt":
                    raise
                # The macOS tray can keep Electron alive after SIGTERM.
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=15)
            process = None
        if log is not None:
            log.close()
            log = None

    def start(round_: int):
        nonlocal process, log
        log_path = root / f"startup-{round_}.log"
        log = log_path.open("wb")
        env = dict(os.environ, ELECTRON_ENABLE_LOGGING="1")
        env.pop("ELECTRON_RUN_AS_NODE", None)
        process = subprocess.Popen(
            [str(args.app.resolve()), f"--user-data-dir={profile}", "--no-sandbox", "--disable-gpu"],
            stdout=log, stderr=subprocess.STDOUT, env=env,
            start_new_session=os.name != "nt",
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )

        def gateway():
            if process.poll() is not None:
                raise RuntimeError(f"Packaged app exited with {process.returncode}; see {log_path}")
            source = log_path.read_text(encoding="utf-8", errors="replace")
            match = re.search(r"local gateway listening on (http://127\.0\.0\.1:\d+)", source)
            return match[1] if match else None

        base = eventually(gateway, "packaged desktop gateway")
        html = opener.open(base + "/", timeout=20).read().decode()
        key = re.search(r'"xApiKey":"([^"]+)"', html)[1]
        return base, key

    def request(method: str, path: str, payload=None, headers=None):
        body = json.dumps(payload).encode() if isinstance(payload, dict) else payload
        request_headers = {"X-API-Key": key}
        if isinstance(payload, dict):
            request_headers["Content-Type"] = "application/json"
        request_headers.update(headers or {})
        return opener.open(urllib.request.Request(base + path, data=body, method=method,
                                                 headers=request_headers), timeout=120)

    def data(method: str, path: str, payload=None, headers=None):
        with request(method, path, payload, headers) as response:
            return json.load(response)["data"]

    config = {
        "browser_config": {"ocrProvider": "mineru", "mineruToken": "package-smoke-mineru",
                           "paddleToken": "package-smoke-paddle", "modelApiKey": "package-smoke-translation"},
        "developer_config": {"model": "package-smoke-model", "baseUrl": "https://example.com/v1",
                             "translationProfiles": {"custom": {"apiKey": "package-smoke-profile"}}},
    }
    try:
        base, key = start(1)
        assert isinstance(data("GET", "/api/v1/documents?limit=1"), dict)
        eventually(lambda: data("GET", "/api/v1/ai/runtime-config"), "bundled AI service")
        documents = []
        for number in (1, 2):
            source = pdf(f"PaperLoom package smoke {number}")
            boundary = "paperloom-package-smoke"
            body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
                    f"filename=\"same-title.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").encode()
            body += source + f"\r\n--{boundary}--\r\n".encode()
            uploaded = data("POST", "/api/v1/uploads", body,
                            {"Content-Type": f"multipart/form-data; boundary={boundary}"})
            documents.append((uploaded["document_id"], source))
        exported = data("POST", "/api/v1/documents/export-batch", {
            "document_ids": [item[0] for item in documents], "format": "source",
        })
        assert exported["exported"] == 2 and exported["failed"] == 0, exported
        with request("GET", "/api/v1/documents/export-batch/" + exported["name"]) as response:
            with zipfile.ZipFile(io.BytesIO(response.read())) as archive:
                sources = [archive.read(name) for name in archive.namelist() if name.endswith(".pdf")]
                assert len(sources) == 2 and set(sources) == {item[1] for item in documents}
                assert "export-result.json" in archive.namelist()
        backup = data("POST", "/api/v1/backups", {"include_credentials": True, "frontend_config": config})
        with request("GET", "/api/v1/backups/download/" + backup["name"]) as response:
            zipped = response.read()
        with zipfile.ZipFile(io.BytesIO(zipped)) as archive:
            assert json.loads(archive.read("data/secrets/frontend-config.json")) == config
        assert data("GET", "/api/v1/backups")["operation"]["state"] == "completed"
        restored = data("POST", "/api/v1/backups/import", zipped,
                        {"Content-Type": "application/zip", "X-Confirm-Replace": "true"})
        assert restored["restart_required"]
        stop()
        base, key = start(2)
        status = data("GET", "/api/v1/backups")
        assert not status["pending_restore"] and status["last_restore"]["frontend_config_restored"]
        with request("GET", "/api/v1/backups/restored-config") as response:
            assert response.headers["Cache-Control"] == "no-store"
            assert json.load(response)["data"]["config"] == config

        def renderer_restored():
            stored = json.loads((profile / "desktop-config.json").read_text(encoding="utf-8"))
            return (all(stored.get(k) == v for k, v in config["browser_config"].items())
                    and stored.get("developerConfig", {}).get("translationProfiles", {}).get("custom", {}).get("apiKey")
                    == config["developer_config"]["translationProfiles"]["custom"]["apiKey"])

        eventually(renderer_restored, "renderer to persist restored OCR and translation keys")
        for document_id, source in documents:
            with request("GET", f"/api/v1/documents/{document_id}/source.pdf") as response:
                assert response.read() == source
        logs = (profile / "logs/desktop-main.log").read_text(encoding="utf-8")
        assert f"app ready version={args.version} packaged=true" in logs
        result = {"version": args.version, "platform": os.sys.platform, "packaged_startup": True,
                  "ai_runtime": True, "batch_source_export": True, "backup_import_restart": True,
                  "renderer_restored_ocr_translation_keys": True, "source_pdfs_preserved": True}
        (root / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result), flush=True)
    finally:
        stop()


if __name__ == "__main__":
    main()
