# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`GINA` is the internal agency dashboard for the RepuTrust platform (see the monorepo root `CLAUDE.md`) — used by **web analysts**, not end-customers. Next.js 16.2.2 (App Router), React 19, TypeScript 6, Tailwind CSS v4. It is the frontend for the sibling `repute-api` backend.

## Commands

Use **pnpm** (never npm).

```bash
pnpm install
pnpm build               # verify changes with this (do NOT use `pnpm dev`)
pnpm exec tsc --noEmit   # type-check (tsconfig has noEmit)
pnpm lint                # eslint (flat config)
pnpm lint -- --fix       # eslint --fix — there is NO `lint:fix` script
```

- **No tests exist** (no vitest/jest/playwright). Verify with `pnpm build` + `pnpm exec tsc --noEmit`.
- **Next.js 16 is non-standard** — it has breaking changes vs older Next/training data. When unsure about a framework API, consult `node_modules/next/dist/docs/` (the sibling `RepuTrust-Web/AGENTS.md` documents this caution for the same Next version).

## Architecture — the big picture

- **App Router under `src/`** (path alias `@/*` → `src/*`). One route group `/dashboard/*` (overview, `clients[/[id]]`, `leads`, `ealuminate`, `analytics`, `web-analysts`, `users`, `settings`) plus `/login`. No `(group)` folders.
- **`src/app/dashboard/ealuminate/page.tsx` is the heart of the product** — a ~2000-line client component orchestrating the research/scan pipeline and result exports (PDF/Excel). The scan payload is built here, not in `api.ts`. The end-to-end scan flow (frontend + backend) and domain rules are documented in `repute-api/context/scan-pipeline.md`.
- **Client-component-first.** Almost every `page.tsx` and component begins with `"use client"` and fetches data in `useEffect`. The only server code is the root layout and the two proxy route handlers under `src/app/api/`. No `revalidate`/`runtime` usage.

### Auth & roles (client-side only)
- All auth logic lives in **`src/lib/api.ts`**. GINA uses the **WebAnalyst flow only** (`POST /auth/login-web-analyst`); the regular end-user `login`/`register` functions exist but are unused.
- Tokens are stored in **localStorage** (`reput_token`, `reput_refresh_token`, `reput_user`, `reput_name`) — not cookies. The `request()` wrapper auto-refreshes on 401 (single-flight) and redirects to `/login` on failure.
- **`getRole()` returns `"admin" | "analyst" | null`** (hard-typed to those two); `isAdmin()` gates admin pages.
- **No `middleware.ts`** — route protection is purely client-side: `dashboard/layout.tsx` redirects when there's no token; admin pages call `if (!isAdmin()) router.replace("/dashboard")`; the Sidebar hides `adminOnly` nav. **All gating is cosmetic — real enforcement is in repute-api.**
- Components re-sync auth state by dispatching/listening for the custom `window` event `"reput-auth-change"`.

### API layer
- **`src/lib/api.ts` (~900 lines) is the single hub and the source of all frontend types** — a hand-rolled fetch wrapper, no axios/react-query. Domain objects: `auth`, `users`, `reputation`, `dashboard`, `webAnalystsApi`, `usage`, `leads`, `clientsApi`, etc.
- Base URL: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"`. **Always set `NEXT_PUBLIC_API_URL`** or deploys silently hit localhost.
- Two call styles coexist: most calls hit repute-api **directly from the browser**; the heavy LLM endpoints have **pass-through proxy route handlers** at `src/app/api/{generate-lead,pre-analysis}/route.ts` (`maxDuration = 800`), but the ealuminate page mostly calls the backend directly and bypasses them.

### State & styling
- **No global state library** (no React Query/SWR/Zustand/Context) — local `useState`/`useEffect` per component. The only caches are a 60s `sessionStorage` user/profile cache and localStorage auth.
- **Tailwind v4 is configured but most styling is inline `style={{}}` objects.** No component library (no shadcn/Radix/MUI); icons are inline SVGs (`flag-icons` for country flags). Brand colors: primary `#4479DA`, teal `#48D4B8`, dark sidebar `#0f172a`.
- Shared components live in `src/components/common/`; feature-local components/helpers in colocated `_components/` and `_utils/` folders.

## Conventions
- Colocated private folders use the Next.js underscore prefix (`_components/`, `_utils/`) and are not routable.
- Routes are `page.tsx` / `layout.tsx`; components are PascalCase and default-exported.
- Domain types live in `src/lib/api.ts`; feature types in a local `types.ts` — there is no central `types/` dir.
- Browser env vars are all `NEXT_PUBLIC_*`: `NEXT_PUBLIC_API_URL`, Cal.com booking links, `NEXT_PUBLIC_NEWS_AI_URL`. `next.config.ts` allows any HTTPS remote image and `*.ngrok-free.app` dev origins.

## Code comments
Keep comments 1–2 lines (hard max 3); comment only the non-obvious WHY.
