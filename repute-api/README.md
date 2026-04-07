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
| POST | `` | Submit quote (guest or auth) |
| POST | `/authenticated` | Submit quote linked to account |
| GET | `/my` | List own quote requests |

---

## Connecting the Next.js Frontend

Add to `RepuTrust-Web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Then replace `localStorage` mock calls with `fetch` calls to the above URL.

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
```

---

## Generating a Secure JWT Secret

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste the output as `JWT_SECRET` in `.env`.
