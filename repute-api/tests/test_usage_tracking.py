"""Unit tests for token-usage extraction and cost computation (no DB)."""
import unittest
from types import SimpleNamespace

from app.utils.llm import UsageTokens, extract_usage
from app.utils.usage_tracking import compute_cost


class ExtractUsageTests(unittest.TestCase):
    def test_openai_responses_with_reasoning(self):
        usage = SimpleNamespace(
            input_tokens=1000,
            output_tokens=500,
            total_tokens=1500,
            output_tokens_details=SimpleNamespace(reasoning_tokens=300),
        )
        u = extract_usage(usage)
        self.assertEqual((u.input, u.output, u.reasoning, u.total), (1000, 500, 300, 1500))

    def test_anthropic_without_total_or_details(self):
        usage = SimpleNamespace(input_tokens=2000, output_tokens=800)
        u = extract_usage(usage)
        self.assertEqual(u.input, 2000)
        self.assertEqual(u.output, 800)
        self.assertEqual(u.reasoning, 0)
        self.assertEqual(u.total, 2800)  # derived when total_tokens absent

    def test_none_usage_is_zeroed(self):
        u = extract_usage(None)
        self.assertEqual((u.input, u.output, u.reasoning, u.total), (0, 0, 0, 0))

    def test_chat_completions_details_fallback(self):
        usage = SimpleNamespace(
            input_tokens=10,
            output_tokens=20,
            completion_tokens_details=SimpleNamespace(reasoning_tokens=7),
        )
        u = extract_usage(usage)
        self.assertEqual(u.reasoning, 7)
        self.assertEqual(u.total, 30)


class ComputeCostTests(unittest.TestCase):
    def test_one_million_each(self):
        u = UsageTokens(input=1_000_000, output=1_000_000, reasoning=0, total=2_000_000)
        self.assertAlmostEqual(compute_cost(u, 1.0, 5.0), 6.0)

    def test_partial_million(self):
        u = UsageTokens(input=27_000, output=4_000, reasoning=0, total=31_000)
        expected = 27_000 / 1_000_000 * 0.125 + 4_000 / 1_000_000 * 1.0
        self.assertAlmostEqual(compute_cost(u, 0.125, 1.0), expected)

    def test_reasoning_not_double_counted(self):
        # reasoning lives inside output; cost depends only on the output total
        u = UsageTokens(input=0, output=1_000_000, reasoning=600_000, total=1_000_000)
        self.assertAlmostEqual(compute_cost(u, 0.0, 30.0), 30.0)


if __name__ == "__main__":
    unittest.main()
