# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RepuTrust is an AI-powered reputation-management platform. It scans the web for articles/links about a person or company, classifies each link with an LLM into four risk bands (Good / Mediocre / Poor / Negative), and produces a 0–100 reputation score. Two audiences are served from one shared backend: end-customers via a public portal (RepuTrust-Web) and agency operators via an internal dashboard (GINA).

Scoring bands: 86–100 Good (0 negative links), 61–85 Mediocre (1–5), 26–60 Poor (6–10), 0–25 Negative (11+); positive links add up to +5 bonus. The classification spec lives in `GINA_Link_Classification.md`.

## Monorepo layout

| Dir | What | Port | Stack | Status |
|---|---|---|---|---|
| `repute-api/` | Shared REST API + Postgres | 8000 | FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16 | **Active core** |
| `GINA/` | Internal agency dashboard (analysts) | 3001 | Next.js 16, React 19, TS, Tailwind 4 | **Active core** |
| `RepuTrust-Web/` | Public customer portal | 3000 | Next.js 16, React 19, TS, Tailwind 4 | Lower activity |
| `news-ai/` | Experimental news-analysis service | — | WIP (README only, no code yet) | Stub/placeholder |

Each active sub-project has its own `CLAUDE.md` — **read it before working there**: `repute-api/CLAUDE.md`, `GINA/CLAUDE.md`.

## How the pieces fit

- Both frontends call **repute-api** at `:8000` under base path **`/api/v1`** (frontends configure it via `NEXT_PUBLIC_API_URL`).
- repute-api talks to **PostgreSQL** on `:5432`.
- Frontends also call some third-party APIs **directly from their own Next.js route handlers** (Serper search, Firecrawl scraping, Anthropic/OpenAI) — not only through repute-api.
- repute-api routes LLM calls across **both Anthropic and OpenAI** depending on the scan tier (see `repute-api/CLAUDE.md`).

## Local development

The backend stack runs in Docker from the repo root; frontends run on the host, one terminal each.

```bash
docker compose up -d --build      # Postgres (:5432) + repute-api (:8000) + pgAdmin (:5050)
docker compose restart api        # REQUIRED after any repute-api code edit (uvicorn has no --reload)
docker compose logs -f api

cd GINA && pnpm install && pnpm build           # verify with build, not `pnpm dev`
cd RepuTrust-Web && pnpm install && pnpm build
```

- Container names: `reput_api`, `reput_db`, `reput_pgadmin`. pgAdmin at `:5050` (`admin@reputtrust.com` / `admin123`).
- DB host differs by context: `db` from inside Docker, `localhost:5432` from the host.
- Each service has its own env file — copy from the example: `repute-api/.env`, `GINA/.env.local`, `RepuTrust-Web/.env.local`.

## Repo-wide conventions

- **Package manager: pnpm** for all JS projects (never npm, despite the README's `npm` examples). Verify changes with `pnpm build` / `pnpm exec tsc --noEmit`, not `pnpm dev`.
- **Next.js 16 is non-standard.** Both frontends pin Next 16.2.2, which has breaking changes vs older Next; `RepuTrust-Web/AGENTS.md` warns to consult `node_modules/next/dist/docs/` before frontend work. The same caution applies to GINA.
- **Branching:** feature work on `feat/*` / `fix/*` / `chore/*` branches → PR. `main` is primary; `develop` is the integration branch.
- **Planning/design docs live in `docs/plans/`**, named `YYYY-MM-DD-<topic>.md`, one per feature.

## Code Comments
- Keep comments 1–2 lines; hard max 3. Never write multi-line comment blocks.
- Only comment the non-obvious WHY — skip anything a reader can infer from the code.
