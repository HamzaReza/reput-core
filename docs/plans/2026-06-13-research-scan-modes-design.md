# Separate Research / Scan modes + two new Scan tiers

**Date:** 2026-06-13
**Area:** GINA Ealuminate (frontend) + repute-api `generate-lead` (backend)

## Goal

Split the single `scanTier` control into two **phase-specific** tier pickers, and add
two higher Scan tiers backed by new OpenAI models.

- **Research Mode** → drives the pre-analysis (research) phase. Tiers: **Basic** (Haiku),
  **Advanced** (Sonnet). Both phases still always run — this only selects the research model.
- **Scan Mode** → drives the generate-lead (full scan) phase. Tiers: **Basic** (Haiku),
  **Standard** (gpt-5-mini, effort high), **Advanced** (Sonnet), **Pro** (gpt-5.4, effort
  medium), **Max** (gpt-5.5, effort high). Order: Basic → Standard → Advanced → Pro → Max.

## Key insight — pre-analysis needs no backend change

Research tier values (`basic`, `advanced`) are already valid in the existing
`PreAnalysisRequest.scanTier` Literal, and `resolve_pre_analysis_provider` already maps
`advanced → Sonnet`, else → Haiku. The frontend simply sends the research-tier value into
the existing `scanTier` field of the pre-analysis request. All backend work is in
`generate-lead` + `llm.py`.

## Backend

### `app/utils/llm.py`
- Add a tier registry replacing the boolean routing:

```python
@dataclass(frozen=True)
class TierConfig:
    provider: str            # "openai" | "anthropic"
    model: str
    reasoning_effort: str | None   # OpenAI effort; None for Claude

SCAN_TIERS = {
    "basic":    TierConfig("anthropic", _CLAUDE_DEFAULT_MODEL, None),
    "standard": TierConfig("openai", "gpt-5-mini", "high"),
    "advanced": TierConfig("anthropic", _CLAUDE_ADVANCED_MODEL, None),
    "pro":      TierConfig("openai", "gpt-5.4", "medium"),
    "max":      TierConfig("openai", "gpt-5.5", "high"),
}

def resolve_provider(scan_tier: str) -> TierConfig:
    return SCAN_TIERS.get(scan_tier, SCAN_TIERS["basic"])
```
- Keep `OPENAI_STANDARD_MODEL` / `OPENAI_STANDARD_REASONING` constants (still referenced by
  `test_generate_lead_openai.py`).
- `resolve_pre_analysis_provider` unchanged.

### `app/routers/generate_lead.py`
- `cfg = resolve_provider(body.scanTier)`; `use_openai = cfg.provider == "openai"`.
- `_classify_with_openai` and `_generate_meeting_summary_with_openai` gain `model` and
  `reasoning` params instead of reading module constants; call sites pass `cfg.model` and
  `{"effort": cfg.reasoning_effort}`.
- Claude paths use `cfg.model` (replacing `tier_model`).
- `scanTier` Literal widens to `["basic","standard","advanced","pro","max"]`.
- `scan_log["llm"]`: `provider=cfg.provider`, `model=cfg.model`,
  `reasoningEffort=cfg.reasoning_effort` (ScanLogPanel already reads these generically).
- Route-level OpenAI-key guard becomes `if resolve_provider(body.scanTier).provider ==
  "openai"` so Pro/Max also validate the key.

### Tests
- Update `tests/test_llm_utils.py` to the `TierConfig` return shape; add `pro`/`max` cases.

## Frontend

### `types.ts`
- `ScanTier = "basic" | "standard" | "advanced" | "pro" | "max"`.
- New `ResearchTier = "basic" | "advanced"`.

### `EaluminateFormPanel.tsx`
- New props `researchTier` / `setResearchTier`.
- Add a **Research Mode** pill group (Basic/Advanced) above the existing group.
- Keep/relabel **Scan Mode** group; extend to 5 pills with icons + labels for Pro/Max and
  updated helper text.

### `page.tsx`
- New `researchTier` state, default `"basic"` (preserves today's Haiku-for-research default).
- `SCAN_TIER_VALUES` += `pro`, `max`; add `RESEARCH_TIER_VALUES` + `isResearchTier`.
- Thread `researchTier` through `persistContextRef` (initial + sync effect),
  pre-analysis fetch (sent as `scanTier`), client-event persist/restore, localStorage job
  persist/restore, and SSE-event restore — mirroring `scanTier`.
- `generate-lead` fetch keeps sending the 5-value `scanTier`.

## Deploy ordering (risk)

Widening the `generate-lead` `scanTier` Literal is additive, but a new frontend sending
`pro`/`max` to an old backend returns 422 — the same frontend-ahead-of-backend skew that
caused the PR #81 incident. **Deploy/approve the backend before the frontend.**
