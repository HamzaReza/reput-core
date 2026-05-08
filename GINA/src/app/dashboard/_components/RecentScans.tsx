"use client";

import { leads, RecentLead } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

const RISK_LABELS: Record<string, string> = {
  Good: "Excellent",
  Mediocre: "Fair",
  Poor: "Poor",
  Negative: "Critical",
};

function riskFromScore(score: number | null): string {
  if (score === null) return "Pending";
  if (score >= 86) return "Good";
  if (score >= 61) return "Mediocre";
  if (score >= 26) return "Poor";
  return "Negative";
}

function statusFromRisk(risk: string): { label: string; color: string; bg: string } {
  if (risk === "Pending") return { label: "Scanning", color: "#64748b", bg: "#f1f5f9" };
  if (risk === "Good" || risk === "Mediocre") return { label: "Brief Ready", color: "#4479da", bg: "#eff6ff" };
  if (risk === "Poor") return { label: "Scanning", color: "#64748b", bg: "#f1f5f9" };
  return { label: "High Risk", color: "#ef4444", bg: "#fef2f2" };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("default", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: "0.75rem 0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#f1f5f9", flexShrink: 0 }} />
          <div>
            <div style={{ height: 11, width: 110, backgroundColor: "#f1f5f9", borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 9, width: 70, backgroundColor: "#f1f5f9", borderRadius: 4 }} />
          </div>
        </div>
      </td>
      <td style={{ padding: "0.75rem 0.875rem" }}>
        <div style={{ height: 20, width: 72, backgroundColor: "#f1f5f9", borderRadius: 999 }} />
      </td>
      <td style={{ padding: "0.75rem 0.875rem" }}>
        <div style={{ height: 20, width: 72, backgroundColor: "#f1f5f9", borderRadius: 999 }} />
      </td>
      <td style={{ padding: "0.75rem 0.875rem" }}>
        <div style={{ height: 10, width: 80, backgroundColor: "#f1f5f9", borderRadius: 4 }} />
      </td>
    </tr>
  );
}

export default function RecentScans() {
  const router = useRouter();
  const [scans, setScans] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    leads
      .list(6)
      .then((data) => {
        setHasMore(data.length > 5);
        setScans(data.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        overflow: "hidden",
        animationDelay: "0.21s",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1rem",
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Recent Research
        </p>
        {hasMore && (
          <Link
            href="/dashboard/leads"
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#4479da",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            View all
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc" }}>
              {["Company", "ReputScore", "Status", "Updated"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "0.5rem 0.875rem",
                    textAlign: "left",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-muted, #64748b)",
                    borderBottom: "1px solid var(--color-border, #e2e8f0)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

            {!loading && scans.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    fontSize: "0.8125rem",
                    color: "var(--color-muted, #64748b)",
                  }}
                >
                  No scans yet. Run a scan in Ealuminate.
                </td>
              </tr>
            )}

            {!loading &&
              scans.map((scan, i) => {
                const risk = riskFromScore(scan.score);
                const riskColor = RISK_COLORS[risk] ?? "#94a3b8";
                const statusInfo = statusFromRisk(risk);
                const isLast = i === scans.length - 1;

                return (
                  <tr
                    key={scan.id}
                    onClick={() => router.push(`/dashboard/ealuminate?lead=${scan.id}`)}
                    style={{
                      cursor: "pointer",
                      borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {/* Company + avatar */}
                    <td style={{ padding: "0.75rem 0.875rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            backgroundColor: "rgba(72,212,184,0.14)",
                            color: "#2ab89e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.625rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {initials(scan.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              color: "var(--color-foreground, #1e293b)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 160,
                            }}
                          >
                            {scan.name ?? "—"}
                          </p>
                          {(scan.company || scan.country) && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.6875rem",
                                color: "var(--color-muted, #64748b)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 160,
                              }}
                            >
                              {[scan.company, scan.country].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ReputScore badge */}
                    <td style={{ padding: "0.75rem 0.875rem" }}>
                      {risk === "Pending" ? (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            color: "#94a3b8",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "999px",
                            padding: "0.2rem 0.5rem",
                          }}
                        >
                          Pending
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            color: riskColor,
                            backgroundColor: riskColor + "18",
                            borderRadius: "999px",
                            padding: "0.2rem 0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {scan.score} {RISK_LABELS[risk] ?? risk}
                        </span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "0.75rem 0.875rem" }}>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          color: statusInfo.color,
                          backgroundColor: statusInfo.bg,
                          borderRadius: "999px",
                          padding: "0.2rem 0.5rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Updated */}
                    <td style={{ padding: "0.75rem 0.875rem", whiteSpace: "nowrap" }}>
                      <p style={{ margin: 0, color: "var(--color-foreground, #1e293b)", fontWeight: 500 }}>
                        {formatDateTime(scan.researched_at)}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--color-muted, #64748b)" }}>
                        {relativeTime(scan.researched_at)}
                      </p>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
