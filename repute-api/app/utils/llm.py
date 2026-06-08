"""Shared LLM provider helpers — single source of truth for tier routing,
OpenAI Responses-API text extraction, the Claude-message adapter, the
transient-error predicate used by retry loops, and error sanitisation.

Kept dependency-light (stdlib + openai exception types only) so it is
importable in unit tests without the full app stack.
"""
from __future__ import annotations

import re as _re
from types import SimpleNamespace
from typing import TYPE_CHECKING, Any

import openai

if TYPE_CHECKING:  # pragma: no cover - typing only
    from openai import AsyncOpenAI
    import anthropic

# ── Standard-tier (OpenAI) configuration ──────────────────────────────────────
OPENAI_STANDARD_MODEL = "gpt-5-mini"
OPENAI_STANDARD_REASONING: dict[str, str] = {"effort": "high"}

# Claude model per tier (standard never uses these — OpenAI handles it).
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


def resolve_provider(scan_tier: str) -> tuple[bool, str]:
    """Single source of truth for tier → (use_openai, claude_model).

    standard → OpenAI (gpt-5-mini); advanced → claude-sonnet-4-6;
    basic / anything else → claude-haiku-4-5-20251001.
    """
    use_openai = scan_tier == "standard"
    model = _CLAUDE_ADVANCED_MODEL if scan_tier == "advanced" else _CLAUDE_DEFAULT_MODEL
    return use_openai, model


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
    )


async def create_llm_message(
    client: "AsyncOpenAI | anthropic.AsyncAnthropic",
    use_openai: bool,
    model: str,
    max_tokens: int,
    system: str,
    messages: list[dict],
    tools: list[dict] | None = None,
) -> Any:
    """Provider-agnostic single-message call used by pre_analysis.

    WARNING: the OpenAI branch only forwards ``messages[0]``; multi-turn
    histories are not supported on the OpenAI path.
    """
    if not use_openai:
        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": messages,
        }
        if tools is not None:
            kwargs["tools"] = tools
        return await client.messages.create(**kwargs)

    content = str(messages[0].get("content", "")) if messages else ""
    return as_text_message(
        await client.responses.create(
            model=OPENAI_STANDARD_MODEL,
            reasoning=OPENAI_STANDARD_REASONING,
            max_output_tokens=max_tokens,
            instructions=system,
            input=content,
            # NOTE: OpenAI's hosted web_search tool has no per-request usage cap
            # (no `max_uses` equivalent — only `search_context_size`/`filters`).
            tools=[{"type": "web_search"}] if tools else None,
        )
    )


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
