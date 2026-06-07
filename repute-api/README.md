# RepuTrust API

Python FastAPI backend with PostgreSQL for the RepuTrust reputation management platform.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.115 |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Validation | Pydantic v2 |
| Server | Uvicorn |
| AI | OpenAI SDK + Anthropic Claude SDK |

---

## Quick Start (Docker — recommended)

From the **project root** (`reput-projects/`):

```bash
docker compose up --build
```

Services:
- **API** → http://localhost:8000
- **Docs** → http://localhost:8000/docs
- **PostgreSQL** → localhost:5432
- **pgAdmin 4** → http://localhost:5050

---

## Quick Start (Local)

### 1. Prerequisites

- Python 3.12+
- PostgreSQL 16 running locally (or via Docker)

### 2. Start PostgreSQL only

```bash
# From project root
docker compose up db -d
```

### 3. Set up the Python environment

```bash
cd repute-api
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env if your DB credentials differ
```

### 5. Run migrations (optional — app auto-creates tables on startup)

```bash
alembic upgrade head
```

### 6. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000 with interactive docs at http://localhost:8000/docs.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://reput_user:reput_pass@localhost:5432/reput_db` |
| `JWT_SECRET` | Secret key for signing JWTs | — (required) |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes | `1440` (24 h) |
| `DEBUG` | Enable debug mode | `false` |
| `ALLOWED_ORIGINS` | JSON array of allowed CORS origins | `["http://localhost:3000"]` |
| `OPENAI_API_KEY` | Required for `standard` scan tier using `gpt-5-mini` high reasoning | — |
| `ANTHROPIC_API_KEY` | Required for non-standard tiers using Claude | — |
| `SERPER_API_KEY` | Required for generate-lead search | — |
| `FIRECRAWL_API_KEY` | Required for generate-lead page scraping | — |

Generate a secure JWT secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account → returns JWT |
| POST | `/login` | Email + password → returns JWT |
| GET | `/me` | Current user info (requires token) |

### Users — `/api/v1/users`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get own user object |
| PATCH | `/me` | Update name / phone |
| GET | `/me/profile` | Get extended profile |
| PUT | `/me/profile` | Create / update profile |

### Reputation — `/api/v1/reputation`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scan` | Trigger new reputation scan |
| GET | `/latest` | Most recent scan result |
| GET | `/history` | Paginated scan history |

### Quotes — `/api/v1/quotes`

| Method | Path | Description |
|--------|------|-------------|
| POST | `` | Submit quote (guest or authenticated) |
| POST | `/authenticated` | Submit quote linked to account |
| GET | `/my` | List own quote requests |

### Clients — `/api/v1/clients`

| Method | Path | Description |
|--------|------|-------------|
| GET | `` | List all clients (filterable by stage) |
| POST | `` | Create a new client |
| GET | `/{id}` | Get single client with full history |
| PATCH | `/{id}` | Update client fields |

### Leads — `/api/v1/leads`

| Method | Path | Description |
|--------|------|-------------|
| GET | `` | List leads |
| POST | `` | Create lead |

### Dashboard — `/api/v1/dashboard`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | KPI counts (clients, scans, negative links, etc.) |
| GET | `/activity` | Recent activity feed |
| GET | `/charts` | Chart data for dashboard graphs |

### Generate Lead — `/api/v1/generate-lead`

| Method | Path | Description |
|--------|------|-------------|
| POST | `` | Run full AI lead scan — calls Serper + Firecrawl, then OpenAI for `standard` tier or Claude for other tiers |

### Pre-Analysis — `/api/v1/pre-analysis`

| Method | Path | Description |
|--------|------|-------------|
| POST | `` | Research and disambiguate a target before full scan; `standard` tier uses OpenAI web search |

### Web Analysts — `/api/v1/web-analysts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `` | List analyst profiles |
| POST | `` | Create analyst profile |
| GET | `/{id}` | Get single analyst |
| PATCH | `/{id}` | Update analyst |

### Contracts — `/api/v1/contracts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `` | List contracts |
| POST | `` | Create contract |

### Meetings — `/api/v1/meetings`

| Method | Path | Description |
|--------|------|-------------|
| GET | `` | List meetings |
| POST | `` | Schedule meeting |

### Feedback — `/api/v1/feedback`

| Method | Path | Description |
|--------|------|-------------|
| POST | `` | Submit feedback entry |
| GET | `` | List feedback (admin) |

---

## Connecting the Next.js Frontend

Add to `RepuTrust-Web/.env.local` or `GINA/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Database Schema

```
users
  id · email · password_hash · name · phone
  is_active · is_verified · created_at · updated_at

user_profiles
  id · user_id (FK) · avatar_url · linkedin_url
  bio · company · job_title · keywords (JSONB)
  notification_email · notification_sms · updated_at

reputation_scans
  id · user_id (FK) · score · risk_level
  results (JSONB) · summary (JSONB) · scanned_at

quote_requests
  id · user_id (FK, nullable) · name · email · phone
  plan_type · details (JSONB) · message · status · created_at

client_events
  id · user_id (FK) · client_id · event_type
  status · result (JSONB) · created_at
```
