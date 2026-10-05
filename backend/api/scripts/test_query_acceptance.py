"""Guardrails for the local-only query acceptance harness."""
import json
import pathlib
import sqlite3
import tempfile
import unittest

from query_acceptance import append, benchmark, checked_runtime, summarize


class SummaryTests(unittest.TestCase):
    def test_nearest_rank_p95(self):
        summary = summarize([(n, 100) for n in range(1, 41)])
        self.assertEqual(summary, {
            "requests": 40, "p50_ms": 20.5, "p95_ms": 38,
            "max_ms": 40, "mean_bytes": 100,
        })

    def test_single_sample_and_empty_samples(self):
        self.assertEqual(summarize([(3.25, 42)])["p95_ms"], 3.25)
        with self.assertRaises(ValueError):
            summarize([])


class FixtureSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="retain-api-acceptance.")
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name) / "runtime"
        (self.root / "data/db").mkdir(parents=True)

    def seed(self, job_id="acceptance-ui"):
        with sqlite3.connect(self.root / "data/db/jobs.db") as conn:
            conn.execute("CREATE TABLE jobs(job_id TEXT PRIMARY KEY)")
            conn.execute("INSERT INTO jobs VALUES (?)", (job_id,))

    def test_rejects_wrong_directory_or_missing_database(self):
        with self.assertRaises(AssertionError):
            checked_runtime(self.root.parent)
        with self.assertRaises(AssertionError):
            checked_runtime(self.root)

    def test_rejects_database_without_fixture_job(self):
        self.seed("not-an-acceptance-job")
        with self.assertRaises(AssertionError):
            checked_runtime(self.root)

    def test_append_is_scoped_to_known_fixture_jobs(self):
        self.seed()
        log_dir = self.root / "data/jobs/acceptance-ui/logs"
        log_dir.mkdir(parents=True)
        append(self.root, "acceptance-ui", "test progress")
        records = (log_dir / "pipeline_events.jsonl").read_text().splitlines()
        self.assertEqual(len(records), 1)
        self.assertEqual(json.loads(records[0])["message"], "test progress")
        with self.assertRaises(AssertionError):
            append(self.root, "../not-an-acceptance-job", "must not write")
        self.assertEqual(len((log_dir / "pipeline_events.jsonl").read_text().splitlines()), 1)

    def test_benchmark_rejects_already_warm_projections(self):
        self.seed()
        with sqlite3.connect(self.root / "data/db/jobs.db") as conn:
            conn.execute("CREATE TABLE event_feeds(owner_job_id TEXT PRIMARY KEY)")
            conn.execute("INSERT INTO event_feeds VALUES ('acceptance-100k')")
        with self.assertRaisesRegex(AssertionError, "fresh fixture"):
            benchmark(self.root)


if __name__ == "__main__":
    unittest.main()
