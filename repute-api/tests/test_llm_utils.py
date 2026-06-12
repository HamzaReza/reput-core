import unittest
from types import SimpleNamespace

import openai

from app.utils.llm import (
    OPENAI_STANDARD_MODEL,
    OPENAI_STANDARD_REASONING,
    extract_openai_text,
    as_text_message,
    resolve_provider,
    is_transient_openai_error,
    safe_error_message,
)


class ResolveProviderTests(unittest.TestCase):
    def test_standard_uses_openai(self):
        use_openai, model = resolve_provider("standard")
        self.assertTrue(use_openai)
        self.assertEqual(model, "claude-haiku-4-5-20251001")

    def test_advanced_uses_sonnet(self):
        use_openai, model = resolve_provider("advanced")
        self.assertFalse(use_openai)
        self.assertEqual(model, "claude-sonnet-4-6")

    def test_basic_uses_haiku(self):
        use_openai, model = resolve_provider("basic")
        self.assertFalse(use_openai)
        self.assertEqual(model, "claude-haiku-4-5-20251001")


class ExtractOpenAITextTests(unittest.TestCase):
    def test_prefers_output_text(self):
        resp = SimpleNamespace(output_text="hello", output=[])
        self.assertEqual(extract_openai_text(resp), "hello")

    def test_falls_back_to_output_blocks(self):
        block = SimpleNamespace(text="world")
        item = SimpleNamespace(content=[block])
        resp = SimpleNamespace(output_text="", output=[item])
        self.assertEqual(extract_openai_text(resp), "world")

    def test_empty_when_nothing(self):
        resp = SimpleNamespace(output_text=None, output=[])
        self.assertEqual(extract_openai_text(resp), "")


class AsTextMessageTests(unittest.TestCase):
    def test_maps_status_to_stop_reason(self):
        resp = SimpleNamespace(output_text="x", output=[], status="completed")
        msg = as_text_message(resp)
        self.assertEqual(msg.content[0].text, "x")
        self.assertEqual(msg.stop_reason, "completed")


class TransientErrorTests(unittest.TestCase):
    def test_connection_error_is_transient(self):
        err = openai.APIConnectionError(request=SimpleNamespace())
        self.assertTrue(is_transient_openai_error(err))

    def test_value_error_not_transient(self):
        self.assertFalse(is_transient_openai_error(ValueError("nope")))


class SafeErrorMessageTests(unittest.TestCase):
    def test_redacts_openai_key(self):
        msg = safe_error_message(ValueError("auth failed key=sk-ABC123DEFGHIJKLMNOP token leaked"))
        self.assertNotIn("sk-ABC123DEFGHIJKLMNOP", msg)
        self.assertIn("ValueError", msg)

    def test_redacts_bearer_and_urls(self):
        msg = safe_error_message(
            RuntimeError("GET https://api.openai.com/v1/x?api-key=secret Authorization: Bearer abc.def")
        )
        self.assertNotIn("secret", msg)
        self.assertNotIn("Bearer abc.def", msg)

    def test_redacts_bare_key_assignment(self):
        # bare `key=<value>` with no sk- prefix — must be caught by the keyword
        # pattern, not rely on the sk- pattern.
        msg = safe_error_message(RuntimeError("connect failed key=plaintextSecret123 done"))
        self.assertNotIn("plaintextSecret123", msg)

    def test_does_not_over_redact_midword_key(self):
        # "monkey=5" must not trip the \bkey\b boundary
        self.assertIn("monkey", safe_error_message(ValueError("monkey=5 bananas")))

    def test_keeps_class_name(self):
        self.assertTrue(safe_error_message(KeyError("x")).startswith("KeyError"))


if __name__ == "__main__":
    unittest.main()
