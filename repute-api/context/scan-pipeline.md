# Reputation Scan Pipeline — the core feature

The reputation scan is the heart of the platform. It spans **GINA** (trigger + render) and **repute-api** (all the logic). This is the end-to-end reference; `repute-api/CLAUDE.md` has the day-to-day essentials and `context/architecture.md` has the broader backend subsystem reference (router catalog, full LLM tier table, usage tracking, data model).

## Two distinct scan flows — don't confuse them

- **Analyst scan (this doc):** GINA → `POST /pre-analysis` then `POST /generate-lead`, guarded by `get_current_web_analyst`. repute-api runs the entire server-side pipeline.
- **End-user scan:** `app/routers/reputation.py`, guarded by `get_current_user`. `POST /reputation/scan` only creates a placeholder `ReputationScan` row (score 100, empty results); the **client** runs Claude web search and `PATCH /reputation/scan/{id}`es results back. The backend does no scanning there.

## End-to-end flow (analyst)

1. Analyst fills the form in `GINA/src/app/dashboard/ealuminate/page.tsx` (subject type, name/company, countries, description, tiers, keyword controls).
2. **can-scan gate** — `GET /clients/can-scan` runs before *both* research and scan (raw `fetch`; there is no `clientsApi.canScan` helper). `401` → login redirect; non-OK → blocked with `detail`.
3. **Pre-analysis** (optional; the "Research" action) — `POST /pre-analysis` → `{profile, keywords}`. The analyst reviews the profile and edits the keyword chips. The "Skip" action bypasses this and jumps to keyword entry with empty keywords.
4. **Scan** (the "Run Scan" action) — `POST /generate-lead` with the edited keywords + the `preAnalysisProfile` → `{job_id}`.
5. GINA **polls** `GET /generate-lead/{job_id}` every 5s, showing `current_step`; the Abort button issues `DELETE`.
6. On `done`, GINA renders score + classified links + brief, persists to the lead/client, and offers PDF/Excel exports.

Both calls go **directly to repute-api** via `NEXT_PUBLIC_API_URL`. The Next proxy routes (`src/app/api/{generate-lead,pre-analysis}/route.ts` — pass-through, `maxDuration=800`, POST-only) exist but the ealuminate page bypasses them.

## Stage 1 — Pre-analysis (`app/routers/pre_analysis.py`, synchronous)

- `POST /pre-analysis`, **synchronous** (no job row, returns inline), **Claude-only** (`resolve_pre_analysis_provider`: `advanced` → Sonnet, else Haiku). Uses Claude's native `web_search` tool — **no Serper/Firecrawl**.
- Runs three tracked LLM operations (all with `job_id=NULL`):
  - `pre_analysis_research` — investigative web-search summary; emits a trailing `SEARCH_QUERIES_USED:` line that is parsed out.
  - `pre_analysis_negative` — adverse-coverage search; returns JSON `{coverage_assessment, confidence, distinct_negative_sources_seen, saturation, reasoning}`, normalized by `_build_estimate` into a `{low, high}` range (0 sources → 0/0; else low=`domains*3`, high=`domains*10`).
  - `pre_analysis_keywords` — formats the research into the fixed output shape.
- **Returns** `{profile, keywords}`. `profile` = `{identity, background, associations, recent_news, negative_findings, positive_presence, reputation_notes, estimated_negative_links:{low,high,...}}`; `keywords` = a flat list (or per-language groups when `keywordLanguages` is set).
- **Why it exists:** auto-generate the scan keywords **and** a subject profile that is passed back into generate-lead as `preAnalysisProfile`, used for **homonym disambiguation** and classification accuracy.
- **Caveat:** the whole body is wrapped in a broad `try/except` — on any failure it still returns **HTTP 200** with a `FALLBACK_PROFILE` ("No … found" strings) and `keywords:[]`. Failures are silent.

## Stage 2 — Generate-lead (`app/routers/generate_lead.py`, async job)

