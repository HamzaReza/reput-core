# LLM Token Tracking, Usage Analytics & Cost — Design

- **Date:** 2026-06-13
- **Status:** Design approved (brainstorm complete); ready for implementation planning
- **Scope:** `repute-api` (FastAPI backend) + `GINA` (Next.js frontend)

## Goal

Track LLM token usage **per WebAnalyst** across every LLM call, persist it, and surface
admin-only analytics with **estimated cost**. Two drivers, confirmed with the client:

1. **Internal cost monitoring** — visibility into total LLM spend (OpenAI + Anthropic) and trends.
2. **Per-analyst accountability** — which WebAnalysts consume the most tokens/cost.

"Per user" means the **WebAnalyst** (internal operator who runs scans), not the end-client `User`.

## Decisions (locked during brainstorm)

| Decision | Choice | Rationale |
|---|---|---|
| Who is "user" | `WebAnalyst` (via `created_by_id` / `_analyst.id`) | They are who triggers LLM calls |
| Enforcement | **Passive reporting only** | No quotas/blocking; record → display |
| Granularity | **Per LLM call** (one row per API call) | Richest analytics; volume is trivial |
| Pricing source | **DB pricing table**, effective-dated | Editable without a deploy |
| Cost handling | **Store cost snapshot at write** | Trivial reads, stable history, verifiable; tokens retained so a wrong rate can be recomputed |
| Audience / UI | **Admin-only**, on existing Analytics page | Matches current role model; one page |
| Timezone | **Frontend authoritative** (browser zone) | Backend in UTC; browser decides day boundaries + display |

## Non-goals (YAGNI)

