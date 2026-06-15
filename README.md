# RepuTrust Platform

RepuTrust is an AI-powered reputation management platform. It scans the web for articles and links about a person or company, classifies them using Claude AI into four risk categories (Good / Mediocre / Poor / Negative), and generates a 0–100 reputation score. The platform serves two audiences: end-customers through a public portal (RepuTrust-Web) and agency operators through an internal dashboard (GINA).

---

## Services

| Service | Description | Port | Tech |
|---------|-------------|------|------|
| [RepuTrust-Web](./RepuTrust-Web/README.md) | Public-facing customer portal | 3000 | Next.js 16, React 19, TypeScript |
| [GINA](./GINA/README.md) | Internal agency dashboard | 3001 | Next.js 16, Recharts, react-simple-maps |
| [repute-api](./repute-api/README.md) | Shared REST API + PostgreSQL | 8000 | FastAPI, SQLAlchemy 2, PostgreSQL 16 |
| [news-ai](./news-ai/README.md) | Experimental news analysis service | — | WIP |

---

## Architecture

```
Browser
  ├── RepuTrust-Web (:3000)  ──────┐
  │   (public portal)              ├──▶  repute-api (:8000)  ──▶  PostgreSQL (:5432)
  └── GINA (:3001)  ───────────────┘
      (internal dashboard)
```

Both frontends also call third-party APIs directly from their Next.js API routes:

```
Next.js API route  ──▶  Serper (Google Search)
                   ──▶  Firecrawl (web scraping)
                   ──▶  Anthropic Claude (AI classification)
```

---

## Quick Start (Docker — full stack)

From this directory:

```bash
docker compose up --build
```

This starts:
- **PostgreSQL 16** on `localhost:5433` (container port 5432, remapped to avoid clashing with a locally installed Postgres)
- **repute-api** on `http://localhost:8000` (API docs at `/docs`)
- **pgAdmin 4** on `http://localhost:5050`

Start the frontends separately (each in its own terminal):

```bash
# RepuTrust-Web (public portal)
cd RepuTrust-Web && npm install && npm run dev   # → http://localhost:3000

# GINA (internal dashboard)
cd GINA && npm install && npm run dev            # → http://localhost:3001
```

---

## Environment Files

Each service has its own `.env` file. Copy the example before running:

| Service | Command |
|---------|---------|
| RepuTrust-Web | `cp RepuTrust-Web/.env.example RepuTrust-Web/.env.local` |
| GINA | `cp GINA/.env.example GINA/.env.local` |
| repute-api | `cp repute-api/.env.example repute-api/.env` |

See each sub-project's README for the full list of required variables.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 6, Tailwind CSS 4 |
| Backend | FastAPI 0.115, SQLAlchemy 2 (async), Alembic, Uvicorn |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude SDK |
| Search | Serper (Google Search API) |
| Scraping | Firecrawl |
| Auth | JWT + bcrypt |
| Deployment | Docker Compose (infra) + Vercel (frontends) |
| Charts | Recharts, react-simple-maps |
| Export | html2canvas + jsPDF, xlsx |

---

## Reputation Scoring

Links are classified into four categories, and a 0–100 score is derived from negative link count:

| Score | Band | Negative Links |
|-------|------|----------------|
| 86–100 | Good | 0 |
| 61–85 | Mediocre | 1–5 |
| 26–60 | Poor | 6–10 |
| 0–25 | Negative | 11+ |

Positive links contribute a small bonus (up to +5 points).

---

## Project Structure

```
reput-projects/
├── RepuTrust-Web/        # Public customer portal (Next.js)
├── GINA/                 # Internal agency dashboard (Next.js)
├── repute-api/           # REST API + database (FastAPI)
├── news-ai/              # Experimental news service (WIP)
├── docker-compose.yml    # Multi-service orchestration
└── GINA_Link_Classification.md  # AI classification rules & prompts
```
