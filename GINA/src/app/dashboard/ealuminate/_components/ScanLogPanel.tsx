"use client";

import React, { useMemo, useState } from "react";
import type { ScanLog } from "./types";

const STAGE_COLORS = {
  serper: "#4479DA",
  firecrawl: "#f59e0b",
  nameFilter: "#6366f1",
  companyNameFilter: "#8b5cf6",
  claude: "#48D4B8",
};

const SENTIMENT_COLORS: Record<string, string> = {
  negative: "#ef4444",
  positive: "#48D4B8",
  neutral: "#64748b",
};

type FirecrawlStatus = "success" | "failed" | "skipped" | "notAttempted";

const FIRECRAWL_STATUS_META: Record<FirecrawlStatus, { label: string; color: string }> = {
  success: { label: "scraped", color: "#48D4B8" },
  failed: { label: "failed", color: "#ef4444" },
  skipped: { label: "skipped", color: "#64748b" },
  notAttempted: { label: "not attempted", color: "#f59e0b" },
};

// Per-link Serper title/snippet and Firecrawl outcome, so any link row anywhere
// can expand to its metadata without threading props through every stage card.
const ScanMetaContext = React.createContext<{
  metaByUrl: Map<string, { title: string; snippet: string }>;
  statusByUrl: Map<string, FirecrawlStatus>;
}>({ metaByUrl: new Map(), statusByUrl: new Map() });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => {});
      }}
      title="Copy URL"
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.7rem",
        color: copied ? "#48D4B8" : "#94a3b8",
        padding: "0 0.25rem",
        flexShrink: 0,
      }}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}

