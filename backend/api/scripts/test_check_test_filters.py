"""No Rust invocation: validate nonempty selection handling and README parity."""
from __future__ import annotations

import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock


spec = importlib.util.spec_from_file_location(
    "test_filter_checks", Path(__file__).with_name("check_test_filters.py")
)
assert spec and spec.loader
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


class TestFilterChecks(unittest.TestCase):
    def test_successful_cargo_exit_with_zero_tests_is_rejected(self):
        runner = Mock(return_value=SimpleNamespace(returncode=0, stdout="0 tests, 0 benchmarks\n", stderr=""))
        with self.assertRaisesRegex(RuntimeError, "matched no expected test"):
            checks.verify_selection("rust_api", "missing::test", runner)

    def test_listing_other_tests_does_not_validate_a_stale_filter(self):
        runner = Mock(return_value=SimpleNamespace(returncode=0, stdout="different::test: test\n", stderr=""))
        with self.assertRaisesRegex(RuntimeError, "matched no expected test"):
            checks.verify_selection("rust_api", "missing::test", runner)

    def test_failed_cargo_listing_is_rejected(self):
        runner = Mock(return_value=SimpleNamespace(returncode=101, stdout="", stderr="compile error"))
        with self.assertRaisesRegex(RuntimeError, "cargo --list failed"):
            checks.verify_selection("rust_api", "expected::test", runner)

    def test_valid_selection_lists_but_never_executes_tests(self):
        runner = Mock(return_value=SimpleNamespace(returncode=0, stdout="expected::test: test\n\n1 test, 0 benchmarks\n", stderr=""))
        self.assertEqual(["expected::test"], checks.verify_selection("rust_api", "expected::test", runner))
        command = runner.call_args.args[0]
        self.assertEqual(command, ["cargo", "test", "--locked", "-p", "rust_api", "--lib", "expected::test", "--", "--exact", "--list"])

    def test_readme_commands_match_the_verified_selections(self):
        readme = Path(__file__).resolve().parents[1] / "README.md"
        text = readme.read_text(encoding="utf-8")
        for package, name in checks.SELECTED_TESTS:
            with self.subTest(package=package):
                self.assertIn(" ".join(checks.test_command(package, name, list_only=False)), text)


if __name__ == "__main__":
    unittest.main()
