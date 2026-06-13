"""Shared LLM provider helpers — single source of truth for tier routing,
OpenAI Responses-API text extraction, the Claude-message adapter, the
transient-error predicate used by retry loops, and error sanitisation.

Kept dependency-light (stdlib + openai exception types only) so it is
importable in unit tests without the full app stack.
"""
from __future__ import annotations

import re as _re
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

import openai

# ── Standard-tier (OpenAI) configuration ──────────────────────────────────────
OPENAI_STANDARD_MODEL = "gpt-5-mini"
OPENAI_STANDARD_REASONING: dict[str, str] = {"effort": "high"}

# Claude model per tier (OpenAI-backed tiers never use these).
_CLAUDE_ADVANCED_MODEL = "claude-sonnet-4-6"
_CLAUDE_DEFAULT_MODEL = "claude-haiku-4-5-20251001"

# OpenAI SDK errors that are worth retrying (network / transient server-side).
# NOTE: an "incomplete" response (token budget) is NOT an exception and is
# handled explicitly by callers — it must NOT be retried.
_TRANSIENT_OPENAI_ERRORS: tuple[type[BaseException], ...] = (
    openai.APIConnectionError,
    openai.APITimeoutError,
    openai.RateLimitError,
    openai.InternalServerError,
)

# Patterns scrubbed from error strings before they are persisted / returned.
_SECRET_PATTERNS: list[_re.Pattern[str]] = [
    _re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),                       # OpenAI-style keys
    _re.compile(r"Bearer\s+[A-Za-z0-9._\-]+", _re.IGNORECASE),    # auth headers
    _re.compile(r"https?://\S+"),                                # URLs (may carry key= query)
    _re.compile(r"(?i)\b(api[_-]?key|key|token|secret)\b\s*[=:]\s*\S+"),  # key=.../token:...
]


@dataclass(frozen=True)
class TierConfig:
    """Resolved provider/model for one scan tier."""
    provider: str            # "openai" | "anthropic"
    model: str
    reasoning_effort: str | None   # OpenAI reasoning effort; None for Claude


# Scan Mode tier → provider/model. basic/advanced are Claude; standard/pro/max are OpenAI.
SCAN_TIERS: dict[str, TierConfig] = {
    "basic": TierConfig("anthropic", _CLAUDE_DEFAULT_MODEL, None),
    "standard": TierConfig("openai", OPENAI_STANDARD_MODEL, "high"),
    "advanced": TierConfig("anthropic", _CLAUDE_ADVANCED_MODEL, None),
    "pro": TierConfig("openai", "gpt-5.4", "medium"),
    "max": TierConfig("openai", "gpt-5.5", "high"),
}


def resolve_provider(scan_tier: str) -> TierConfig:
    """Single source of truth for Scan Mode tier → provider/model/effort.

    Unknown tiers fall back to basic (Haiku).
    """
    return SCAN_TIERS.get(scan_tier, SCAN_TIERS["basic"])


def resolve_pre_analysis_provider(scan_tier: str) -> str:
    """Claude model for the PRE-ANALYSIS endpoint (Claude-only — never OpenAI).

    advanced → Sonnet; basic / standard / anything else → Haiku. Pre-analysis
    intentionally diverges from resolve_provider (which sends standard → OpenAI
    for lead generation): decision 2026-06-08 — Haiku-only for pre-analysis on
    basic + standard, chosen for ~2x faster turnaround vs gpt-5-mini.
    """
    return _CLAUDE_ADVANCED_MODEL if scan_tier == "advanced" else _CLAUDE_DEFAULT_MODEL


def extract_openai_text(response: Any) -> str:
    """Pull text out of an OpenAI Responses API result, tolerating reasoning
    items that carry no text/content."""
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for block in getattr(item, "content", []) or []:
            text = getattr(block, "text", None)
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks).strip()


def as_text_message(response: Any) -> SimpleNamespace:
    """Adapt an OpenAI Responses result to the minimal Anthropic-message shape
    the pre-analysis pipeline consumes (``.content[0].text`` + ``.stop_reason``).

    NOTE: ``stop_reason`` carries the OpenAI ``status`` ("completed"/"incomplete"),
    NOT Anthropic's "end_turn"/"max_tokens". Callers must not compare it to
    Anthropic stop-reason literals.
    """
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=extract_openai_text(response))],
        stop_reason=getattr(response, "status", None),
        usage=getattr(response, "usage", None),
    )


def summarize_usage(usage: Any) -> str:
    """Compact token-count line for one LLM call (in / out / total)."""
    if usage is None:
        return "tokens=unavailable"
    in_tok = int(getattr(usage, "input_tokens", 0) or 0)
    out_tok = int(getattr(usage, "output_tokens", 0) or 0)
    total = int(getattr(usage, "total_tokens", 0) or 0) or (in_tok + out_tok)
    return f"in={in_tok} out={out_tok} total={total}"


def is_transient_openai_error(error: BaseException) -> bool:
    """True for network / transient server errors that are safe to retry."""
    return isinstance(error, _TRANSIENT_OPENAI_ERRORS)


def safe_error_message(error: BaseException, max_len: int = 200) -> str:
    """Return '<ClassName>: <scrubbed message>' safe to persist/return to clients.
    Strips API keys, bearer tokens, and URLs that may carry secrets."""
    text = str(error)
    for pat in _SECRET_PATTERNS:
        text = pat.sub("[redacted]", text)
    text = text.strip()[:max_len]
    return f"{type(error).__name__}: {text}" if text else type(error).__name__