- No client/lead cost attribution (invoicing).
- No tier/model pricing-optimization tooling.
- No quotas, alerts, or hard limits.
- No backfill of historical scans (token data doesn't exist for them).
- No prompt-caching token modeling (codebase uses none — confirmed via grep).

---

## Section 1 — Data Model (2 new tables)

### `llm_usage` — one row per LLM API call (source of truth)

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `web_analyst_id` | UUID FK → `web_analysts.id` | **indexed**; always set (both endpoints require auth) |
| `job_id` | UUID FK → `generate_lead_jobs.id`, nullable | null for pre-analysis (synchronous, no job) |
| `operation` | text | `classification` \| `meeting_summary` \| `pre_analysis_research` \| `pre_analysis_negative` \| `pre_analysis_keywords` |
| `provider` | text | `openai` \| `anthropic` |
| `model` | text | actual model string; the rate lookup key |
| `scan_tier` | text, nullable | request tier (basic/standard/advanced/pro/max); null for pre-analysis |
| `input_tokens` | int | |
| `output_tokens` | int | for OpenAI this already includes reasoning tokens |
| `reasoning_tokens` | int default 0 | OpenAI `completion_tokens_details.reasoning_tokens`; informational, **not** double-counted |
| `total_tokens` | int | denormalized for convenience |
| `cost_usd` | numeric | **computed at write** from the effective rate |
| `pricing_id` | UUID FK → `llm_pricing.id`, nullable | which rate produced `cost_usd` (explains the snapshot; enables later recompute) |
| `created_at` | timestamptz default now() | **indexed** for time-series |

Indexes: `(created_at)`, `(web_analyst_id)`, `(job_id)`.

### `llm_pricing` — effective-dated rates (rate source)

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `model` | text | indexed |
| `provider` | text | |
| `input_rate` | numeric | USD per 1M input tokens |
| `output_rate` | numeric | USD per 1M output tokens |
| `effective_from` | timestamptz | |

- Rates are **append-only**. "Editing"/correcting a rate = inserting a new row with a new
  `effective_from`. The applicable rate for a call = the row for that `model` with the greatest
  `effective_from` ≤ the call's time.
- The pricing table is read **only at write time** to snapshot `cost_usd` (cost is not recomputed
  on read). Tokens are retained, so a one-off recompute can fix a wrong rate if ever needed.

**Seed (migration 0028), USD per 1M tokens** (from prior cost estimation):

| model | provider | input | output |
|---|---|---|---|
| `claude-haiku-4-5-20251001` | anthropic | 1.00 | 5.00 |
| `claude-sonnet-4-6` | anthropic | 3.00 | 15.00 |
| `gpt-5-mini` | openai | 0.125 | 1.00 |
| `gpt-5.4` | openai | 2.50 | 15.00 |
| `gpt-5.5` | openai | 5.00 | 30.00 |

---

## Section 2 — Capture Layer

**6 call sites**, all already returning a provider usage object:

- `repute-api/app/routers/generate_lead.py`: `_classify_with_claude`, `_classify_with_openai`,
  `_generate_meeting_summary`, `_generate_meeting_summary_with_openai`
- `repute-api/app/routers/pre_analysis.py`: the three Anthropic calls in the pre-analysis route
  (research summary, negative coverage, and keyword formatting)

**Principle — keep LLM helpers pure; the orchestrator persists.** The low-level helpers don't know
the analyst or job. Rather than threading that plumbing through them:

- Each helper returns `(result, usage)` instead of just `result`.
- The orchestrator that *has* context records it:
  - `_execute_generate_lead` already holds the `GenerateLeadJob` (`created_by_id`, `id`, `scanTier`)
    and a DB session → records one row per batch/call.
  - The pre-analysis route handler has `_analyst.id` (currently unused, prefixed `_`) → records the
    two calls with `job_id = NULL`, `operation = pre_analysis_*`.

**Two new helpers in `app/utils/llm.py`:**

- `extract_usage(response, provider) -> UsageTokens` — normalizes OpenAI vs Anthropic into
  `{input, output, reasoning, total}`. OpenAI: `output = completion_tokens` (includes reasoning);
  `reasoning = completion_tokens_details.reasoning_tokens` (guarded for None). Extends existing
  `summarize_usage`.
- `record_llm_usage(session, *, web_analyst_id, job_id, operation, provider, model, scan_tier, tokens)`
  — looks up the effective rate for `model` at now, computes `cost_usd`, inserts the row (with
  `pricing_id`).
- `get_effective_rate(session, model, at) -> llm_pricing | None` — greatest `effective_from ≤ at`.

**Robustness rules:**

1. **Record per call, not batched at job end** — a scan that crashes mid-pipeline still captures the
   cost actually incurred. Inserts commit per call.
2. **Recording never breaks a scan** — wrap inserts in try/except; on failure, log and continue.
3. **Streaming gotcha:** `_classify_with_claude` uses `client.messages.stream()`; read usage from the
   **final** message (`get_final_message().usage`), not mid-stream.

---

## Section 3 — Analytics API

New router `app/routers/usage.py`, mounted at `/api/v1/usage`. **All endpoints admin-only** via the
inline guard the codebase already uses: `if current_web_analyst.role != "admin": raise HTTPException(403)`.
Because cost is stored, all queries are plain `SUM`/`GROUP BY` over `llm_usage` filtered by `created_at`.

**Analytics** (accept `?from=&to=`, default last 30 days):

- `GET /usage/summary` — total `cost_usd`, total input/output tokens, total calls,
  `COUNT(DISTINCT job_id)` scans, plus cost grouped **by provider** and **by model/tier**.
- `GET /usage/by-analyst` — per-analyst: id, name, total cost, total tokens, scan count; sorted desc.
- `GET /usage/timeseries?bucket=day&tz=<IANA>` — cost + tokens per local day (or `week`).
  Buckets with `date_trunc('day', created_at AT TIME ZONE :tz)` so "daily" means the user's local day.

**Pricing management** (admin-only):

- `GET /usage/pricing` — current rate per model (latest `effective_from`).
- `POST /usage/pricing` — add a new effective-dated rate row (append-only).

Dates are UTC instants. The `(created_at)` / `(web_analyst_id)` indexes cover these queries.

---

## Section 4 — GINA Frontend

Add a **"Token Usage & Cost"** section to the existing admin-only
`src/app/dashboard/analytics/page.tsx`. No new route/guard (page already admin-gated).

**API client (`src/lib/api.ts`)** — new calls through the existing `request<T>()` helper
(bearer auth + refresh; direct to repute-api, not the generate-lead proxy):
`usage.summary`, `usage.byAnalyst`, `usage.timeseries`, `usage.pricing.list`, `usage.pricing.add`.

**Widgets** (reuse Recharts, already installed):

- Summary cards: total cost, total tokens, # scans, # calls (range).
- Cost trend `LineChart` (timeseries).
- Cost by model pie/bar (summary).
- Per-analyst accountability: sortable table + bar chart (by-analyst).
- Date-range filter (default last 30 days).
- Pricing editor: list current rates + "add new rate" form (append-only). Minimal.

**Timezone — frontend authoritative:**

1. Derive the browser zone once: `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. Date-range picker works in **local** time; convert boundaries to **UTC ISO instants** for
   `from`/`to` before calling the API.
3. Pass IANA `tz` to `timeseries` so the backend buckets by the user's local day.
4. Render every timestamp via `toLocaleString()` / `toLocaleDateString()` — never raw UTC strings.

Net: backend stores/reasons in UTC; the browser decides day boundaries and display.

---

## Section 5 — Migrations, Edge Cases, Testing & Rollout

**Migrations** (auto-applied by `prestart.py` → `alembic upgrade head`):

- `0027_create_llm_usage.py` — usage table + indexes.
- `0028_create_llm_pricing.py` — pricing table + seed rates.

**Edge cases:**

- **Going-forward only.** No backfill; UI notes "data since <date>".
- **Failed/partial scans still cost money** — per-call recording captures spend before a crash.
- **Pre-analysis** rows: `job_id = NULL`, `operation = pre_analysis_*`, attributed to `_analyst.id`.
- **Reasoning tokens** stored for visibility, not double-counted in cost.
- **Session/commit:** generate-lead background task reuses its async session; usage inserts commit
  per call so they survive a later pipeline failure.

**Testing** (implement first, then propose tests for review — no TDD):

- Unit: `extract_usage` (OpenAI w/ reasoning + Anthropic shapes), `get_effective_rate`,
  `record_llm_usage` (cost math).
- API: `summary` / `by-analyst` / `timeseries` aggregations incl. tz day-bucketing.
- Update existing tests for the `(result, usage)` return shape (`test_generate_lead_openai.py`,
  `test_llm_utils.py`).
- Verify: backend in Docker `reput_api` (pytest may need installing in-container);
  GINA via `pnpm exec tsc --noEmit` + `pnpm build` (no `lint:fix` in GINA).

**Suggested build order:**

1. Migrations + models
2. Capture layer + helpers (`extract_usage`, `get_effective_rate`, `record_llm_usage`)
3. Analytics + pricing endpoints (`usage.py`)
4. GINA Analytics section + API client
5. Tests at each checkpoint

## Open questions

- None blocking. Pricing seed values should be re-confirmed against live provider pricing at
  implementation time.
