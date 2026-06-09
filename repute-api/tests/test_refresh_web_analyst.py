"""Tests for the stateless JWT refresh-token helpers.

These cover the new security-critical logic in ``app.utils.auth``:
creating a refresh token and validating it (subject, expiry, and the
``type`` claim that stops an access token being replayed as a refresh token).

Endpoint-level behaviour (``/auth/login-web-analyst`` returning both tokens,
``/auth/refresh-web-analyst`` re-checking ``is_blocked``) is exercised by the
manual end-to-end steps in the plan, since the repo has no app+DB test harness.

Requires the project dependencies (python-jose) — run inside the project
environment (docker / ``uv``), not the bare system interpreter.
"""

import sys
import unittest
from datetime import timedelta
from pathlib import Path

# Make the `app` package importable when run from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from jose import jwt

from app.config import get_settings
from app.utils.auth import create_refresh_token, decode_refresh_token, create_access_token

settings = get_settings()


class RefreshTokenHelperTests(unittest.TestCase):
    def test_roundtrip_returns_subject(self) -> None:
        token = create_refresh_token("analyst-123")
        self.assertEqual(decode_refresh_token(token), "analyst-123")

    def test_payload_carries_refresh_type(self) -> None:
        token = create_refresh_token("analyst-123")
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        self.assertEqual(payload["type"], "refresh")
        self.assertEqual(payload["sub"], "analyst-123")

    def test_access_token_is_rejected(self) -> None:
        # An access token lacks type:"refresh" and must not be accepted here.
        access = create_access_token("analyst-123")
        with self.assertRaises(HTTPException) as ctx:
            decode_refresh_token(access)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_expired_token_is_rejected(self) -> None:
        expired = create_refresh_token("analyst-123", expires_delta=timedelta(seconds=-1))
        with self.assertRaises(HTTPException) as ctx:
            decode_refresh_token(expired)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_garbage_token_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            decode_refresh_token("not-a-jwt")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_wrong_secret_is_rejected(self) -> None:
        forged = jwt.encode(
            {"sub": "analyst-123", "type": "refresh"},
            "the-wrong-secret",
            algorithm=settings.jwt_algorithm,
        )
        with self.assertRaises(HTTPException) as ctx:
            decode_refresh_token(forged)
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