### Request — `GenerateLeadRequest`
`firstName`/`middleName`/`lastName`, `company`, `country`/`countries`, `keywords[]`, `pagesCap` (=2, Serper pages/query), `subjectType` (individual|company), `reportLanguage` (en/it/es), `useKeywords` (=True), `scanFocus` (negative|positive|neutral|all), `scanTier` (basic|standard|advanced|pro|max, =standard), `background` (free-text analyst context), `preAnalysisProfile` (from Stage 1). Rejects 400 if no countries or (`useKeywords` with empty `keywords`); 500 if the resolved provider's key or `SERPER_API_KEY` is missing.

### Job lifecycle
`GenerateLeadJob.status`: `pending` → `running` → terminal `done` / `failed` / `cancelled`. `current_step` values a poller sees, in order:
`building_queries` → `serper_search` → `firecrawl_scrape` → `llm_classification` → `generating_brief` (the brief stage reuses `generating_brief`).
`POST` inserts the row, fires `asyncio.create_task(_run_job)`, returns `{job_id}` immediately. `GET /{job_id}` → `{status, result, error, current_step}` (no ownership check). `DELETE /{job_id}` is ownership-checked (`created_by_id == analyst.id`), cancels the in-memory task. Tasks live in module-level dicts → **single-process only (no `--workers`)**; a process restart strands in-flight jobs as `running`.

### Pipeline (`_execute_generate_lead`)
Model/provider come from `resolve_provider(scanTier)` (full tier→model table in `context/architecture.md`).

1. **Query construction** — subject variants (individuals quoted; companies quoted + unquoted with legal suffixes stripped). If `useKeywords`, appends `"{variant} {keyword}"` per keyword. Cartesian product with per-country `{gl, hl}` locales.
2. **Serper** (`_search_serper`, `POST google.serper.dev/search`) — concurrency 5, paginates `1..pagesCap`, 429 → backoff. Flattens `organic[]`.
3. **Dedupe + cheap prefilter** — dedupe by URL; drop on snippet-only name/company mismatch; drop `.pdf` URLs (`_PDF_URL_PATTERN`).
4. **Firecrawl** (`_scrape_firecrawl`, `POST api.firecrawl.dev/v1/scrape`) — batches of 15; **skips** YouTube / PDF / when no key; markdown truncated to 8000 chars.
5. **Hard name filter** (individuals, post-scrape) — see Domain rules.
6. **LLM classification** (`_classify_batch`, batches of 20, concurrency 3) — Claude or OpenAI per tier; tracked as `classification`. **Claude is silent-drop tolerant; OpenAI fails loud** (`OpenAIIncompleteError` on `incomplete`/unparseable) so a batch is never silently lost. Output per link: `{url, title, snippet (3-sentence), sentiment (negative|positive|neutral), risk (high|medium|low|none), source, type}`. An optional SCAN FOCUS rule + a server-side focus filter can restrict to one sentiment.
7. **Dedupe links** by URL (keep highest sentiment×risk priority), sort by date desc.
8. **Score** — `_derive_score(neg_count, pos_count)` (see Domain rules).
9. **Brief** (`generating_brief`) — one summary call, tracked as `meeting_summary`; outputs `{headline, issues, talkingPoints, riskIndicators, objectionHandlers}`; falls back to `_fallback_summary(score)` on failure.

### Result (`job.result` on success)
`{links[], negative[], positive[], neutral[], summary{}, score, scanTier, scanLog{}, _serper, _firecrawl, _llm, _name_filter}`. `scanLog` keys: `serper`, `companyNameFilter` (company scans), `prefilter`, `firecrawl`, `nameFilter` (individual scans), `llm` — schema in `docs/plans/2026-06-07-scan-log-design.md`.

## Domain rules

