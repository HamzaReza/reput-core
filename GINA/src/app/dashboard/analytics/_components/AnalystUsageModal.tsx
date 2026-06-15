"use client";

import { useEffect, useRef, useState } from "react";
import { usage, type UsageAnalystDetail, type UsageAnalystRow } from "@/lib/api";

function fmtUsd(n: number, dp = 2): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
function fmtNum(n: number): string {
  return n.toLocaleString();
}

const OP_LABELS: Record<string, string> = {
  classification: "Classification",
  meeting_summary: "Meeting summary",
  pre_analysis_research: "Pre-analysis: research",
  pre_analysis_negative: "Pre-analysis: negative",
  pre_analysis_keywords: "Pre-analysis: keywords",
};
function opLabel(op: string): string {
  return OP_LABELS[op] ?? op;
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#64748b",
  margin: "0 0 0.4rem",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "0.5rem 0.625rem",
  borderBottom: "1px solid #e2e8f0",
};
const tdStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#1e293b",
  padding: "0.5rem 0.625rem",
  borderBottom: "1px solid #f1f5f9",
};

interface Props {
  analyst: UsageAnalystRow;
  from: string;
  to: string;
  tz: string;
  onClose: () => void;
}

export default function AnalystUsageModal({ analyst, from, to, tz, onClose }: Props) {
  const [detail, setDetail] = useState<UsageAnalystDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    usage
      .byAnalystDetail(analyst.webAnalystId, from, to)
      .then((d) => {
        if (gen !== genRef.current) return;
        setDetail(d);
      })
      .catch((e) => {
        if (gen !== genRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load analyst usage");
      })
      .finally(() => {
        if (gen === genRef.current) setLoading(false);
      });
  }, [analyst.webAnalystId, from, to]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "1rem",
          width: "min(94vw, 880px)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.1rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>{analyst.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.15rem" }}>
              {analyst.email} · times in {tz}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: "1.5rem",
              lineHeight: 1,
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.1rem 1.25rem", overflowY: "auto" }}>
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "0.8125rem",
                borderRadius: "0.625rem",
                padding: "0.75rem",
              }}
            >
              {error}
            </div>
          )}
          {loading && <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading…</div>}
          {!loading && detail && (
            <>
              {/* KPI strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.75rem",
                  marginBottom: "1.25rem",
                }}
              >
                {[
                  { label: "Cost", value: fmtUsd(detail.totals.costUsd, 4) },
                  { label: "Tokens", value: fmtNum(detail.totals.totalTokens) },
                  { label: "Scans", value: fmtNum(detail.totals.scans) },
                  { label: "Calls", value: fmtNum(detail.totals.calls) },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{ border: "1px solid #e2e8f0", borderRadius: "0.625rem", padding: "0.6rem 0.75rem" }}
                  >
                    <div style={sectionLabel}>{c.label}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>{c.value}</div>
                  </div>
                ))}
              </div>

              {/* By subject — the "what was it spent on" answer */}
              <p style={sectionLabel}>What it was spent on</p>
              <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Subject</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Tokens</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.bySubject.length === 0 && (
                      <tr>
                        <td style={{ ...tdStyle, color: "#94a3b8" }} colSpan={4}>
                          No usage in this period.
                        </td>
                      </tr>
                    )}
                    {detail.bySubject.map((s, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{s.subject ?? "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtUsd(s.costUsd, 4)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(s.totalTokens)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(s.calls)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chronological call log — surface truncation when the cap is hit */}
              <p style={sectionLabel}>
                Call log
                {detail.calls.length > 0 &&
                  (detail.totals.calls > detail.calls.length
                    ? ` · ${detail.calls.length} most recent of ${fmtNum(detail.totals.calls)} (narrow the range to see older)`
                    : ` · ${detail.calls.length}`)}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Operation</th>
                      <th style={thStyle}>Model</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Tokens</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.calls.length === 0 && (
                      <tr>
                        <td style={{ ...tdStyle, color: "#94a3b8" }} colSpan={6}>
                          No calls in this period.
                        </td>
                      </tr>
                    )}
                    {detail.calls.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmtTime(c.createdAt)}</td>
                        <td style={tdStyle}>{c.subject ?? "—"}</td>
                        <td style={tdStyle}>{opLabel(c.operation)}</td>
                        <td style={{ ...tdStyle, color: "#64748b" }}>{c.model}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(c.totalTokens)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtUsd(c.costUsd, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
