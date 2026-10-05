#!/usr/bin/env python3
"""Local-only synthetic query acceptance tools; never points at a production DB."""
import argparse
import concurrent.futures
import datetime as dt
import http.client
import http.server
import json
import math
import mimetypes
import pathlib
import sqlite3
import statistics
import time
import urllib.parse

REPO = pathlib.Path(__file__).resolve().parents[3]
KEY = "local-acceptance-only"


def request(path, port=42831):
    start = time.perf_counter()
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=90)
    try:
        conn.request("GET", path, headers={"X-API-Key": KEY})
        response = conn.getresponse()
        body = response.read()
        return response.status, json.loads(body), (time.perf_counter() - start) * 1000, len(body)
    finally:
        conn.close()


def data(path):
    status, body, elapsed, size = request(path)
    assert status == 200, (path.split("?")[0], status, body)
    return body["data"], elapsed, size


def summarize(samples):
    if not samples:
        raise ValueError("cannot summarize empty samples")
    values = sorted(sample[0] for sample in samples)
    return {"requests": len(values), "p50_ms": round(statistics.median(values), 2),
            "p95_ms": round(values[math.ceil(len(values) * .95) - 1], 2),
            "max_ms": round(max(values), 2), "mean_bytes": round(statistics.mean(x[1] for x in samples))}


def checked_runtime(root):
    root = pathlib.Path(root).resolve()
    assert root.name == "runtime" and root.parent.name.startswith("retain-api-acceptance."), "not an acceptance fixture"
    db = root / "data/db/jobs.db"
    assert db.is_file(), "fixture database missing"
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT COUNT(*) FROM jobs WHERE job_id='acceptance-ui'").fetchone()[0] == 1
    return root


def append(root, job_id, message):
    root = checked_runtime(root)
    assert job_id in {"acceptance-ui", "acceptance-1k", "acceptance-10k", "acceptance-100k", "acceptance-concurrent"}
    record = {"job_id": job_id, "ts": dt.datetime.now(dt.timezone.utc).isoformat(),
              "level": "info", "stage": "translating", "event_type": "stage_progress",
              "message": message, "stage_detail": message, "progress_current": 1250, "progress_total": 1300}
    with (root / f"data/jobs/{job_id}/logs/pipeline_events.jsonl").open("a") as file:
        file.write(json.dumps(record, ensure_ascii=False) + "\n")


def benchmark(root):
    root = checked_runtime(root)
    with sqlite3.connect(root / "data/db/jobs.db") as conn:
        warm = conn.execute(
            "SELECT COUNT(*) FROM event_feeds WHERE owner_job_id IN (?, ?, ?)",
            ("acceptance-1k", "acceptance-10k", "acceptance-100k"),
        ).fetchone()[0]
    assert warm == 0, "cold benchmark needs a fresh fixture; event projections already exist"
    report = {"profile": "release", "data": "synthetic half DB / half JSONL",
              "p95_method": "nearest rank", "event_queries": {}}
    for label, count in [("1k", 1000), ("10k", 10_000), ("100k", 100_000)]:
        job = f"acceptance-{label}"
        endpoint = f"/api/v1/jobs/{job}/events"
        health = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            pending = executor.submit(data, endpoint + "?start=tail&limit=500")
            while not pending.done():
                status, _body, elapsed, size = request("/health")
                assert status == 200, status
                health.append((elapsed, size))
                time.sleep(.05)
            page, cold, size = pending.result()
        assert len(page["items"]) == 500 and page["items"][-1]["seq"] == count
        cursor = page["next_cursor"]
        empty = []
        for _ in range(40):
            page, elapsed, size = data(endpoint + "?cursor=" + urllib.parse.quote(cursor))
            assert not page["items"] and not page["has_more"]
            cursor = page["next_cursor"]
            empty.append((elapsed, size))
        increments = []
        for n in range(10):
            message = f"benchmark-delta-{label}-{n}"
            append(root, job, message)
            page, elapsed, size = data(endpoint + "?cursor=" + urllib.parse.quote(cursor))
            assert len(page["items"]) == 1 and page["items"][0]["message"] == message
            cursor = page["next_cursor"]
            increments.append((elapsed, size))
        report["event_queries"][label] = {
            "cold_tail_ms": round(cold, 2), "empty_poll": summarize(empty),
            "single_delta": summarize(increments),
            "health_during_cold": summarize(health) if health else None,
        }
    report["lists"] = benchmark_lists()
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        results = list(executor.map(lambda n: request(f"/api/v1/jobs/acceptance-concurrent/events?start=tail&limit={n+1}"), range(32)))
    assert all(result[0] == 200 for result in results), [result[0] for result in results]
    report["concurrent_32_distinct_queries"] = summarize([(x[2], x[3]) for x in results])
    return report