### Scoring — `_derive_score(neg, pos)`
`neg`/`pos` are counts of `sentiment=="negative"` / `=="positive"` (NOT risk-based):
```
neg == 0:   pos>=10 → 100;  else 86 + round((pos/9)*13)                  # 86–100  Good
neg <= 5:   85 - (neg-1)*4,  + round((min(pos,10)/10)*5),  clamp 61–85   # 61–85   Mediocre
neg <= 10:  60 - (neg-6)*7,  + round((min(pos,10)/10)*5),  clamp 26–60   # 26–60   Poor
else:       max(0, 25 - (neg-11)*2)                                       # 0–25    Negative
```
The frontend mirrors this in `deriveScore` / `scoreLabel` (page.tsx) as a fallback when `result.score` is absent.

### Link classification — risk → UI label (source of truth: `GINA_Link_Classification.md`)
The LLM assigns `sentiment` + `risk`; the UI **label is derived from `risk`**:

| risk | label | color | meaning |
|---|---|---|---|
| high | Negative | red | crimes, fraud, lawsuits, investigations |
| medium | Poor | orange | accidents, controversies, allegations, complaints |
| low | Mediocre | yellow | minor criticism, weak negative mentions |
| none | Good | green | positive or purely informational |

Mirrored in `apiRiskToUi` (page.tsx) and `riskLabel` (pdfExports.ts). Key rule: **when in doubt between negative and neutral, choose negative.**

### Name / company filtering
- `_passes_name_filter` (individuals): diacritic-strip + tokenize; pass if the full-name or surname-first token sequence appears; otherwise inspect the token before each surname occurrence and drop if it looks like a *different* person's given name **and** none of the subject's given names appear anywhere (recall guard). Fail-open when tokens are empty.
- `_passes_company_filter`: pass if any ≥2-token contiguous subsequence of the company name (tokens >2 chars) is a substring of title+snippet, or an abbreviation/acronym matches. Legal-form stopwords (LLC, Inc, Group…) are never required; `_strip_company_suffixes` removes them first.
- Country codes via `app/routers/google_countries.json` (`_country_code`); Serper locale via `_get_serper_locale`.

## Frontend specifics (`GINA/src/app/dashboard/ealuminate/`)
- **Two tier selectors** (recent Research/Scan split, `docs/plans/2026-06-13-research-scan-modes-design.md`): "Research Mode" (`researchTier`: basic|advanced → pre-analysis) vs "Scan Mode" (`scanTier`: basic|standard|advanced|pro|max → generate-lead). The research tier is sent in the `scanTier` field of `/pre-analysis`.
- **Polling:** 5s interval with an immediate first check; tolerates 5 consecutive network errors. Resumes a scan via `localStorage["ealuminate_job_id"]` keyed by lead.
- **Persistence:** on `done`, updates the lead (`leads.update`) and appends a client `scan` event (deduped per job). Soft-deletes/restores survive reloads and re-scans.
- **Links UI:** classification is **read-only** (no re-label); per-link and bulk **soft-delete/restore** via a Trash section, persisted optimistically with `PATCH leads.update({links})`.
- **Exports:** `exportSummaryPdf` (Internal Brief: score + brief + links), `exportReportMasterPdf` (Research Summary: the pre-analysis profile), `exportLinksXlsx` (selected links → styled `.xlsx`). Each is gated by a field/links picker modal.

## Key files
- **Backend:** `app/routers/generate_lead.py` (pipeline, `_derive_score`, classification, filters), `app/routers/pre_analysis.py` (3 ops), `app/utils/llm.py` (tier routing), `app/routers/google_countries.json`.
- **Frontend:** `GINA/src/app/dashboard/ealuminate/page.tsx` (trigger, polling, persistence) + `_components/` (`EaluminateFormPanel`, `EaluminateResultsPanel`, `ScanLogPanel`) + `_utils/` (`pdfExports.ts`, `xlsxExport.ts`); proxies `src/app/api/{generate-lead,pre-analysis}/route.ts`.
- **Spec/design:** `GINA_Link_Classification.md`, `docs/plans/2026-06-07-scan-log-design.md`, `docs/plans/2026-06-13-research-scan-modes-design.md`.
