# OpenAI ↔ Claude Parity & Hardening Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the verified OpenAI-vs-Claude behavioral gaps in `repute-api` (standard tier) and harden the OpenAI path — unify prompts, fix the silent batch-drop, add transient-only retries, sanitize error leakage, and pin the dependency.

**Architecture:** Extract the small shared OpenAI helpers + a single tier→provider resolver into `app/utils/llm.py` (both routers import them). Unify the classification and meeting-summary prompts so both providers send Claude's richer content and parse a `{"items": [...]}` object with a bare-array fallback. Make the OpenAI classification path fail loud on token-budget `incomplete` (no silent `[]`), retry **only** transient network/API errors, and stop leaking raw exception strings to API clients.

**Tech Stack:** Python 3.11, FastAPI, `openai>=2.0.0` (Responses API, `gpt-5-mini`), `anthropic` (Messages API), `unittest` (no pytest in this env), `python -m unittest`.

---

## Scope decisions (locked with the user)

1. **C2 behavior:** On OpenAI classification `status == "incomplete"` (token-budget exhaustion) → **fail loud** (raise), **no retry** (retrying won't help). Retry **only** genuine transient network/API errors. Never return a silent `[]` for an incomplete/unparseable response.
2. **Prompt unification:** ONE shared builder per prompt type, using **Claude's rich content**, with the output instruction asking for `{"items": [...]}`. **Both** providers parse items-then-bare-array. (This changes the Claude classification path's output contract from bare-array to items-object — intended.)
3. **Shared code location:** `app/utils/llm.py` holds the resolver + de-duped OpenAI helpers + transient-error predicate. **Prompt builders stay in `generate_lead.py`** (they are router-specific; `pre_analysis.py` prompts are already provider-agnostic).

## Pre-flight facts (already verified — do not re-investigate)

