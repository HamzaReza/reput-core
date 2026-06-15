# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`repute-api` is the FastAPI + async SQLAlchemy backend for the RepuTrust platform (see the monorepo root `CLAUDE.md`). Python 3.12, PostgreSQL 16, deployed to Railway via Docker. It is the single backend both frontends (GINA, RepuTrust-Web) call.

## Commands

Everything runs inside the Docker container **`reput_api`** (dependencies live only there; WORKDIR `/app`). Start the stack from the **monorepo root** where `docker-compose.yml` lives.

```bash
docker compose up -d --build          # start db + api + pgadmin
docker compose restart api            # REQUIRED after ANY code edit — uvicorn runs WITHOUT --reload
docker compose logs -f api
```

Source is bind-mounted into the container, but the running uvicorn process does **not** pick up edits until you restart.

```bash
# Tests — stdlib `unittest`, run via pytest. Skip the one host-only file (see gotcha):
docker compose exec api python -m pytest tests/ -q --ignore=tests/test_generate_lead_name_filter.py   # 53 pass

# Single file / single test:
docker compose exec api python -m pytest tests/test_llm_utils.py -q
docker compose exec api python -m pytest tests/test_llm_utils.py::ResolveProviderTests::test_standard_uses_openai -q

# Migrations — also auto-run as `alembic upgrade head` on every container start:
docker compose exec api alembic upgrade head      # head = 0028
docker compose exec api alembic current
docker compose exec api alembic revision -m "msg" # then renumber the file to the next 00NN
```

- **No linter / formatter / type checker is configured** (no ruff/black/mypy). The global `pnpm lint:fix` rule is JS-only and does not apply here.
- Package manager is plain **pip** (`requirements.txt`) — not uv or poetry.
- `tests/test_generate_lead_name_filter.py` hardcodes a Windows host path and **fails inside the container** — always `--ignore` it there (or run it on the host).

## Architecture — the big picture

Read first: `app/main.py`, `app/database.py`, `app/config.py`, `app/utils/{auth,llm,usage_tracking}.py`, `app/models/lead.py`, `app/routers/generate_lead.py`. Two reference docs live in `context/`: **`scan-pipeline.md`** — the core reputation-scan flow end-to-end (pre-analysis + generate-lead, scoring, classification, exports), and **`architecture.md`** — broader backend reference (router catalog, LLM tier/pricing table, data-model relationships).

### Dual authentication — two principal types, one token format
There are **two distinct kinds of authenticated user**, both handled in `app/utils/auth.py`:
- `User` (`users` table) — the end-customer (plans, pro trials, reputation scans).
- `WebAnalyst` (`web_analysts` table) — internal staff/operator, with `role` = `"analyst"` | `"admin"`.

`get_current_user` and `get_current_web_analyst` are the two FastAPI guards. **Both token types share one JWT secret and one format** — the only thing distinguishing them is which table the `sub` UUID resolves in; there is no principal-type claim. There is **no central role guard** — admin checks are inline per handler (`if current_web_analyst.role != "admin": raise HTTPException(403)`). GINA uses the WebAnalyst flow exclusively. The first admin is bootstrapped via the unauthenticated `POST /auth/register-web-analyst`.

### Dual schema bootstrap (Alembic + create_all) — and the model-import gotcha
Two independent mechanisms build the schema, both on every startup:
1. **Alembic** (`alembic upgrade head`, in the Dockerfile CMD) — the authoritative path.
2. **`Base.metadata.create_all`** (in the FastAPI lifespan, with a 30×/2s DB-wait retry) — bootstraps a fresh local DB; a no-op once Alembic has built the schema (`create_all` never ALTERs existing tables).

`create_all` only sees a model whose module has been **imported**, and model imports are split inconsistently across `app/models/__init__.py` and `alembic/env.py` (e.g. `Client`, `Feedback`, `GenerateLeadJob` get registered only transitively via router imports). **When you add a model: add its import to BOTH `app/models/__init__.py` AND `alembic/env.py`, and write a hand-numbered migration.** Migrations are sequential strings `0001`…`0028` (not hashes). Data-seeding migrations (e.g. `0027` seeds `llm_pricing`) run **only** via Alembic — so a `create_all`-only local DB has empty pricing and all costs compute to $0.

### LLM tier routing + usage tracking
`app/utils/llm.py` is the single source of truth for model selection. `resolve_provider(tier)` maps 5 scan tiers (`basic / standard / advanced / pro / max`) to Anthropic or OpenAI models. **Pre-analysis uses a deliberately different mapping** (`resolve_pre_analysis_provider`, Claude-only) than lead generation does for the same tier. `app/utils/usage_tracking.py` records every billable call into `llm_usage`, snapshotting `cost_usd` at write time from the temporal `llm_pricing` table; it uses its **own** session (never the request's) and **never raises**, so a tracking failure can't break or roll back the scan it measures. Each row is attributed to a `WebAnalyst` and optionally a `job_id` (NULL for synchronous pre-analysis).

### Async background jobs (generate_lead)
`POST /generate-lead` inserts a `GenerateLeadJob` row, fires `asyncio.create_task(...)`, and returns a `job_id` immediately; clients poll `GET /generate-lead/{job_id}` and can `DELETE` to cancel (ownership-checked). In-flight tasks are tracked in **module-level in-memory dicts**, so this design **only works as a single uvicorn process (no `--workers`)**. The whole pipeline (Serper search → name/company filtering → Firecrawl scrape → LLM classification → scoring → optional meeting summary) lives in `app/routers/generate_lead.py` (~2000 lines). Full end-to-end flow and domain rules: `context/scan-pipeline.md`.

### Other things to know
- **No services layer** — business logic lives in routers; `generate_lead.py` and `pre_analysis.py` are large monoliths holding prompt builders, provider calls, and parsers.
- **Schemas are inconsistent** — `app/schemas/` covers only the older routers; newer ones (`generate_lead`, `pre_analysis`, `usage`, `clients`, `web_analysts`, `leads`) define request/response models inline and return plain `dict`s, so `app/schemas/` is not a reliable index of the API surface.
- All routers mount under **`/api/v1`**; `GET /health` is Railway's healthcheck.
- **Config (`app/config.py`):** `ALLOWED_ORIGINS` is parsed from a raw string, but CORS origins are **also** added in `main.py` (Vercel previews always; localhost/ngrok when `DEBUG`) — editing the env list alone won't remove them. `DATABASE_URL` is normalized to `postgresql+asyncpg://`; TLS is auto-disabled for local and Railway-private (`*.internal`) hosts. **`.env.example` is incomplete** — it omits the LLM/search keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SERPER_API_KEY`, `FIRECRAWL_API_KEY`).

## Code comments
Keep comments 1–2 lines (hard max 3); comment only the non-obvious WHY.
