"""Tests for the unified prompts + OpenAI fail-loud/retry behaviour in
generate_lead.py.

generate_lead.py cannot be imported in this environment (sqlalchemy, anthropic,
pydantic_settings are not installed), so we exec one contiguous source slice —
from `_parse_classification_items` through `_generate_meeting_summary_with_openai`
— in a namespace where the few external names are stubbed. Real helpers that ARE
importable (extract_openai_text, is_transient_openai_error) come from app.utils.llm.
"""
import asyncio
import json
import re
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import openai

from app.utils.llm import extract_openai_text, is_transient_openai_error

MODULE = Path(__file__).resolve().parent.parent / "app" / "routers" / "generate_lead.py"


class _FakeAsyncio:
    """Drop-in for `asyncio` inside the slice so retry backoff doesn't really sleep."""

    @staticmethod
    async def sleep(*_a, **_k):
        return None


def load_slice():
    src = MODULE.read_text(encoding="utf-8")
    start = src.index("def _parse_classification_items(")
    end = src.index("class GenerateLeadRequest(")
    snippet = src[start:end]
    ns = {
        "json": json,
        "re": re,
        "asyncio": _FakeAsyncio,
        "SimpleNamespace": SimpleNamespace,
        "anthropic": SimpleNamespace(AsyncAnthropic=object),
        "AsyncOpenAI": object,
        "OPENAI_STANDARD_MODEL": "gpt-5-mini",
        "OPENAI_STANDARD_REASONING": {"effort": "high"},
        "extract_openai_text": extract_openai_text,
        "is_transient_openai_error": is_transient_openai_error,
        "_fallback_summary": lambda score: {"headline": "FALLBACK", "score": score},
    }
    exec(snippet, ns)
    return ns


NS = load_slice()
ARTS = [{"url": "u", "title": "t", "snippet": "s", "content": "c"}]


# ── Task 5: unified classification prompt (B2, snippet gap, items format) ──────
class ClassificationPromptTests(unittest.TestCase):
    def _prompt(self, scan_focus):
        return NS["_build_classification_prompt"](
            ARTS, "Jane Doe", ["US"], ["fraud"], "individual", "English", scan_focus
        )

    def test_negative_focus_has_exclusion_clause(self):
        self.assertIn(
            "Exclude all positive and neutral articles from the output entirely",
            self._prompt("negative"),
        )

    def test_snippet_quality_instruction_present(self):
        p = self._prompt("negative")
        self.assertIn("3 sentence explanation", p)
        self.assertIn("not copied from the source", p)

    def test_requests_items_object(self):
        self.assertIn('"items"', self._prompt(None))


class ParseItemsTests(unittest.TestCase):
    def setUp(self):
        self.p = NS["_parse_classification_items"]

    def test_items_object(self):
        self.assertEqual(self.p('{"items": [{"url": "a"}]}'), [{"url": "a"}])

    def test_bare_array_fallback(self):
        self.assertEqual(self.p('[{"url": "b"}]'), [{"url": "b"}])

    def test_unparseable_returns_none(self):
        self.assertIsNone(self.p("not json at all"))

    def test_empty_items_is_empty_list_not_none(self):
        self.assertEqual(self.p('{"items": []}'), [])


# ── Task 6: unified meeting-summary prompt (schema/counts, full system) ────────
class MeetingSummaryPromptTests(unittest.TestCase):
    def setUp(self):
        self.b = NS["_build_meeting_summary_prompt"]
        self.links = [{"sentiment": "negative", "risk": "high", "title": "X", "source": "s.com"}]

    def test_returns_system_and_user(self):
        system, user = self.b("Jane", 42, self.links, "English")
        self.assertIsInstance(system, str)
        self.assertIsInstance(user, str)

    def test_has_array_size_counts(self):
        _, user = self.b("Jane", 42, self.links, "English")
        self.assertIn("5-8", user)
        self.assertIn("4-6", user)
        self.assertIn("4-5", user)

    def test_system_prompt_is_full_version(self):
        system, _ = self.b("Jane", 42, self.links, "English")
        self.assertIn("retrieved from public search engines", system)


# ── Task 7: C2 classification fail-loud + transient-only retry ────────────────
class ClassifyFailModeTests(unittest.TestCase):
    def setUp(self):
        self.fn = NS["_classify_with_openai"]
        self.Err = NS["OpenAIIncompleteError"]

    def _run(self, client):
        return asyncio.run(
            self.fn(client, ARTS, "n", ["US"], [], "individual", "English", None)
        )

    def test_incomplete_raises_no_retry(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            return_value=SimpleNamespace(
                status="incomplete",
                incomplete_details=SimpleNamespace(reason="max_output_tokens"),
                output_text="",
            ))))
        with self.assertRaises(self.Err):
            self._run(client)
        self.assertEqual(client.responses.create.call_count, 1)

    def test_transient_error_retried_then_succeeds(self):
        good = SimpleNamespace(status="completed", output_text='{"items": [{"url": "u"}]}')
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            side_effect=[openai.APITimeoutError(request=SimpleNamespace()), good])))
        self.assertEqual(self._run(client), [{"url": "u"}])
        self.assertEqual(client.responses.create.call_count, 2)

    def test_completed_valid_empty_returns_empty(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            return_value=SimpleNamespace(status="completed", output_text='{"items": []}'))))
        self.assertEqual(self._run(client), [])

    def test_completed_unparseable_raises(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            return_value=SimpleNamespace(status="completed", output_text="not json"))))
        with self.assertRaises(self.Err):
            self._run(client)

    def test_non_transient_error_propagates_no_retry(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            side_effect=ValueError("boom"))))
        with self.assertRaises(ValueError):
            self._run(client)
        self.assertEqual(client.responses.create.call_count, 1)

    def test_all_transient_exhausted_raises_incomplete(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            side_effect=openai.APITimeoutError(request=SimpleNamespace()))))
        with self.assertRaises(self.Err):  # OpenAIIncompleteError, not raw timeout
            self._run(client)
        self.assertEqual(client.responses.create.call_count, 3)


# ── Task 8: B1 OpenAI meeting-summary retry (Claude parity) ───────────────────
class MeetingRetryTests(unittest.TestCase):
    def setUp(self):
        self.fn = NS["_generate_meeting_summary_with_openai"]

    def test_transient_then_success(self):
        good = SimpleNamespace(status="completed", output_text='{"headline": "OK"}')
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            side_effect=[openai.APITimeoutError(request=SimpleNamespace()), good])))
        out = asyncio.run(self.fn(client, "n", 40, [], "English"))
        self.assertEqual(out["headline"], "OK")
        self.assertEqual(client.responses.create.call_count, 2)

    def test_incomplete_goes_straight_to_fallback_no_retry(self):
        client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(
            return_value=SimpleNamespace(status="incomplete", incomplete_details=None, output_text=""))))
        out = asyncio.run(self.fn(client, "n", 40, [], "English"))
        self.assertEqual(out["headline"], "FALLBACK")
        self.assertEqual(client.responses.create.call_count, 1)


if __name__ == "__main__":
    unittest.main()
