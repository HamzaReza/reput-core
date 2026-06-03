# News AI

Experimental service for AI-powered news ingestion and analysis. Intended to continuously monitor news sources for reputation-relevant signals and feed them into the RepuTrust platform.

**Status: Work in progress — not yet active.**

---

## Intended Purpose

- Ingest news articles from RSS feeds and news APIs
- Use Claude AI to classify articles by relevance and sentiment for a given entity
- Surface new negative or positive signals to the RepuTrust dashboard in near-real-time
- Complement the on-demand Ealuminate scans with continuous background monitoring

---

## Infrastructure

When fully wired up, this service will share the same PostgreSQL instance as repute-api (running via `docker-compose.yml` at the project root).

---

## Running the Full Stack

Start all infrastructure (including the shared database) from the project root:

```bash
docker compose up --build
```

See the [root README](../README.md) for the complete architecture.