function UrlRow({ url, chip, chipColor }: { url: string; chip?: string; chipColor?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.2rem 0",
        minWidth: 0,
      }}
    >
      {chip && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: chipColor ?? "#64748b",
            background: `${chipColor ?? "#64748b"}18`,
            borderRadius: "0.375rem",
            padding: "0.05rem 0.4rem",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {chip}
        </span>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.72rem",
          color: "#475569",
          textDecoration: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#4479DA")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
      >
        {url}
      </a>
      <CopyButton text={url} />
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: "0.65rem",
        fontWeight: 600,
        color,
        background: `${color}18`,
        borderRadius: "0.375rem",
        padding: "0.05rem 0.4rem",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// Expandable link row: collapsed shows the URL plus its Firecrawl-status chip;
// click reveals an Open link, title and Serper snippet — kept in the same small font.
function LinkRow({ url, chip, chipColor }: { url: string; chip?: string; chipColor?: string }) {
  const { metaByUrl, statusByUrl } = React.useContext(ScanMetaContext);
  const [open, setOpen] = useState(false);
  const meta = metaByUrl.get(url);
  const status = statusByUrl.get(url);
  const statusMeta = status ? FIRECRAWL_STATUS_META[status] : null;
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.2rem 0",
          minWidth: 0,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {statusMeta && <Chip label={statusMeta.label} color={statusMeta.color} />}
        {chip && <Chip label={chip} color={chipColor ?? "#64748b"} />}
        <span
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.72rem",
            color: open ? "#4479DA" : "#475569",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          {url}
        </span>
        <CopyButton text={url} />
        <span
          style={{
            fontSize: "0.6rem",
            color: "#94a3b8",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>
      {open && (
        <div style={{ padding: "0.1rem 0 0.45rem 0.25rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {url.startsWith("http") ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4479DA", textDecoration: "none", width: "fit-content" }}
            >
              open ↗
            </a>
          ) : (
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", width: "fit-content" }}>
              no url
            </span>
          )}
          <p style={{ margin: 0, fontSize: "0.7rem", color: "#334155" }}>
            <strong>Title:</strong> {meta?.title || "—"}
          </p>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "#334155" }}>
            <strong>Snippet:</strong> {meta?.snippet || "—"}
          </p>
        </div>
      )}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 600,
        color,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        borderRadius: "0.5rem",
        padding: "0.1rem 0.5rem",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Collapse({
  label,
  count,
  color,
  defaultOpen,
  children,
}: {
  label: string;
  count?: number;
  color?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        borderRadius: "0.625rem",
        overflow: "hidden",
        background: "#fafbfc",
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.625rem",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          {color && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155" }}>
            {label}
          </span>
          {typeof count === "number" && (
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>({count})</span>
          )}
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: "#94a3b8",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          ▼
        </span>
      </div>
      {open && (
        <div style={{ padding: "0.25rem 0.625rem 0.55rem", borderTop: "1px solid #eef2f7" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StageCard({
  color,
  title,
  summary,
  badges,
  children,
}: {
  color: string;
  title: string;
  summary: string;
  badges?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderRadius: "0.875rem",
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ width: 4, flexShrink: 0, backgroundColor: color }} />
      <div style={{ flex: 1, padding: "0.75rem 0.875rem", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: children ? "0.55rem" : 0,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>
              {title}
            </p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
              {summary}
            </p>
          </div>
          {badges && (
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>{badges}</div>
          )}
        </div>
        {children && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p style={{ margin: 0, fontSize: "0.72rem", color: "#48D4B8", fontWeight: 600 }}>
      ✓ {text}
    </p>
  );
}

export function ScanLogPanel({ scanLog }: { scanLog: ScanLog }) {
  const { serper, prefilter, firecrawl, nameFilter, companyNameFilter, claude } =
    scanLog;
  const sentTotal = claude?.batches.reduce((n, b) => n + b.sentCount, 0) ?? 0;
  const returnedTotal = claude?.batches.reduce((n, b) => n + b.returnedCount, 0) ?? 0;
  // company_words_missing drops get their own "Company Name Filter" card below,
  // so exclude them from the generic pre-scrape list to avoid showing them twice.
  const prefilterShown = companyNameFilter
    ? (prefilter?.dropped ?? []).filter((d) => d.reason !== "company_words_missing")
    : prefilter?.dropped ?? [];

  const metaByUrl = useMemo(() => {
    const m = new Map<string, { title: string; snippet: string }>();
    for (const a of serper?.deduped?.articles ?? []) {
      m.set(a.url, { title: a.title, snippet: a.snippet });
    }
    // Dropped articles carry their own title/snippet; backfill for older scans
    // whose deduped trace predates the per-link `articles` field.
    for (const a of companyNameFilter?.dropped.articles ?? []) {
      if (!m.has(a.url)) m.set(a.url, { title: a.title, snippet: a.snippet });
    }
    for (const a of nameFilter?.dropped.articles ?? []) {
      if (!m.has(a.url)) m.set(a.url, { title: a.title, snippet: a.snippet });
    }
    return m;
  }, [serper, companyNameFilter, nameFilter]);

  const statusByUrl = useMemo(() => {
    const m = new Map<string, FirecrawlStatus>();
    // Last write wins; fill in reverse priority so success survives any
    // cross-list overlap in older scan data.
    for (const u of firecrawl?.notAttempted.links ?? []) m.set(u, "notAttempted");
    for (const l of firecrawl?.skipped.links ?? []) m.set(l.url, "skipped");
    for (const u of firecrawl?.failed.links ?? []) m.set(u, "failed");
    for (const u of firecrawl?.success.links ?? []) m.set(u, "success");
    return m;
  }, [firecrawl]);

  return (
    <ScanMetaContext.Provider value={{ metaByUrl, statusByUrl }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {serper && (
          <StageCard
            color={STAGE_COLORS.serper}
            title="1 · Serper Searches"
            summary={`${serper.queries.length} queries · ${serper.totalRaw} raw results → ${serper.deduped?.count ?? "?"} unique links`}
          >
            {serper.queries.map((q, i) => (
              <Collapse
                key={i}
                label={q.keyword === null ? "base query" : q.keyword}
                count={q.count}
                color={q.keyword === null ? "#4479DA" : "#94a3b8"}
              >
                <p style={{ margin: "0.15rem 0 0.3rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                  {q.query} · {q.country ?? "—"} · {q.pages} page{q.pages === 1 ? "" : "s"}
                </p>
                {q.links.map((u, j) => (
                  <LinkRow key={j} url={u} />
                ))}
              </Collapse>
            ))}
            {serper.deduped && (
              <Collapse label="Deduped unique links" count={serper.deduped.count} color="#4479DA">
                {serper.deduped.links.map((u, i) => (
                  <LinkRow key={i} url={u} />
                ))}
              </Collapse>
            )}
            {prefilterShown.length > 0 && (
              <Collapse
                label="Dropped before scraping"
                count={prefilterShown.length}
                color="#ef4444"
              >
                {prefilterShown.map((d, i) => (
                  <LinkRow key={i} url={d.url} chip={d.reason} chipColor="#ef4444" />
                ))}
              </Collapse>
            )}
          </StageCard>
        )}

        {companyNameFilter && (
          <StageCard
            color={STAGE_COLORS.companyNameFilter}
            title="Company Name Filter"
            summary={`match: ${companyNameFilter.matchTokens.join(" + ")}${companyNameFilter.abbreviations?.length ? ` (or ${companyNameFilter.abbreviations.map((a) => `"${a.toUpperCase()}"`).join(", ")})` : ""} · kept ${companyNameFilter.keptCount} · pre-scrape`}
            badges={
              <Badge
                label={`${companyNameFilter.dropped.count} dropped`}
                color={companyNameFilter.dropped.count ? "#ef4444" : "#48D4B8"}
              />
            }
          >
            {companyNameFilter.dropped.count === 0 ? (
              <EmptyNote text="no links dropped by the company name filter" />
            ) : (
              chunk(companyNameFilter.dropped.articles, 100).map((batch, bi) => (
                <Collapse
                  key={bi}
                  label={`${bi * 100 + 1}–${bi * 100 + batch.length}`}
                  count={batch.length}
                  color="#ef4444"
                >
                  {batch.map((a, i) => (
                    <LinkRow key={i} url={a.url} />
                  ))}
                </Collapse>
              ))
            )}
          </StageCard>
        )}

        {firecrawl && (
          <StageCard
            color={STAGE_COLORS.firecrawl}
            title="2 · Firecrawl Scraping"
            summary={`${firecrawl.success.count + firecrawl.failed.count} sent · ${firecrawl.skipped.count} skipped (${firecrawl.skipped.youtube} youtube · ${firecrawl.skipped.pdf} pdf)`}
            badges={
              <>
                <Badge label={`${firecrawl.success.count} success`} color="#48D4B8" />
                <Badge label={`${firecrawl.failed.count} failed`} color="#ef4444" />
                <Badge label={`${firecrawl.skipped.count} skipped`} color="#64748b" />
                {firecrawl.notAttempted.count > 0 && (
                  <Badge label={`${firecrawl.notAttempted.count} not attempted`} color="#f59e0b" />
                )}
              </>
            }
          >
            {firecrawl.error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.74rem",
                  color: "#b91c1c",
                  fontWeight: 600,
                }}
              >
                {firecrawl.error}
              </div>
            )}
            <Collapse label="Success" count={firecrawl.success.count} color="#48D4B8">
              {firecrawl.success.links.length === 0 ? (
                <EmptyNote text="none" />
              ) : (
                firecrawl.success.links.map((u, i) => <LinkRow key={i} url={u} />)
              )}
            </Collapse>
            <Collapse label="Failed (classified from snippet)" count={firecrawl.failed.count} color="#ef4444">
              {firecrawl.failed.links.length === 0 ? (
                <EmptyNote text="no failures" />
              ) : (
                firecrawl.failed.links.map((u, i) => <LinkRow key={i} url={u} />)
              )}
            </Collapse>
            <Collapse label="Skipped" count={firecrawl.skipped.count} color="#64748b">
              {firecrawl.skipped.links.length === 0 ? (
                <EmptyNote text="nothing skipped" />
              ) : (
                firecrawl.skipped.links.map((l, i) => (
                  <LinkRow key={i} url={l.url} chip={l.reason} chipColor="#f59e0b" />
                ))
              )}
            </Collapse>
            {firecrawl.notAttempted.count > 0 && (
              <Collapse label="Not attempted" count={firecrawl.notAttempted.count} color="#f59e0b">
                {firecrawl.notAttempted.links.map((u, i) => (
                  <LinkRow key={i} url={u} />
                ))}
              </Collapse>
            )}
          </StageCard>
        )}

        {nameFilter && (
          <StageCard
            color={STAGE_COLORS.nameFilter}
            title="3 · Name Filter"
            summary={`first “${nameFilter.firstName}” · last “${nameFilter.lastName}” · kept ${nameFilter.keptCount}`}
            badges={<Badge label={`${nameFilter.dropped.count} dropped`} color={nameFilter.dropped.count ? "#ef4444" : "#48D4B8"} />}
          >
            {nameFilter.dropped.count === 0 ? (
              <EmptyNote text="no links dropped by the name filter" />
            ) : (
              nameFilter.dropped.articles.map((a, i) => (
                <Collapse key={i} label={a.title || a.url} color="#ef4444">
                  <UrlRow url={a.url} />
                  <p style={{ margin: "0.35rem 0 0.2rem", fontSize: "0.72rem", color: "#334155" }}>
                    <strong>Snippet:</strong> {a.snippet || "—"}
                  </p>
                  <pre
                    style={{
                      margin: "0.25rem 0 0",
                      padding: "0.5rem",
                      background: "#f8fafc",
                      border: "1px solid #eef2f7",
                      borderRadius: "0.5rem",
                      fontSize: "0.68rem",
                      color: "#475569",
                      maxHeight: 180,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {a.content || "(no scraped content)"}
                  </pre>
                </Collapse>
              ))
            )}
          </StageCard>
        )}

        {claude && (
          <StageCard
            color={STAGE_COLORS.claude}
            title="4 · Claude Classification"
            summary={`${claude.model}${claude.scanFocus ? ` · focus: ${claude.scanFocus}` : ""} · ${claude.batches.length} batch${claude.batches.length === 1 ? "" : "es"} · ${sentTotal} sent → ${returnedTotal} returned`}
            badges={<Badge label={`${claude.dropped.count} dropped`} color={claude.dropped.count ? "#ef4444" : "#48D4B8"} />}
          >
            {claude.batches.map((b) => (
              <Collapse
                key={b.batch}
                label={`Batch ${b.batch}`}
                count={b.sentCount}
                color="#48D4B8"
              >
                <p style={{ margin: "0.15rem 0 0.3rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                  {b.sentCount} sent · {b.returnedCount} returned
                </p>
                {b.returned.map((r, i) => (
                  <LinkRow
                    key={`r${i}`}
                    url={r.url ?? "(no url)"}
                    chip={`${r.sentiment ?? "?"} / ${r.risk ?? "?"}`}
                    chipColor={SENTIMENT_COLORS[r.sentiment ?? ""] ?? "#64748b"}
                  />
                ))}
                <Collapse label="All sent in this batch" count={b.sentCount}>
                  {b.sent.map((u, i) => (
                    <LinkRow key={i} url={u} />
                  ))}
                </Collapse>
              </Collapse>
            ))}
            <Collapse
              label="Dropped by classifier"
              count={claude.dropped.count}
              color={claude.dropped.count ? "#ef4444" : "#48D4B8"}
            >
              {claude.dropped.links.length === 0 ? (
                <EmptyNote text="nothing dropped" />
              ) : (
                claude.dropped.links.map((u, i) => <LinkRow key={i} url={u} />)
              )}
            </Collapse>
          </StageCard>
        )}
      </div>
    </ScanMetaContext.Provider>
  );
}