def benchmark_lists():
    report = {}
    for name, path in [("jobs_100", "/api/v1/jobs?limit=100"), ("library_100", "/api/v1/library/books?limit=100"),
                       ("jobs_500", "/api/v1/jobs?limit=500"), ("library_500", "/api/v1/library/books?limit=500"),
                       ("library_search_beyond_10000", "/api/v1/library/books?q=acceptance-needle-beyond-10000&limit=100")]:
        samples = []
        for _ in range(15):
            page, elapsed, size = data(path)
            if "search" in name:
                assert len(page["items"]) == 1 and page["items"][0]["job_id"] == "acceptance-library-00000", page
            else:
                assert len(page["items"]) == int(name.rsplit("_", 1)[1])
            samples.append((elapsed, size))
        report[name] = summarize(samples)
    return report


def serve(root, port):
    root = pathlib.Path(root).resolve()
    web = REPO / "frontend/web"
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlsplit(self.path)
            if parsed.path.startswith("/api/") or parsed.path == "/health":
                conn = http.client.HTTPConnection("127.0.0.1", 42831, timeout=90)
                try:
                    conn.request("GET", self.path, headers={"X-API-Key": KEY})
                    response = conn.getresponse()
                    body = response.read()
                    self.send_response(response.status)
                    self.send_header("Content-Type", response.getheader("Content-Type", "application/json"))
                    self.send_header("Cache-Control", "no-store")
                    self.end_headers()
                    self.wfile.write(body)
                    if parsed.path.endswith("/events"):
                        payload = json.loads(body).get("data", {})
                        args = urllib.parse.parse_qs(parsed.query)
                        print(json.dumps({"path": parsed.path, "mode": "cursor" if "cursor" in args else args.get("start", ["tail"])[0],
                                          "status": response.status, "items": len(payload.get("items", [])), "has_more": payload.get("has_more")}), flush=True)
                finally:
                    conn.close()
                return
            if parsed.path in ("/runtime-config.js", "/runtime-config.local.js"):
                body = ("window.__FRONT_RUNTIME_CONFIG__=" + json.dumps({"apiBase": f"http://127.0.0.1:{port}", "xApiKey": KEY}) + ";").encode()
                content_type = "text/javascript"
            else:
                relative = parsed.path.lstrip("/") or "index.html"
                if ".." in pathlib.PurePosixPath(relative).parts or relative.startswith("."):
                    self.send_error(404)
                    return
                base = root / "web" if relative.startswith("dist/") and (root / "web" / relative).is_file() else web
                path = (base / relative).resolve()
                if not path.is_relative_to(base.resolve()) or not path.is_file():
                    self.send_error(404)
                    return
                body = path.read_bytes()
                content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_args):
            pass
    print(f"WEB READY http://127.0.0.1:{port}", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["web", "bench", "lists", "append", "invalidate"])
    parser.add_argument("root")
    parser.add_argument("--port", type=int, default=42832)
    parser.add_argument("--message", default="browser-incremental-event")
    args = parser.parse_args()
    if args.action == "web":
        serve(args.root, args.port)
    elif args.action == "bench":
        print(json.dumps(benchmark(args.root), indent=2))
    elif args.action == "lists":
        checked_runtime(args.root)
        print(json.dumps(benchmark_lists(), indent=2))
    elif args.action == "append":
        append(args.root, "acceptance-ui", args.message)
    else:
        root = checked_runtime(args.root)
        with sqlite3.connect(root / "data/db/jobs.db") as conn:
            conn.execute("UPDATE events SET message='browser-revised-event' WHERE job_id='acceptance-ui' AND seq=1199")