- The router modules are **NOT importable** in this dev env (`sqlalchemy`, `anthropic`, `pydantic_settings` missing; `openai 2.9.0` + `fastapi` present). Tests for router functions therefore use the repo's existing **`exec()`-slice + `unittest`** pattern (see `repute-api/tests/test_generate_lead_name_filter.py`). `app/utils/llm.py` will be written to depend only on stdlib + typing so it CAN be imported directly in tests.
- `_classify_batch` results are flattened via `asyncio.gather(...)` at `generate_lead.py:1558` **without** `return_exceptions=True`. So any exception raised in `_classify_with_openai` propagates → `_execute_generate_lead` → caught in `_run_job` (`:1761`) → job marked `failed`. This is the desired fail-loud path; no extra plumbing needed.
- `pre_analysis.py` already passes identical `search_system`/`neg_system`/`search_content`/`neg_content` to both providers (built before the `use_openai` branch at `:527`). No prompt unification needed there.
- `_passes_name_filter_legacy` (`generate_lead.py:456`) is confirmed dead code (0 callers) — **out of scope here** (not in the user's list), leave it.

## Commit / branch rules

- Work on the current branch `codex/openai-standard-tier` (do NOT push, do NOT touch `main`). Commit after each task. Do not amend.
- Run tests from the `repute-api/` directory.

---

## Task 1: Shared LLM helpers module (`app/utils/llm.py`)

**Files:**
- Create: `repute-api/app/utils/llm.py`
- Create: `repute-api/tests/test_llm_utils.py`

**Step 1: Write the failing test**

`repute-api/tests/test_llm_utils.py`:
```python
import unittest
from types import SimpleNamespace

from app.utils.llm import (
    OPENAI_STANDARD_MODEL,
    OPENAI_STANDARD_REASONING,
    extract_openai_text,
    as_text_message,
    resolve_provider,
    is_transient_openai_error,
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
        import openai
        err = openai.APIConnectionError(request=SimpleNamespace())
        self.assertTrue(is_transient_openai_error(err))

    def test_value_error_not_transient(self):
        self.assertFalse(is_transient_openai_error(ValueError("nope")))
```

**Step 2: Run it to verify it fails**

Run: `cd repute-api && python -m unittest tests.test_llm_utils -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.utils.llm'`
(If it fails instead with an error importing `app/__init__.py`, see the note at the end of this task.)

**Step 3: Write the module**

`repute-api/app/utils/llm.py`:
```python
"""Shared LLM provider helpers — single source of truth for tier routing,
OpenAI Responses-API text extraction, the Claude-message adapter, and the
transient-error predicate used by retry loops.

Kept dependency-light (stdlib + openai exception types only) so it is
importable in unit tests without the full app stack.
"""
from __future__ import annotations

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
            tools=[{"type": "web_search"}] if tools else None,
        )
    )


def is_transient_openai_error(error: BaseException) -> bool:
    """True for network / transient server errors that are safe to retry."""
    return isinstance(error, _TRANSIENT_OPENAI_ERRORS)
```

**Step 4: Run tests to verify they pass**

Run: `cd repute-api && python -m unittest tests.test_llm_utils -v`
Expected: PASS (all tests).

> **Note (app/__init__.py):** If Step 2/4 errors while importing `app` (because `app/__init__.py` pulls in heavy modules), confirm with `python -c "import app"` from `repute-api/`. If `app/__init__.py` is empty (expected), direct import works. If not, change `test_llm_utils.py` to load `app/utils/llm.py` via `importlib.util.spec_from_file_location` instead of a package import.

**Step 5: Commit**
```bash
git add repute-api/app/utils/llm.py repute-api/tests/test_llm_utils.py
git commit -m "feat(repute-api): add shared LLM helpers (resolver, OpenAI adapters, transient predicate)"
```

---

## Task 2: Wire `generate_lead.py` to the shared helpers (Q1, Q2, Q4)

**Files:**
- Modify: `repute-api/app/routers/generate_lead.py:29-44` (delete local constants + `_extract_openai_text`)
- Modify: `repute-api/app/routers/generate_lead.py:1183-1188` (use `resolve_provider`)
- Modify imports near top of `generate_lead.py`

**Step 1: Add the import** (top of file, with the other `from app...` imports):
```python
from app.utils.llm import (
    OPENAI_STANDARD_MODEL,
    OPENAI_STANDARD_REASONING,
    extract_openai_text,
    resolve_provider,
    is_transient_openai_error,
)
```

**Step 2: Delete the duplicated definitions** at `generate_lead.py:29-44`:
- Remove `OPENAI_STANDARD_MODEL = "gpt-5-mini"`
- Remove `OPENAI_STANDARD_REASONING = {"effort": "high"}`
- Remove the entire `def _extract_openai_text(response) -> str: ...` function body (lines 33-44).

**Step 3: Replace every `_extract_openai_text(` call with `extract_openai_text(`** in this file (currently `:1062` and `:1141`). Use a grep to confirm none remain:
Run: `grep -n "_extract_openai_text" repute-api/app/routers/generate_lead.py`
Expected: no matches.

**Step 4: Replace the scattered tier mapping** at `generate_lead.py:1183-1188`:
```python
    use_openai, tier_model = resolve_provider(body.scanTier)
```
(Delete the old `use_openai = ...` + `tier_model = (...)` block.)

**Step 5: Verify the module still parses**

Run: `cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"`
Expected: `parse OK`. (Full import isn't possible in this env; AST parse catches syntax/indentation errors.)

**Step 6: Run existing tests to confirm no regression**

Run: `cd repute-api && python -m unittest tests.test_generate_lead_name_filter tests.test_llm_utils -v`
Expected: PASS.

**Step 7: Commit**
```bash
git add repute-api/app/routers/generate_lead.py
git commit -m "refactor(repute-api): generate_lead uses shared llm helpers + resolve_provider (Q1,Q2,Q4)"
```

---

## Task 3: Wire `pre_analysis.py` to the shared helpers (Q1, Q2, Q4)

**Files:**
- Modify: `repute-api/app/routers/pre_analysis.py:18-73` (delete local constants, `_extract_openai_text`, `_as_text_message`, `_create_llm_message`)
- Modify: `repute-api/app/routers/pre_analysis.py:319` and `:343-347` (use `resolve_provider`)

**Step 1: Add import** (with other `from app...` imports):
```python
from app.utils.llm import (
    OPENAI_STANDARD_MODEL,
    OPENAI_STANDARD_REASONING,
    extract_openai_text,
    as_text_message,
    create_llm_message,
    resolve_provider,
    is_transient_openai_error,
)
```

**Step 2: Delete duplicated definitions** at `pre_analysis.py:18-73`:
- `OPENAI_STANDARD_MODEL`, `OPENAI_STANDARD_REASONING`
- `def _extract_openai_text(...)` (22-33)
- `def _as_text_message(...)` (36-40)
- `async def _create_llm_message(...)` (43-73)

**Step 3: Update call sites** in `pre_analysis.py`:
- `_as_text_message(` → `as_text_message(` (currently `:548`, `:550`)
- `_create_llm_message(` → `create_llm_message(` (currently `:678`)
- Replace `use_openai = body.scanTier == "standard"` (`:319`) and the `model = (...)` block (`:343-347`) with:
```python
    use_openai, model = resolve_provider(body.scanTier)
```
  Keep the existing `if use_openai: if not settings.openai_api_key: ...` key-presence check (`:320-324`) as-is.

**Step 4: Confirm no stale references**

Run: `grep -nE "_extract_openai_text|_as_text_message|_create_llm_message" repute-api/app/routers/pre_analysis.py`
Expected: no matches.

**Step 5: Parse check**

Run: `cd repute-api && python -c "import ast; ast.parse(open('app/routers/pre_analysis.py', encoding='utf-8').read()); print('parse OK')"`
Expected: `parse OK`.

**Step 6: Commit**
```bash
git add repute-api/app/routers/pre_analysis.py
git commit -m "refactor(repute-api): pre_analysis uses shared llm helpers + resolve_provider (Q1,Q2,Q4)"
```

---

## Task 4: C1 — raise pre-analysis neg-estimation token budget to 16k

**Files:**
- Modify: `repute-api/app/routers/pre_analysis.py:540`

**Step 1: Change the value.** In the OpenAI `asyncio.gather` block, the negative-estimation call:
```python
                client.responses.create(
                    model=OPENAI_STANDARD_MODEL,
                    reasoning=OPENAI_STANDARD_REASONING,
                    max_output_tokens=16000,   # was 8096 — reasoning(effort=high) starved output
                    instructions=neg_system,
                    input=neg_content,
                    tools=[{"type": "web_search"}],
                ),
```
(Only the `max_output_tokens` value changes, `8096` → `16000`. Leave the Claude neg call at `:562` unchanged — Claude has no reasoning budget problem.)

**Step 2: Parse check**

Run: `cd repute-api && python -c "import ast; ast.parse(open('app/routers/pre_analysis.py', encoding='utf-8').read()); print('parse OK')"`
Expected: `parse OK`.

**Step 3: Commit**
```bash
git add repute-api/app/routers/pre_analysis.py
git commit -m "fix(repute-api): C1 raise OpenAI neg-estimation max_output_tokens 8096->16000"
```

---

## Task 5: Unify the classification prompt (item 4, B2, snippet gap, response format)

Replace the two divergent classification prompts with one shared builder using **Claude's rich content** but asking for `{"items": [...]}`. Add a shared items-then-bare-array parser. Wire both `_classify_with_claude` and `_classify_with_openai` to use them.

**Files:**
- Modify: `repute-api/app/routers/generate_lead.py` — `_classify_with_claude` (~755-855), `_build_openai_classification_prompt` (979-1029), `_classify_with_openai` (1032-1066)
- Create test: `repute-api/tests/test_classification_prompt.py`

**Step 1: Write the failing test** (`tests/test_classification_prompt.py`) — exec-slice the builder + parser:
```python
import json
import re
import unittest
from pathlib import Path

MODULE = Path(r"repute-api/app/routers/generate_lead.py").resolve()


def load(symbols, start_marker, end_marker):
    src = MODULE.read_text(encoding="utf-8")
    snippet = src[src.index(start_marker):src.index(end_marker)]
    ns = {"json": json, "re": re}
    exec(snippet, ns)
    return {s: ns[s] for s in symbols}


class ClassificationPromptTests(unittest.TestCase):
    def setUp(self):
        self.b = load(["_build_classification_prompt"],
                      "def _build_classification_prompt(",
                      "def _classify_with_claude(")["_build_classification_prompt"]

    def _prompt(self, scan_focus):
        return self.b(
            articles=[{"url": "u", "title": "t", "snippet": "s", "content": "c"}],
            name="Jane Doe", countries=["US"], keywords=["fraud"],
            subject_type="individual", language_name="English", scan_focus=scan_focus,
        )

    def test_negative_focus_has_exclusion_clause(self):
        # B2: exclusion clause must be present (was missing from OpenAI prompt)
        self.assertIn("Exclude all positive and neutral articles from the output entirely",
                      self._prompt("negative"))

    def test_snippet_quality_instruction_present(self):
        # snippet gap: length + own-words + not-copied instruction must be present
        p = self._prompt("negative")
        self.assertIn("3 sentence explanation", p)
        self.assertIn("not copied from the source", p)

    def test_requests_items_object(self):
        # response-format alignment: ask for an "items" array
        self.assertIn('"items"', self._prompt(None))


class ParseItemsTests(unittest.TestCase):
    def setUp(self):
        self.p = load(["_parse_classification_items"],
                      "def _parse_classification_items(",
                      "def _build_classification_prompt(")["_parse_classification_items"]

    def test_items_object(self):
        self.assertEqual(self.p('{"items": [{"url": "a"}]}'), [{"url": "a"}])

    def test_bare_array_fallback(self):
        self.assertEqual(self.p('[{"url": "b"}]'), [{"url": "b"}])

    def test_unparseable_returns_none(self):
        self.assertIsNone(self.p("not json at all"))

    def test_empty_items_is_empty_list_not_none(self):
        self.assertEqual(self.p('{"items": []}'), [])
```
> The exec-slice relies on definition ORDER in the file. Place the new functions in this order: `_parse_classification_items`, then `_build_classification_prompt`, then `_classify_with_claude`. Adjust markers if you choose a different order.

**Step 2: Run to verify failure**

Run: `cd repute-api && python -m unittest tests.test_classification_prompt -v`
Expected: FAIL — `_build_classification_prompt` / `_parse_classification_items` not defined.

**Step 3: Add the shared parser + builder.** Insert ABOVE `_classify_with_claude` (replacing the now-unused `_build_openai_classification_prompt`):

```python
def _parse_classification_items(text: str) -> list | None:
    """Parse an LLM classification result. Accepts {"items": [...]} (preferred)
    or a bare [...] array. Returns the list (possibly empty) or None if no
    parseable JSON structure was found (caller decides how to handle None)."""
    obj = _parse_json_object(text)
    if obj is not None and isinstance(obj.get("items"), list):
        return obj["items"]
    return _parse_json_array(text)


def _build_classification_prompt(
    articles: list[dict],
    name: str,
    countries: list[str],
    keywords: list[str],
    subject_type: str,
    language_name: str,
    scan_focus: str | None,
) -> str:
    """Shared classification prompt for BOTH providers (Claude's rich content,
    output as a {"items": [...]} object)."""
    article_list = "\n\n---\n\n".join(
        f"[{i+1}] URL: {a['url']}\nTitle: {a['title']}\nSnippet: {a['snippet']}\nContent: {a['content']}"
        for i, a in enumerate(articles)
    )
    countries_label = ", ".join(countries)
    keyword_list = ", ".join(keywords) if keywords else "general reputation"
    country_line = ""
    if countries:
        country_line = (
            f"The subject is a company from {countries_label}. Only include results clearly relevant to this company and these regions."
            if subject_type == "company"
            else f"The subject is from {countries_label}. Only include results clearly relevant to this person and these regions."
        )

    scan_focus_rules: dict[str, str] = {
        "negative": "\nSCAN FOCUS: Return ONLY articles with NEGATIVE sentiment or HIGH/MEDIUM risk. Exclude all positive and neutral articles from the output entirely.\n",
        "positive": "\nSCAN FOCUS: Return ONLY articles with POSITIVE sentiment. Exclude all negative and neutral articles from the output entirely.\n",
        "neutral": "\nSCAN FOCUS: Return ONLY articles with NEUTRAL sentiment (purely informational). Exclude all negative and positive articles from the output entirely.\n",
    }
    scan_focus_rule = (
        scan_focus_rules.get(scan_focus or "", "")
        if scan_focus and scan_focus != "all"
        else ""
    )

    return (
        f'You are a reputation intelligence analyst. Classify the following {len(articles)} articles about "{name}".\n\n'
        f"{country_line}\nSearch context keywords used: {keyword_list}\n{scan_focus_rule}\n"
        f"CLASSIFICATION RULES:\n\nNEGATIVE sentiment — classify if the article contains ANY of:\n"
        f"- Criminal investigations, police involvement, charges, arrests\n"
        f"- Lawsuits, legal disputes, court cases, regulatory sanctions\n"
        f"- Fraud, scams, financial misconduct\n"
        f"- Accusations, allegations, or suspicion of wrongdoing\n"
        f"- Controversies, scandals, or reputation-damaging incidents\n"
        f"- Accidents or incidents involving the subject\n"
        f"- WHEN IN DOUBT between negative and neutral → choose NEGATIVE\n\n"
        f"POSITIVE sentiment — classify if the article CLEARLY shows:\n"
        f"- Awards, honors, recognitions\n"
        f"- Major achievements or business/professional success\n"
        f"- Leadership appointments or promotions\n"
        f"- Strong positive media coverage praising the person\n\n"
        f"NEUTRAL sentiment — ONLY if:\n"
        f"- Purely informational (Wikipedia entry, directory listing, company profile)\n"
        f"- ZERO reputational concern whatsoever\n"
        f"- No legal mentions, no incidents, no controversy\n\n"
        f'RISK CLASSIFICATION:\n- "high": crimes, fraud, lawsuits, investigations, illegal activity\n'
        f'- "medium": accidents, controversies, allegations, complaints\n'
        f'- "low": minor criticism or weak negative mentions\n'
        f'- "none": positive or neutral content\n\n'
        f"ARTICLES TO CLASSIFY:\n{article_list}\n\n"
        f'Return a JSON object with an "items" array — no explanation, no markdown code fences. '
        f"Each item must have:\n"
        f'{{\n  "url": "...",\n  "title": "...",\n'
        f'  "snippet": "3 sentence explanation of the reputational significance of this article, written in your own words based on the title and content — not copied from the source. Write the snippet in {language_name}.",\n'
        f'  "sentiment": "negative" | "positive" | "neutral",\n'
        f'  "risk": "high" | "medium" | "low" | "none",\n'
        f'  "source": "domain.com",\n'
        f'  "type": "criminal" | "legal" | "news" | "complaint" | "regulatory" | "social" | "award" | "achievement" | "profile" | "wiki" | "directory"\n'
        f'}}\n\nReturn ONLY the JSON object with the "items" array. If no valid articles, return {{"items": []}}.'
    )
```

**Step 4: Update `_classify_with_claude`** to use the shared builder + parser. Replace its body's prompt construction (the `prompt = (...)` block ~801-833) and the parse logic (~846-855) so it reads:
```python
    prompt = _build_classification_prompt(
        articles, name, countries, keywords, subject_type, language_name, scan_focus
    )

    async with client.messages.stream(
        model=model,
        max_tokens=64000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        response = await stream.get_final_message()

    if response.stop_reason == "max_tokens":
        print("[classify] Anthropic hit max_tokens; JSON may be truncated")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block:
        return []
    return _parse_classification_items(text_block.text) or []
```
Delete the now-dead local variables in `_classify_with_claude` (`name_parts`, `first_name`, `last_name`, `name_filter`, the old `scan_focus_rules`) — they were only used by the inlined prompt.

**Step 5: Update `_classify_with_openai`** prompt + parse (token/incomplete handling comes in Task 7). For now:
```python
    response = await client.responses.create(
        model=OPENAI_STANDARD_MODEL,
        reasoning=OPENAI_STANDARD_REASONING,
        max_output_tokens=64000,
        input=_build_classification_prompt(
            articles, name, countries, keywords, subject_type, language_name, scan_focus
        ),
    )
    if getattr(response, "status", None) == "incomplete":
        print(f"[classify] OpenAI response incomplete: {response.incomplete_details}")

    return _parse_classification_items(extract_openai_text(response)) or []
```
Delete `_build_openai_classification_prompt` (now replaced) and the old inline `_parse_json_object`/`items` handling.

**Step 6: Run tests**

Run: `cd repute-api && python -m unittest tests.test_classification_prompt tests.test_generate_lead_name_filter tests.test_llm_utils -v`
Expected: PASS.

**Step 7: Parse check + commit**
```bash
cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"
git add repute-api/app/routers/generate_lead.py repute-api/tests/test_classification_prompt.py
git commit -m "feat(repute-api): unify classification prompt (Claude content, items+fallback) — fixes B2 + snippet gap"
```

---

## Task 6: Unify the meeting-summary prompt (item 4, schema/counts gap)

Extract one shared `_build_meeting_summary_prompt` using **Claude's content** (full schema, array-size counts, longer system prompt, em-dash separator). Both meeting-summary functions use it.

**Files:**
- Modify: `repute-api/app/routers/generate_lead.py` — `_generate_meeting_summary` (~858-946), `_build_openai_meeting_summary_prompt` (1069-1118), `_generate_meeting_summary_with_openai` (1121-1146)
- Create test: `repute-api/tests/test_meeting_summary_prompt.py`

**Step 1: Write the failing test** (`tests/test_meeting_summary_prompt.py`):
```python
import unittest
from pathlib import Path

MODULE = Path(r"repute-api/app/routers/generate_lead.py").resolve()


def load_builder():
    src = MODULE.read_text(encoding="utf-8")
    snippet = src[src.index("def _build_meeting_summary_prompt("):src.index("async def _generate_meeting_summary(")]
    ns = {}
    exec(snippet, ns)
    return ns["_build_meeting_summary_prompt"]


class MeetingSummaryPromptTests(unittest.TestCase):
    def setUp(self):
        self.b = load_builder()
        self.links = [{"sentiment": "negative", "risk": "high", "title": "X", "source": "s.com"}]

    def test_returns_system_and_user(self):
        system, user = self.b("Jane", 42, self.links, "English")
        self.assertIsInstance(system, str)
        self.assertIsInstance(user, str)

    def test_has_array_size_counts(self):
        _, user = self.b("Jane", 42, self.links, "English")
        self.assertIn("5-8", user)   # issues
        self.assertIn("4-6", user)   # talking points / risk indicators
        self.assertIn("4-5", user)   # objection handlers

    def test_system_prompt_is_full_version(self):
        system, _ = self.b("Jane", 42, self.links, "English")
        self.assertIn("retrieved from public search engines", system)
```

**Step 2: Run to verify failure**

Run: `cd repute-api && python -m unittest tests.test_meeting_summary_prompt -v`
Expected: FAIL — builder not defined.

**Step 3: Add `_build_meeting_summary_prompt`** (Claude content). Insert above `_generate_meeting_summary`:
```python
def _build_meeting_summary_prompt(
    name: str,
    score: int,
    links: list[dict],
    language_name: str,
) -> tuple[str, str]:
    """Shared meeting-summary prompt (Claude's rich version) for both providers.
    Returns (system_prompt, user_prompt)."""
    neg_links = [
        l for l in links
        if l.get("sentiment") == "negative" or l.get("risk") in ("high", "medium")
    ]
    pos_links = [l for l in links if l.get("sentiment") == "positive"]
    high_links = [l for l in links if l.get("risk") == "high"]
    med_links = [l for l in links if l.get("risk") == "medium"]
    neutral_links = [l for l in links if l.get("sentiment") == "neutral"]

    score_breakdown = (
        f"Score: {score}/100 | High-risk: {len(high_links)} | Medium-risk: {len(med_links)} "
        f"| Positive: {len(pos_links)} | Neutral: {len(neutral_links)}"
    )
    neg_summary = (
        "Negative/Risk findings:\n"
        + "\n".join(
            f"- [{(l.get('risk') or 'none').upper()}] \"{l.get('title', '')}\" — {l.get('source', '')}"
            + (f" ({l['date']})" if l.get("date") else "")
            + f"\n  {l.get('snippet', '')}"
            for l in neg_links[:8]
        )
        if neg_links else "No negative results found."
    )
    pos_summary = (
        "Positive findings:\n"
        + "\n".join(
            f"- \"{l.get('title', '')}\" — {l.get('source', '')}"
            + (f" ({l['date']})" if l.get("date") else "")
            for l in pos_links[:4]
        )
        if pos_links else "No positive results found."
    )

    system_prompt = (
        "You are an AI assistant embedded in a professional reputation intelligence platform used by "
        "reputation management firms. Your task is to analyze publicly available web search results "
        "about a prospective client and produce structured internal sales briefing notes. "
        "The findings below are summaries of news articles and web sources retrieved from public search engines. "
        "Respond only with the requested JSON object."
    )
    user_prompt = (
        f"Analyze the following publicly available web search findings about a prospective client and produce an internal sales brief.\n\n"
        f'Subject: "{name}"\n{score_breakdown}\n\n{neg_summary}\n\n{pos_summary}\n\n'
        f"Return ONLY a JSON object with these 5 fields (no markdown, no explanation):\n"
        f'{{\n  "headline": "one sharp sentence summarising the reputational situation for the sales team",\n'
        f'  "issues": ["5-8 specific key reputation points — cite article titles or sources where relevant"],\n'
        f'  "talkingPoints": ["4-6 opening lines for the client meeting — reference their actual situation, not generic phrases"],\n'
        f'  "riskIndicators": ["4-6 concrete risk flags drawn from the findings above — include source name and date where available"],\n'
        f'  "objectionHandlers": ["4-5 sharp, specific rebuttals for when the prospect says they don\'t need reputation management — reference their actual findings"]\n'
        f"}}\n\nWrite all output in {language_name}."
    )
    return system_prompt, user_prompt
```

**Step 4: Update `_generate_meeting_summary` (Claude)** to call the builder — replace its inline `neg_links/pos_links/.../prompt/system_prompt` construction (~866-919) with:
```python
    try:
        system_prompt, prompt = _build_meeting_summary_prompt(name, score, links, language_name)
        for attempt in range(3):
            try:
                response = await client.messages.create(
                    model=model,
                    max_tokens=16000,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                text_block = next((b for b in response.content if b.type == "text"), None)
                if text_block:
                    parsed = _parse_json_object(text_block.text)
                    if parsed:
                        return parsed
                print(f"[meeting-summary] no JSON (attempt {attempt + 1})")
            except Exception as e:
                print(f"[meeting-summary] error (attempt {attempt + 1}): {e}")
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
    except Exception as e:
        print(f"[meeting-summary] setup error: {e}")
    return _fallback_summary(score)
```
(Functionally identical to today, just sourcing the prompt from the shared builder and using `_parse_json_object`.)

**Step 5: Delete `_build_openai_meeting_summary_prompt`** (1069-1118). The OpenAI meeting function is rewritten in Task 8; for now make it call the shared builder so the file stays valid:
```python
async def _generate_meeting_summary_with_openai(client, name, score, links, language_name) -> dict:
    try:
        system_prompt, prompt = _build_meeting_summary_prompt(name, score, links, language_name)
        response = await client.responses.create(
            model=OPENAI_STANDARD_MODEL,
            reasoning=OPENAI_STANDARD_REASONING,
            max_output_tokens=16000,
            instructions=system_prompt,
            input=prompt,
        )
        if getattr(response, "status", None) == "incomplete":
            print(f"[meeting-summary] OpenAI response incomplete: {response.incomplete_details}")
        parsed = _parse_json_object(extract_openai_text(response))
        if parsed:
            return parsed
    except Exception as e:
        print(f"[meeting-summary] OpenAI error: {e}")
    return _fallback_summary(score)
```

**Step 6: Run tests + parse check**

Run: `cd repute-api && python -m unittest tests.test_meeting_summary_prompt tests.test_classification_prompt tests.test_generate_lead_name_filter tests.test_llm_utils -v`
Expected: PASS.
Run: `cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"`

**Step 7: Commit**
```bash
git add repute-api/app/routers/generate_lead.py repute-api/tests/test_meeting_summary_prompt.py
git commit -m "feat(repute-api): unify meeting-summary prompt (Claude schema/counts) for both providers"
```

---

## Task 7: C2 — fail loud on incomplete; retry transient errors only

Make `_classify_with_openai` (a) retry **only** transient API errors, (b) **raise** on `incomplete` (no retry — token budget) and on completed-but-unparseable, never returning a silent `[]` that hides a dropped batch.

**Files:**
- Modify: `repute-api/app/routers/generate_lead.py` — add `OpenAIIncompleteError`, rewrite `_classify_with_openai`
- Create test: `repute-api/tests/test_classify_openai_failmode.py`

**Step 1: Write the failing test** — exec-slice `_classify_with_openai` with stubbed deps + `AsyncMock` client:
```python
import asyncio
import json
import re
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import openai

MODULE = Path(r"repute-api/app/routers/generate_lead.py").resolve()


def load_classify():
    src = MODULE.read_text(encoding="utf-8")
    # slice from the error class through end of _classify_with_openai
    start = src.index("class OpenAIIncompleteError")
    end = src.index("def _build_openai_meeting") if "_build_openai_meeting" in src else src.index("async def _generate_meeting_summary_with_openai(")
    snippet = src[start:end]
    ns = {
        "json": json, "re": re, "asyncio": asyncio, "SimpleNamespace": SimpleNamespace,
        "OPENAI_STANDARD_MODEL": "gpt-5-mini",
        "OPENAI_STANDARD_REASONING": {"effort": "high"},
        "extract_openai_text": lambda r: getattr(r, "output_text", "") or "",
        "is_transient_openai_error": lambda e: isinstance(e, (openai.APIConnectionError, openai.APITimeoutError, openai.RateLimitError, openai.InternalServerError)),
        "_parse_classification_items": None,  # provided below
    }
    # pull the real parser too
    p = src[src.index("def _parse_classification_items("):src.index("def _build_classification_prompt(")]
    pj = src[src.index("def _parse_json_object("):src.index("def _parse_json_array(")]
    pa = src[src.index("def _parse_json_array("):src.index("def _build_openai_classification_prompt(") if "_build_openai_classification_prompt" in src else src.index("def _build_classification_prompt(")]
    # NOTE: adjust markers above to whatever bracketing functions exist after Task 5.
    exec(pj, ns); exec(pa, ns); exec(p, ns)
    # builder (so _classify_with_openai can call it)
    bld = src[src.index("def _build_classification_prompt("):src.index("def _classify_with_claude(")]
    exec(bld, ns)
    exec(snippet, ns)
    return ns


ARTS = [{"url": "u", "title": "t", "snippet": "s", "content": "c"}]


class ClassifyFailModeTests(unittest.TestCase):
    def setUp(self):
        self.ns = load_classify()
        self.fn = self.ns["_classify_with_openai"]
        self.Err = self.ns["OpenAIIncompleteError"]

    def test_incomplete_raises_no_retry(self):
        client = SimpleNamespace(responses=SimpleNamespace(
            create=AsyncMock(return_value=SimpleNamespace(
                status="incomplete", incomplete_details=SimpleNamespace(reason="max_output_tokens"), output_text=""))))
        with self.assertRaises(self.Err):
            asyncio.run(self.fn(client, ARTS, "n", ["US"], [], "individual", "English", None))
        self.assertEqual(client.responses.create.call_count, 1)  # NOT retried

    def test_transient_error_retried_then_succeeds(self):
        good = SimpleNamespace(status="completed", output_text='{"items": [{"url": "u"}]}')
        client = SimpleNamespace(responses=SimpleNamespace(
            create=AsyncMock(side_effect=[openai.APITimeoutError(request=SimpleNamespace()), good])))
        out = asyncio.run(self.fn(client, ARTS, "n", ["US"], [], "individual", "English", None))
        self.assertEqual(out, [{"url": "u"}])
        self.assertEqual(client.responses.create.call_count, 2)

    def test_completed_valid_empty_returns_empty(self):
        client = SimpleNamespace(responses=SimpleNamespace(
            create=AsyncMock(return_value=SimpleNamespace(status="completed", output_text='{"items": []}'))))
        out = asyncio.run(self.fn(client, ARTS, "n", ["US"], [], "individual", "English", None))
        self.assertEqual(out, [])
```
> The exec-slice markers above are fragile by design — the executing agent must fix the `src.index(...)` bracket markers to match the actual neighbouring function names after Tasks 5–6 land. Keep the stubs (`extract_openai_text`, `is_transient_openai_error`) so no real SDK objects are needed.

**Step 2: Run to verify failure**

Run: `cd repute-api && python -m unittest tests.test_classify_openai_failmode -v`
Expected: FAIL — `OpenAIIncompleteError` not defined.

**Step 3: Add the exception + rewrite `_classify_with_openai`:**
```python
class OpenAIIncompleteError(RuntimeError):
    """Raised when an OpenAI classification response is incomplete or
    unparseable, so the batch is failed loud instead of silently dropped."""


async def _classify_with_openai(
    client: AsyncOpenAI,
    articles: list[dict],
    name: str,
    countries: list[str],
    keywords: list[str],
    subject_type: str,
    language_name: str,
    scan_focus: str | None,
    max_attempts: int = 3,
) -> list[dict]:
    if not articles:
        return []

    prompt = _build_classification_prompt(
        articles, name, countries, keywords, subject_type, language_name, scan_focus
    )

    last_error: Exception | None = None
    for attempt in range(max_attempts):
        try:
            response = await client.responses.create(
                model=OPENAI_STANDARD_MODEL,
                reasoning=OPENAI_STANDARD_REASONING,
                max_output_tokens=64000,
                input=prompt,
            )
        except Exception as e:  # retry only genuine transient API errors
            if is_transient_openai_error(e) and attempt < max_attempts - 1:
                last_error = e
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            raise

        # Token budget exhausted — retrying will not help. Fail loud.
        if getattr(response, "status", None) == "incomplete":
            details = getattr(response, "incomplete_details", None)
            raise OpenAIIncompleteError(
                f"OpenAI classification incomplete for {len(articles)} articles: {details}"
            )

        items = _parse_classification_items(extract_openai_text(response))
        if items is None:
            # Completed but no parseable JSON — do not silently drop the batch.
            raise OpenAIIncompleteError(
                f"OpenAI classification returned unparseable output for {len(articles)} articles"
            )
        return items

    # Exhausted retries on transient errors
    raise OpenAIIncompleteError(
        f"OpenAI classification failed after {max_attempts} attempts: {last_error}"
    )
```
> `AsyncOpenAI` is already imported in `generate_lead.py`. `asyncio` is imported (line 1).

**Step 4: Run tests**

Run: `cd repute-api && python -m unittest tests.test_classify_openai_failmode -v`
Expected: PASS.

**Step 5: Confirm fail-loud propagation is intact.** Verify `generate_lead.py:1558` still uses `asyncio.gather(...)` WITHOUT `return_exceptions=True` (so the raise fails the job):
Run: `grep -n "return_exceptions" repute-api/app/routers/generate_lead.py`
Expected: matches only inside `pre_analysis`-style gathers if any — the classification gather at ~1558 must NOT have it.

**Step 6: Parse check + commit**
```bash
cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"
git add repute-api/app/routers/generate_lead.py repute-api/tests/test_classify_openai_failmode.py
git commit -m "fix(repute-api): C2 fail loud on incomplete OpenAI classification; retry transient errors only"
```

---

## Task 8: B1 — OpenAI meeting-summary retry (Claude parity)

Add a retry loop to `_generate_meeting_summary_with_openai` mirroring Claude (3 attempts, 1.5s/3.0s backoff). Retry transient API errors and completed-but-no-JSON; do NOT retry `incomplete` (go straight to fallback). Keep the graceful `_fallback_summary` (parity with Claude — meeting summary degrades, it does not fail the job).

**Files:**
- Modify: `repute-api/app/routers/generate_lead.py` — `_generate_meeting_summary_with_openai`
- Create test: `repute-api/tests/test_meeting_summary_openai_retry.py`

**Step 1: Write the failing test** (exec-slice + AsyncMock):
```python
import asyncio, json, re, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import openai

MODULE = Path(r"repute-api/app/routers/generate_lead.py").resolve()


def load_fn():
    src = MODULE.read_text(encoding="utf-8")
    snippet = src[src.index("async def _generate_meeting_summary_with_openai("):src.index("class GenerateLeadRequest(")]
    ns = {
        "json": json, "re": re, "asyncio": asyncio, "SimpleNamespace": SimpleNamespace,
        "OPENAI_STANDARD_MODEL": "gpt-5-mini", "OPENAI_STANDARD_REASONING": {"effort": "high"},
        "extract_openai_text": lambda r: getattr(r, "output_text", "") or "",
        "is_transient_openai_error": lambda e: isinstance(e, (openai.APITimeoutError, openai.APIConnectionError, openai.RateLimitError, openai.InternalServerError)),
        "_fallback_summary": lambda score: {"headline": "FALLBACK", "issues": []},
        "_build_meeting_summary_prompt": lambda *a, **k: ("sys", "user"),
    }
    pj = src[src.index("def _parse_json_object("):src.index("def _parse_json_array(")]
    exec(pj, ns)
    exec(snippet, ns)
    return ns["_generate_meeting_summary_with_openai"]


class MeetingRetryTests(unittest.TestCase):
    def setUp(self):
        self.fn = load_fn()

    def test_transient_then_success(self):
        good = SimpleNamespace(status="completed", output_text='{"headline": "OK"}')
        client = SimpleNamespace(responses=SimpleNamespace(
            create=AsyncMock(side_effect=[openai.APITimeoutError(request=SimpleNamespace()), good])))
        out = asyncio.run(self.fn(client, "n", 40, [], "English"))
        self.assertEqual(out["headline"], "OK")
        self.assertEqual(client.responses.create.call_count, 2)

    def test_incomplete_goes_straight_to_fallback_no_retry(self):
        client = SimpleNamespace(responses=SimpleNamespace(
            create=AsyncMock(return_value=SimpleNamespace(status="incomplete", incomplete_details=None, output_text=""))))
        out = asyncio.run(self.fn(client, "n", 40, [], "English"))
        self.assertEqual(out["headline"], "FALLBACK")
        self.assertEqual(client.responses.create.call_count, 1)
```

**Step 2: Run to verify failure**

Run: `cd repute-api && python -m unittest tests.test_meeting_summary_openai_retry -v`
Expected: FAIL (current single-call version retries 0 times / does not match assertions).

**Step 3: Rewrite `_generate_meeting_summary_with_openai`:**
```python
async def _generate_meeting_summary_with_openai(
    client: AsyncOpenAI,
    name: str,
    score: int,
    links: list[dict],
    language_name: str,
    max_attempts: int = 3,
) -> dict:
    system_prompt, prompt = _build_meeting_summary_prompt(name, score, links, language_name)
    for attempt in range(max_attempts):
        try:
            response = await client.responses.create(
                model=OPENAI_STANDARD_MODEL,
                reasoning=OPENAI_STANDARD_REASONING,
                max_output_tokens=16000,
                instructions=system_prompt,
                input=prompt,
            )
            # Token-budget incomplete won't improve on retry — fall back now.
            if getattr(response, "status", None) == "incomplete":
                print(f"[meeting-summary] OpenAI incomplete: {getattr(response, 'incomplete_details', None)}")
                break
            parsed = _parse_json_object(extract_openai_text(response))
            if parsed:
                return parsed
            print(f"[meeting-summary] OpenAI no JSON (attempt {attempt + 1})")
        except Exception as e:
            if not is_transient_openai_error(e):
                print(f"[meeting-summary] OpenAI non-transient error: {e}")
                break
            print(f"[meeting-summary] OpenAI transient error (attempt {attempt + 1}): {e}")
        if attempt < max_attempts - 1:
            await asyncio.sleep(1.5 * (attempt + 1))
    return _fallback_summary(score)
```

**Step 4: Run tests + parse check + commit**
```bash
cd repute-api && python -m unittest tests.test_meeting_summary_openai_retry -v
cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"
git add repute-api/app/routers/generate_lead.py repute-api/tests/test_meeting_summary_openai_retry.py
git commit -m "fix(repute-api): B1 add transient-retry to OpenAI meeting summary (Claude parity)"
```

---

## Task 9: S1.1 — stop leaking raw exception strings to API clients

Replace `error=f"{type(e).__name__}: {e}"` with a sanitized message (class name + scrubbed text), and log the full detail server-side only.

**Files:**
- Modify: `repute-api/app/utils/llm.py` — add `safe_error_message`
- Modify: `repute-api/app/routers/generate_lead.py:1762` (`_run_job` except block)
- Add test to: `repute-api/tests/test_llm_utils.py`

**Step 1: Add the failing test** to `tests/test_llm_utils.py`:
```python
from app.utils.llm import safe_error_message


class SafeErrorMessageTests(unittest.TestCase):
    def test_redacts_openai_key(self):
        msg = safe_error_message(ValueError("auth failed key=sk-ABC123DEFGHIJKLMNOP token leaked"))
        self.assertNotIn("sk-ABC123DEFGHIJKLMNOP", msg)
        self.assertIn("ValueError", msg)

    def test_redacts_bearer_and_urls(self):
        msg = safe_error_message(RuntimeError("GET https://api.openai.com/v1/x?api-key=secret Authorization: Bearer abc.def"))
        self.assertNotIn("secret", msg)
        self.assertNotIn("Bearer abc.def", msg)

    def test_keeps_class_name(self):
        self.assertTrue(safe_error_message(KeyError("x")).startswith("KeyError"))
```

**Step 2: Run to verify failure**

Run: `cd repute-api && python -m unittest tests.test_llm_utils -v`
Expected: FAIL — `safe_error_message` not defined.

**Step 3: Implement in `app/utils/llm.py`:**
```python
import re as _re

_SECRET_PATTERNS = [
    _re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),                 # OpenAI-style keys
    _re.compile(r"Bearer\s+[A-Za-z0-9._\-]+", _re.I),       # auth headers
    _re.compile(r"https?://\S+"),                           # URLs (may carry key= query)
    _re.compile(r"(?i)(api[_-]?key|token|secret)\s*[=:]\s*\S+"),
]


def safe_error_message(error: BaseException, max_len: int = 200) -> str:
    """Return '<ClassName>: <scrubbed message>' safe to persist/return to clients.
    Strips API keys, bearer tokens, and URLs that may carry secrets."""
    text = str(error)
    for pat in _SECRET_PATTERNS:
        text = pat.sub("[redacted]", text)
    text = text.strip()[:max_len]
    return f"{type(error).__name__}: {text}" if text else type(error).__name__
```

**Step 4: Use it in `_run_job`** (`generate_lead.py:1761-1763`):
```python
    except BaseException as e:
        print(f"[generate_lead] job {job_id} failed: {type(e).__name__}: {e}")  # full detail server-side only
        await _update_job_status(job_id, "failed", error=safe_error_message(e))
        raise
```
Add `safe_error_message` to the `from app.utils.llm import (...)` block in `generate_lead.py`.

**Step 5: Run tests + parse check + commit**
```bash
cd repute-api && python -m unittest tests.test_llm_utils -v
cd repute-api && python -c "import ast; ast.parse(open('app/routers/generate_lead.py', encoding='utf-8').read()); print('parse OK')"
git add repute-api/app/utils/llm.py repute-api/app/routers/generate_lead.py repute-api/tests/test_llm_utils.py
git commit -m "fix(repute-api): S1.1 sanitize job.error before persisting/returning to clients"
```

---

## Task 10: S1.2 — pin the OpenAI dependency

**Files:**
- Modify: `repute-api/requirements.txt:18`

**Step 1: Change the constraint:**
```
openai>=2.0.0,<3.0.0
```

**Step 2: Commit**
```bash
git add repute-api/requirements.txt
git commit -m "chore(repute-api): S1.2 pin openai>=2.0.0,<3.0.0"
```

---

## Task 11: OpenAI web-search usage cap (behavioral alignment — VERIFY FIRST)

Claude caps web search at `max_uses` 12 (search) / 10 (neg). The OpenAI Responses API hosted `web_search` tool config differs and **may not accept a `max_uses` equivalent**. This task is verify-first; do not invent an unsupported parameter.

**Files (only if supported):**
- Modify: `repute-api/app/routers/pre_analysis.py:535,543` and `app/utils/llm.py` `create_llm_message` tool config

**Step 1: Verify support.** Check the installed SDK's web_search tool param surface:
```bash
cd repute-api && python -c "import openai, inspect; print(openai.__version__)"
```
Consult the OpenAI Responses API web_search tool docs for a per-request usage limit (e.g. a `max_uses`, `max_searches`, or tool-config cap). The Anthropic `max_uses` field is NOT guaranteed to exist on OpenAI's hosted tool.

**Step 2a: If a cap parameter exists** — add it to the two OpenAI `tools=[{"type": "web_search"}]` calls (`pre_analysis.py:535` search, `:543` neg) and to `create_llm_message` (`app/utils/llm.py`), mirroring Claude's 12 / 10 split. Then parse-check and commit:
```bash
git commit -am "feat(repute-api): cap OpenAI web_search uses (parity with Claude 12/10)"
```

**Step 2b: If NO such parameter exists** — do NOT fake it. Add a short code comment at each OpenAI `web_search` site documenting that the hosted tool has no per-request usage cap and search volume is model-controlled, and note this in the PR description. Commit the comments only:
```bash
git commit -am "docs(repute-api): note OpenAI web_search has no max_uses equivalent (parity gap documented)"
```

> Report which branch (2a/2b) was taken in the task summary — this is the one item with genuine external uncertainty.

---

## Task 12: Final verification

**Step 1: Run the full test suite**

Run: `cd repute-api && python -m unittest discover -s tests -p "test_*.py" -v`
Expected: all tests PASS.

**Step 2: Parse-check both routers + the util**

Run:
```bash
cd repute-api && python -c "import ast; [ast.parse(open(f, encoding='utf-8').read()) for f in ['app/routers/generate_lead.py','app/routers/pre_analysis.py','app/utils/llm.py']]; print('all parse OK')"
```

**Step 3: Confirm no dead references remain**

Run: `grep -rnE "_extract_openai_text|_as_text_message|_create_llm_message|_build_openai_classification_prompt|_build_openai_meeting_summary_prompt" repute-api/app/`
Expected: no matches (all replaced by shared helpers / unified builders).

**Step 4: Summary of what changed vs the verification report**

Confirm each addressed item:
- [ ] C1 — pre_analysis neg `max_output_tokens` 8096→16000
- [ ] C2 — classification fails loud on incomplete/unparseable; transient-only retry
- [ ] B1 — OpenAI meeting summary retries transient errors (Claude parity)
- [ ] Prompts unified (Claude content, `{"items":[…]}` + bare-array fallback) — fixes B2 + snippet gap + meeting schema/counts gap + response-format alignment
- [ ] Q2 — single `resolve_provider`
- [ ] Q4 — type hints on moved helpers
- [ ] S1.1 — `job.error` sanitized
- [ ] S1.2 — `openai` pinned `<3.0.0`
- [ ] Web search cap — branch 2a or 2b (report which)

**Do not push or open a PR** unless the user explicitly asks.

---

## Out of scope (verified but not in this batch)

- The `incomplete_details` access being called an "AttributeError crash" — verified to be a **non-crash** (SDK always defines the field); left as a sanitized print. (Security agent's LOW info-disclosure framing; the print sites already only run under `status=="incomplete"`.)
- `_passes_name_filter_legacy` dead code (Q5), prompt-injection hardening (S2.1/2.2), `max_length` request validation (S5.1), `except Exception` breadth (Q8), blocking `read_text()` at import (Q9), `scan_log: dict` typing (Q10), JWT default secret (pre-existing), tier-escalation authz (S4.1). Track separately if desired.
