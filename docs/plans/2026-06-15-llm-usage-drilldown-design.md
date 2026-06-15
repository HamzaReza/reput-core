# LLM Usage Drill-Down — "What were the tokens spent on" — Design

Follow-up to the token-tracking feature (PR #92, on `develop`). Adds per-analyst
attribution of LLM spend to the **subject** (person/company) that was researched,
plus an admin drill-down endpoint and GINA modal.

## Problem

`llm_usage` records cost/tokens per analyst, but not *what the tokens were spent on*.
The job row (`generate_lead_jobs`) has **no subject column** — the name/company lives
only inside its `result` JSONB (populated at the end) — and pre-analysis rows have
`job_id = NULL`. So a join-only drill-down can't reliably name the subject and can
never attribute pre-analysis. The fix is to capture the subject at write time.

## Decisions

- **Scope:** add a `subject_label` column **and** build the drill-down endpoint + UI (B+A).
- **UX:** modal dialog launched from the per-analyst table on the Analytics page.
- **Detail emphasis:** grouped *by subject* (the answer) + a chronological call log (audit).
- **Historical data:** going-forward only. Column is nullable; existing rows render `—`. No backfill.

## Backend

### 1. Schema — migration `0029_add_subject_label_to_llm_usage.py`
- `op.add_column("llm_usage", sa.Column("subject_label", sa.String(255), nullable=True))`
- `downgrade` drops it. `revision="0029"`, `down_revision="0028"`.
- Add `subject_label: Mapped[str | None] = mapped_column(String(255), nullable=True)` to `LLMUsage`.

### 2. Capture
- `record_llm_usage(...)` gains keyword-only `subject_label: str | None = None`.
- Normalize centrally via `normalize_subject(s)`: `strip()`, truncate to 255, empty → `None`.
  (Pure helper, unit-testable, keeps the never-raise guarantee.)
- Call sites already have the value in scope:
  - `generate_lead.py` → `subject_label=search_subject` (classification + meeting_summary).
  - `pre_analysis.py` → `subject_label=subject_label` (research + negative + keywords).

### 3. Endpoint — `GET /usage/by-analyst/{analyst_id}` (admin-only)
- Query: `from`, `to` (reuse `_parse_range`), `limit` (default 200, clamped 1..1000 via `_clamp_limit`).
- `404` if the analyst id is unknown.
- Response:
  - `analyst`: `{ id, name, email }`
  - `totals`: `{ costUsd, totalTokens, calls, scans }` (scans = distinct non-null job_id)
  - `bySubject[]`: `{ subject, costUsd, totalTokens, calls }`, grouped by `subject_label`
    (NULL → one bucket), ordered by cost desc — *the "what was it spent on" answer*.
  - `calls[]`: `{ createdAt, subject, operation, provider, model, scanTier, totalTokens, costUsd, jobId }`,
    chronological desc, limited to `limit` — the audit log.

## Frontend (GINA)

### 1. `src/lib/api.ts`
- Interfaces: `UsageSubjectRow`, `UsageCallRow`, `UsageAnalystDetail`.
- `usage.byAnalystDetail(analystId, from?, to?, limit?)` → `request<UsageAnalystDetail>(..., true)`.

### 2. `analytics/_components/AnalystUsageModal.tsx` (new)
- Overlay dialog mirroring `ExportLinksModal` (backdrop + centered card).
- Header (analyst name/email + range), KPI strip, **By subject** table, scrollable **Call log** table.
- Reuses `thStyle`/`tdStyle`/`fmtUsd`/`fmtNum`; own `genRef` stale-guard + loading/error; fetches on open.
- Friendly operation labels (`pre_analysis_research` → "Pre-analysis: research", etc.).
- NULL subject → `—`. Call timestamps formatted in the browser timezone.

### 3. `analytics/_components/TokenUsageSection.tsx`
- Per-analyst rows become clickable → open the modal with the current `from`/`to`/`tz`.

## Testing
- No TDD. Implement first, then add pure unit tests for `normalize_subject` and `_clamp_limit`
  (DB-free, matching the existing `test_usage_*` style). Run pytest in the `reput_api` container.
- Frontend verified with `pnpm exec tsc --noEmit` + `pnpm build`.
