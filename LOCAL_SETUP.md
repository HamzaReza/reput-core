# Local Setup

This repo has three services you are likely to run locally:

- `repute-api` on `http://localhost:8000`
- `RepuTrust-Web` on `http://localhost:3000`
- `GINA` on `http://localhost:3001`

`news-ai` is still marked work in progress and is not needed for a normal local setup.

## 1. What you need from the team

Ask for these secrets if you want the AI-powered lead scanning flows to work:

- `ANTHROPIC_API_KEY`
- `SERPER_API_KEY`
- `FIRECRAWL_API_KEY`

You do not need shared database credentials for a standard Docker-based local setup because the repo already provides local Postgres defaults.

## 2. Create local env files

If a file already exists locally, update it instead of overwriting it. From the repo root, create only the missing ones:

```powershell
if (!(Test-Path repute-api/.env)) { Copy-Item repute-api/.env.example repute-api/.env }
if (!(Test-Path RepuTrust-Web/.env.local)) { Copy-Item RepuTrust-Web/.env.example RepuTrust-Web/.env.local }
if (!(Test-Path GINA/.env.local) -and !(Test-Path GINA/.env)) { Copy-Item GINA/.env.example GINA/.env.local }
```

Then fill in the API keys above in each file that needs them.

Notes:

- `repute-api/.env` is used by Docker Compose for the backend container.
- `RepuTrust-Web/.env.local` is used by the customer-facing Next.js app.
- `GINA/.env.local` is used by the internal Next.js dashboard.

## 3. Start backend infrastructure

From the repo root:

```powershell
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5433` (mapped from the container's 5432 to avoid clashing with a locally installed Postgres)
- FastAPI on `http://localhost:8000`
- Swagger docs on `http://localhost:8000/docs`
- pgAdmin on `http://localhost:5050`

Default pgAdmin login:

- Email: `admin@reputtrust.com`
- Password: `admin123`

## 4. Install frontend dependencies

Use `pnpm` for both Next.js apps.

```powershell
cd RepuTrust-Web
pnpm install

cd ..\GINA
pnpm install
```

## 5. Run the frontends

Use separate terminals:

```powershell
cd RepuTrust-Web
pnpm dev
```

```powershell
cd GINA
pnpm dev -p 3001
```

## 6. First things to test

Customer portal:

- Open `http://localhost:3000`
- Confirm sign up and login can reach `http://localhost:8000/api/v1`

Agency dashboard:

- Open `http://localhost:3001`
- Register a web analyst if needed through the backend route or existing UI flow
- Test `Ealuminate` only after `ANTHROPIC_API_KEY` and `SERPER_API_KEY` are present

## 7. Helpful notes

- Local CORS defaults now include both `3000` and `3001`, so `GINA` should be able to talk to the backend without extra origin config.
- `FIRECRAWL_API_KEY` is recommended but not strictly required for every code path. Missing it will reduce scraping quality.
- `OPENAI_API_KEY` exists in backend config but is not currently used by the checked-in code.

## 8. Verification commands

These are the safest non-dev checks:

```powershell
cd RepuTrust-Web
pnpm build

cd ..\GINA
pnpm build
```

For the backend, once containers are up:

```powershell
Invoke-WebRequest http://localhost:8000/docs
```
