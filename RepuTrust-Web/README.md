# RepuTrust Web

Public-facing customer portal for the RepuTrust reputation management platform. Users can register, view their reputation score, request a service quote, and manage their account settings.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router) |
| Language | TypeScript 6.0.2 |
| UI | React 19.2.4 |
| Styling | Tailwind CSS 4 |
| AI | Anthropic Claude SDK |
| Auth | JWT (via repute-api) |
| OAuth | LinkedIn (planned) |
| Payments | Stripe |
| Email | SMTP (nodemailer) |
| Analytics | Vercel Speed Insights |

### Brand Colors

| Name | Hex |
|------|-----|
| Primary (Teal) | `#4ECDC4` |
| Secondary (Dark Blue) | `#2D3E50` |
| Success | `#27AE60` |
| Warning | `#F39C12` |
| Error | `#E74C3C` |

---

## Pages

| Route | Name | Purpose |
|-------|------|---------|
| `/` | Home | Landing page — hero, features, pricing |
| `/auth` | Sign Up / Sign In | User registration and login |
| `/login` | Login | Alternative login entry point |
| `/dashboard` | Dashboard | Reputation score, scan history, profile |
| `/quote` | Get a Quote | Service request form |
| `/quote/request` | Quote Status | Track submitted quote request |
| `/settings` | Settings | Account preferences, notifications |
| `/meeting` | Book a Meeting | Scheduling interface |
| `/lead` | Lead Generation | AI-powered lead research form |
| `/feedback-admin` | Admin Feedback | Internal feedback management |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate-lead` | POST | Runs AI lead scan (Serper + Firecrawl + Claude) |
| `/api/negative-links` | POST | Fetches negative links for a given person |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_LINKEDIN_CLIENT_ID` | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app client secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_USER` | Email sender address |
| `SMTP_PASSWORD` | Email sender password |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `JWT_SECRET` | JWT signing secret |
| `NODE_ENV` | `development` or `production` |

---

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
├── app/                   # Next.js App Router pages + API routes
│   ├── page.tsx           # Home / landing page
│   ├── auth/              # Sign-up / sign-in
│   ├── dashboard/         # User dashboard
│   ├── quote/             # Quote request + status
│   ├── settings/          # User settings
│   ├── lead/              # Lead generation form
│   ├── meeting/           # Meeting scheduler
│   └── api/               # Next.js API routes
│       ├── generate-lead/ # AI lead scan
│       └── negative-links/# Negative link lookup
│
├── components/            # Reusable React components
│   ├── common/            # Header, Hero, Features
│   ├── auth/              # Auth form components
│   ├── dashboard/         # Dashboard widgets
│   ├── quote/             # Quote form components
│   └── settings/          # Settings panels
│
├── lib/                   # Utilities (API client, country data, etc.)
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions

public/
└── logo.svg               # RepuTrust logo
```

---

## Connecting to the Backend

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point at the running repute-api instance:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

See [repute-api README](../repute-api/README.md) for backend setup instructions.
