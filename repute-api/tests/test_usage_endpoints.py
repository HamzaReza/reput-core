"""Unit tests for the pure helpers in the usage router (no DB / no app client)."""
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import HTTPException

from app.routers.usage import _clamp_limit, _parse_range, _require_admin


class RequireAdminTests(unittest.TestCase):
    def test_admin_passes(self):
        _require_admin(SimpleNamespace(role="admin"))  # must not raise

    def test_analyst_forbidden(self):
        with self.assertRaises(HTTPException) as ctx:
            _require_admin(SimpleNamespace(role="analyst"))
        self.assertEqual(ctx.exception.status_code, 403)


class ParseRangeTests(unittest.TestCase):
    def test_defaults_to_last_30_days(self):
        start, end = _parse_range(None, None)
        self.assertAlmostEqual((end - start).total_seconds(), 30 * 86400, delta=5)

    def test_parses_iso_instants(self):
        start, end = _parse_range("2026-06-01T00:00:00+00:00", "2026-06-10T00:00:00+00:00")
        self.assertEqual(start, datetime(2026, 6, 1, tzinfo=timezone.utc))
        self.assertEqual(end, datetime(2026, 6, 10, tzinfo=timezone.utc))

    def test_to_only_defaults_start_30_days_before(self):
        start, end = _parse_range(None, "2026-06-30T00:00:00+00:00")
        self.assertEqual(end, datetime(2026, 6, 30, tzinfo=timezone.utc))
        self.assertEqual(start, end - timedelta(days=30))


class ClampLimitTests(unittest.TestCase):
    def test_within_range_unchanged(self):
        self.assertEqual(_clamp_limit(200), 200)

    def test_below_floor_clamped(self):
        self.assertEqual(_clamp_limit(0), 1)
        self.assertEqual(_clamp_limit(-5), 1)

    def test_above_ceiling_clamped(self):
        self.assertEqual(_clamp_limit(99999), 1000)


if __name__ == "__main__":
    unittest.main()
