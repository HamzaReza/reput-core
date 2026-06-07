# Scan Log — structured per-scan pipeline logging + GINA viewer UI

**Date:** 2026-06-07
**Status:** Design validated
**Scope:** `repute-api/app/routers/generate_lead.py` (backend), GINA Ealuminate dashboard (frontend)

## Problem

Generate-lead scans collapse dozens of Serper results into a handful of final links, and the
existing debug fields (`_serper`, `_claude`, `_name_filter`, `_firecrawl`) are keyword-grouped,
incomplete (base-query-only URLs invisible), and unreadable in practice. Diagnosing "who dropped
this link" requires manual JSON archaeology.

## Decisions

| Decision | Choice |
|---|---|
| Scan engine / data source | Python repute-api (GINA already uses its job_id + polling flow) |
| UI host | **GINA Ealuminate** dashboard — not RepuTrust-Web (its `/lead` page runs a separate legacy TS pipeline that nobody uses) |
| UI placement | `Results \| Scan Log` tab switcher on the results area |
| Flat `log: list[str]` + full Claude prompt/response logging (added earlier same day) | **Removed** — replaced entirely by structured `scanLog` |
| Claude raw response text in scanLog | **Excluded** — per-batch structured outcome instead |
| Legacy `_serper`/`_claude`/`_name_filter`/`_firecrawl` keys | Kept untouched for now (GINA may read them); separate cleanup later |

## Backend: `result.scanLog` schema

```jsonc
"scanLog": {
  "serper": {
    "queries": [
      { "keyword": null,                 // null = base name query
        "query": "\"Francesco Maria Zollo\"",
        "country": "Italy", "pages": 3, "count": 30,
        "links": ["https://...", "..."] }   // URLs only — no title/snippet
    ],
    "totalRaw": 114,
    "deduped": { "count": 38, "links": ["..."] }
  },
  "firecrawl": {
    "skipped":  { "count": 2, "youtube": 2, "pdf": 0, "noApiKey": 0,
                  "links": [ { "url": "...", "reason": "youtube" } ] },
    "success":  { "count": 14, "links": ["..."] },
    "failed":   { "count": 22, "links": ["..."] },
    "notAttempted": { "count": 0, "links": [] },   // populated after a 402 short-circuit
    "error": null                                   // e.g. "Firecrawl returned HTTP 402 ..."
  },
  "nameFilter": {
    "firstName": "Francesco", "lastName": "Maria Zollo", "keptCount": 37,
    "dropped": { "count": 1,
      "articles": [ { "url": "...", "title": "...", "snippet": "...", "content": "..." } ] }
      // full article detail intentionally included for debugging
  },
  "claude": {
    "model": "claude-haiku-4-5-20251001",
    "scanFocus": "negative",
    "batches": [
      { "batch": 1, "sentCount": 20, "sent": ["..."],
        "returnedCount": 4,
        "returned": [ { "url": "...", "sentiment": "negative", "risk": "high" } ] }
    ],
    "dropped": { "count": 31, "links": ["..."] }    // sent − returned across all batches
  }
}
```

Estimated size: ~10–30 KB per scan (no prompts, no raw responses).

### Backend implementation notes

- Remove the `log: list[str]` accumulator, all `log.append(...)` lines, the `log`/`call_label`
  params on `_classify_with_claude`, and the `log` param on `_generate_meeting_summary`.
- `_classify_with_claude` keeps the index-based URL re-anchoring (fix A) and returns parsed items;
  the per-batch caller records `{batch, sentCount, sent, returnedCount, returned}`.
- Stage data sources (already in scope today):
  - serper → `all_searches` + `all_organic` + `all_pages_fetched`
  - dedupe → `articles` snapshot after the dedup loop
  - firecrawl → `firecrawl_skipped` reason map, `firecrawl_success`, `firecrawl_failed`,
    `firecrawl_error`; `notAttempted` = articles never reached after a 402 abort
  - nameFilter → `name_filter_dropped` (full article dicts, verbatim)
  - claude → per-batch records + `urls_sent_to_claude` − returned URLs
- `"scanLog": scan_log` added to the result dict.

## Frontend: GINA Ealuminate — `ScanLogPanel`

- **Entry:** when a finished scan has `result.scanLog`, show a `Results | Scan Log` segmented
  control above the results area. Scans without `scanLog` (old jobs) never show the tab.
- **Layout:** vertical pipeline of 4 stage cards. Counts always visible in card headers; bodies
  expand on demand.
  1. **Serper** — header `15 queries · 114 raw → 38 unique`; rows per query (keyword chip, country,
     pages, count) expanding to URL lists; `Deduped (N)` sub-section.
  2. **Firecrawl** — header badges `36 sent · 14 ✓ · 22 ✗ · 2 skipped`; bodies grouped by outcome
     (success green / failed red / skipped gray with reason chips); error banner when set.
  3. **Name filter** — header `38 → 37 · dropped 1` + names used; dropped articles expand to
     title/snippet/full content in a scrollable monospace box.
  4. **Claude** — header `model · 2 batches · 37 → 6 · 31 dropped`; per-batch accordion with sent
     list and returned entries (sentiment/risk chips); flat `Dropped (N)` list.
- **UX rules:** URLs are single ellipsized monospace rows with copy + open-in-new-tab affordances;
  zero-drop stages show a subtle ✓ instead of an empty section; reuse the page's existing
  badge/color conventions.
- **Code:** new `ScanLogPanel.tsx` component + `ScanLog` TS interface; ~10-line integration in
  `src/app/dashboard/ealuminate/page.tsx`; no new dependencies.

## Out of scope (explicitly)

- RepuTrust-Web `/lead` page (legacy TS pipeline) — untouched
- Removing legacy `_serper`/`_claude`/`_name_filter`/`_firecrawl` debug keys
- GINA `clients/[id]` scan view (same panel could be added later)
- Scan history list page (jobs already persist; enabled by this work but not built)
