# repute-api — Deep Architecture Reference

Companion to `repute-api/CLAUDE.md`. This holds the verbose, per-subsystem reference you consult when working on a specific area — not the every-session essentials (those are in CLAUDE.md).

## Router catalog (all under `/api/v1`)

| Router (`app/routers/`) | Prefix | Auth | Purpose |
|---|---|---|---|
| `auth.py` | `/auth` | mixed | Dual login/register (User + WebAnalyst), refresh, `/me` |
| `users.py` | `/users` | User | self profile CRUD, `start-trial` (pro trial) |
| `reputation.py` | `/reputation` | User | scan create/patch, latest, history |
| `quotes.py` | `/quotes` | mixed | public + authenticated quote, `/my` |
| `contracts.py` | `/contracts` | User | create, `/my` |
| `meetings.py` | `/meetings` | mixed | `POST /webhook` (cal.com, unauthenticated) + `/my` |
| `feedback.py` | `/feedback` | none | create + list (open, no auth dependency) |
| `dashboard.py` | `/dashboard` | WebAnalyst | stats, score-distribution, charts, funnel, activity-by-region |
| `leads.py` | `/leads` | WebAnalyst | CRUD over `LeadGenerated` |
| `web_analysts.py` | `/web-analysts` | WebAnalyst (admin for create/list/delete/block) | staff management, self password change |
| `clients.py` | `/clients` | WebAnalyst | upsert, events, assign, can-scan, list/get/delete |
| `pre_analysis.py` | `/pre-analysis` | WebAnalyst | **synchronous** Claude pre-analysis |
| `generate_lead.py` | `/generate-lead` | WebAnalyst | **async background** lead-gen pipeline |
| `usage.py` | `/usage` | WebAnalyst + admin | summary, by-analyst, timeseries, pricing GET/POST |

## LLM tier routing (`app/utils/llm.py`)

`resolve_provider(tier)` — used by **lead generation**:

| tier | provider | model | reasoning |
|---|---|---|---|
| `basic` | anthropic | `claude-haiku-4-5-20251001` | — |
| `standard` | openai | `gpt-5-mini` | high |
| `advanced` | anthropic | `claude-sonnet-4-6` | — |
| `pro` | openai | `gpt-5.4` | medium |
| `max` | openai | `gpt-5.5` | high |

Unknown tier falls back to `basic` (Haiku).

`resolve_pre_analysis_provider(tier)` — **pre-analysis is Claude-only** (decision 2026-06-08, for speed): `advanced` → Sonnet, everything else (incl. `standard`) → Haiku. So pre-analysis on `standard` uses a *different* provider than lead-gen on `standard`.

Provider abstraction helpers in the same file: `extract_openai_text()` (OpenAI Responses output, tolerates reasoning-only items), `as_text_message()` (adapts an OpenAI result into the minimal Anthropic message shape the pre-analysis pipeline consumes — note `stop_reason` then carries OpenAI `status`, not Anthropic `end_turn`), `is_transient_openai_error()` (retry predicate; an "incomplete"/token-budget response is NOT retried), `safe_error_message()` (scrubs API keys/bearer tokens/URLs before persisting/returning).

## Usage tracking (`app/utils/usage_tracking.py`, tables `llm_pricing` / `llm_usage`)

- `extract_usage(usage)` → `UsageTokens(input, output, reasoning, total)`. **Reasoning tokens are already inside `output`** for both providers, so reasoning is informational only — `compute_cost` bills input + output.
- Pricing is **temporal/append-only**: `LLMPricing` rows carry `effective_from`; `get_effective_rate(model, at)` picks the greatest `effective_from <= at`. Rates are USD per **1M tokens**.
- `record_llm_usage(...)`: own `AsyncSessionLocal` session, never raises, snapshots `cost_usd` + `pricing_id` at write time (no recompute on read), no-ops if `web_analyst_id` or `usage` is None.
- **Five tracked `operation` values:** `classification`, `meeting_summary` (in `generate_lead.py`); `pre_analysis_research`, `pre_analysis_negative`, `pre_analysis_keywords` (in `pre_analysis.py`).
- Seed rates (migration `0027`, all `effective_from=2026-06-13`): Haiku 1.00/5.00, Sonnet 3.00/15.00, gpt-5-mini 0.125/1.00, gpt-5.4 2.50/15.00, gpt-5.5 5.00/30.00 (input/output per 1M).

## Data model (`app/models/`)

Two principal types (the heart of the dual-auth design):
- `User` (`user.py`) — `email`, `password_hash`, `plan` (free/pro), `pro_trial_expires_at`, `scan_depth` enum. 1:1 `UserProfile`; 1:N `ReputationScan`, `QuoteRequest`, `Contract`, `Meeting` (cascade delete-orphan).
- `WebAnalyst` (`lead.py`) — `role` (analyst/admin), `is_blocked`. No ORM relationships; other tables reference it by raw FK.

Other entities: `LeadGenerated` (completed scan record, `links`/`summary` JSONB, `score`), `GenerateLeadJob` (async job row: `status`, `current_step`, `result` JSONB, `error`, `created_by_id`), `Client` + `ClientEvent` (CRM record + append-only event log, FK→web_analysts), `LLMPricing` + `LLMUsage` (usage.py), `Contract`, `ReputationScan`, `QuoteRequest`, `Meeting` (cal.com bookings keyed by `cal_booking_uid`), `Feedback`. Heavy use of `postgresql.UUID` PKs and `JSONB` columns.

`app/database.py`: `get_db()` dependency yields a session, **auto-commits on success / rolls back on exception** — handlers that only `flush()` rely on this. Engine: `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`; `_asyncpg_connect_args()` enables TLS only for public managed Postgres (skips local + `*.internal`/`*.local`).

## generate_lead async pipeline

The full reputation-scan pipeline — pre-analysis + generate-lead, frontend trigger through scoring and exports, plus the domain rules (scoring formula, risk→label classification, name/company filtering) — is documented end-to-end in **`context/scan-pipeline.md`**. Job-lifecycle basics and the single-process constraint are also summarized in `CLAUDE.md`.

## Config & deployment

- `app/config.py`: pydantic-settings `Settings`, cached via `@lru_cache get_settings()`. `allowed_origins_raw` is a `str` field (a `list[str]` field makes pydantic-settings `json.loads` and crash on plain comma text), parsed by `_split_allowed_origins` (JSON array or comma-separated).
- Env keys actually used: `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_MINUTES` (default 30d), `DEBUG`, `ALLOWED_ORIGINS`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SERPER_API_KEY`, `FIRECRAWL_API_KEY`.
- Deploy: Railway via `Dockerfile` (python:3.12-slim) + `railway.toml` (healthcheck `/health`, restart on_failure max 3). CMD honors Railway's injected `$PORT` and runs `alembic upgrade head` before boot. `requirements.txt` pins `bcrypt==4.0.1` deliberately (4.1+ breaks passlib).

## Tests (`tests/`, 6 files, stdlib `unittest`)

No `conftest.py`, no test DB — all pure-unit. Several `exec` a contiguous source slice from `generate_lead.py` with deps stubbed (that module can't be imported standalone). Coverage: `test_llm_utils.py` (tier mapping, OpenAI extraction, transient errors, secret redaction), `test_usage_tracking.py` (`extract_usage` + `compute_cost`), `test_usage_endpoints.py` (`_parse_range`, `_require_admin`), `test_refresh_web_analyst.py` (JWT refresh create/decode/guards), `test_generate_lead_openai.py` (prompt build, classification parse, retry), `test_generate_lead_name_filter.py` (name/company filtering — **host-only, fails in container**).
