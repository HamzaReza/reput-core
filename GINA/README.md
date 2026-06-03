# GINA — Internal Dashboard

GINA is the internal operations dashboard for RepuTrust agency teams. It provides advanced analytics, a full CRM for client management, and the Ealuminate lead generation tool — a multi-step pipeline that uses Claude AI, Serper, and Firecrawl to research and classify reputation links for any person or company.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router) |
| Language | TypeScript 6.0.2 |
| UI | React 19.2.4 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts (line, bar, pie) |
| Maps | react-simple-maps |
| AI | Anthropic Claude SDK |
| Search | Serper (Google Search API) |
| Scraping | Firecrawl |
| Export | html2canvas + jsPDF, xlsx |
| Notifications | react-toastify |
| Flags | flag-icons |

---

## Pages

| Route | Name | Purpose |
|-------|------|---------|
| `/` | Landing | Unauthenticated home / login redirect |
| `/login` | Login | Dashboard authentication |
| `/dashboard` | Dashboard | KPI stats, charts, recent scans, team activity |
| `/dashboard/clients` | Clients | CRM table — all clients with filtering and stage tabs |
| `/dashboard/clients/[id]` | Client Detail | Full history and scan results for a single client |
| `/dashboard/leads` | Leads | Lead list and management |
| `/dashboard/ealuminate` | Ealuminate | AI-powered lead scan pipeline |
| `/dashboard/web-analysts` | Web Analysts | Team analyst profiles |
| `/dashboard/analytics` | Analytics | Reporting and trend charts |
| `/dashboard/users` | Users | User account management |
| `/dashboard/settings` | Settings | Dashboard configuration |

---

## Ealuminate Pipeline

Ealuminate is the core lead generation tool. It runs in three steps:

```
1. Form Input
   └── Name, keywords, target countries, background context

2. Pre-Analysis  →  /api/pre-analysis
   └── Claude AI researches context to disambiguate the target
       (handles homonyms, identifies relevant profiles)

3. Lead Scan  →  /api/generate-lead
   └── Serper fetches articles from Google
   └── Firecrawl extracts article content
   └── Claude classifies each link (Good / Mediocre / Poor / Negative)
   └── Reputation score calculated (0–100)

4. Results + Export
   └── Categorized link list with metadata
   └── Export to PDF or Excel
```

### Reputation Scoring

| Score | Band | Negative Links |
|-------|------|----------------|
| 86–100 | Good | 0 |
| 61–85 | Mediocre | 1–5 |
| 26–60 | Poor | 6–10 |
| 0–25 | Negative | 11+ |

Positive links add a small bonus (up to +5 points).

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate-lead` | POST | Full lead scan (Serper + Firecrawl + Claude classification) |
| `/api/pre-analysis` | POST | Pre-search research and homonym disambiguation |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI |
| `SERPER_API_KEY` | Serper API key for Google search |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web scraping |
| `NODE_ENV` | `development` or `production` |

---

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser (use port 3001 if RepuTrust-Web is already on 3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Folder Structure

```
src/
├── app/
│   ├── page.tsx                         # Landing / redirect
│   ├── login/                           # Login page
│   └── dashboard/
│       ├── layout.tsx                   # Sidebar + top bar layout
│       ├── page.tsx                     # Main dashboard
│       ├── clients/                     # CRM table + detail pages
│       ├── leads/                       # Lead management
│       ├── ealuminate/                  # Lead generation tool
│       │   └── _components/
│       │       ├── EaluminateFormPanel.tsx
│       │       ├── EaluminatePipelinePanel.tsx
│       │       ├── EaluminateResultsPanel.tsx
│       │       └── ExportFieldsModal.tsx
│       ├── web-analysts/                # Analyst profiles
│       ├── analytics/                   # Analytics/reporting
│       ├── users/                       # User management
│       └── settings/                    # Settings
│       └── _components/                 # Shared dashboard components
│           ├── StatsRow.tsx
│           ├── TopBar.tsx
│           ├── BarChartCard.tsx
│           ├── LineChartCard.tsx
│           └── RecentScans.tsx
│
└── app/api/
    ├── generate-lead/                   # Lead scan route
    └── pre-analysis/                    # Pre-search route

public/                                  # Static assets
```

---

## Connecting to the Backend

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point at the running repute-api instance:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

See [repute-api README](../repute-api/README.md) for backend setup instructions.
