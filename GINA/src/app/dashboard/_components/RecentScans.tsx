"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leads, RecentLead } from "@/lib/api";

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

function riskFromScore(score: number | null): string {
  if (score === null) return "Mediocre";
  if (score >= 86) return "Good";
  if (score >= 61) return "Mediocre";
  if (score >= 26) return "Poor";
  return "Negative";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "#f1f5f9", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width: "55%", backgroundColor: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 10, width: "35%", backgroundColor: "#f1f5f9", borderRadius: 6 }} />
      </div>
      <div style={{ width: 48, height: 20, backgroundColor: "#f1f5f9", borderRadius: 10 }} />
      <div style={{ width: 28, height: 28, backgroundColor: "#f1f5f9", borderRadius: 6 }} />
    </div>
  );
}

export default function RecentScans() {
  const [scans, setScans] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leads.list(5)
      .then(setScans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.28s" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0 }}>
          Recent Scans
        </p>
        <Link
          href="/dashboard/ealuminate"
          style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4479da", textDecoration: "none" }}
        >
          View All
        </Link>
      </div>

      <div>
        {loading && [0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}

        {!loading && scans.length === 0 && (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", textAlign: "center", padding: "1.5rem 0", margin: 0 }}>
            No scans yet. Run a scan in Ealuminate.
          </p>
        )}

        {!loading && scans.map((scan, i) => {
          const risk = riskFromScore(scan.score);
          const riskColor = RISK_COLORS[risk];
          const isLast = i === scans.length - 1;
          return (
            <div
              key={scan.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                paddingTop: "0.75rem",
                paddingBottom: "0.75rem",
                borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: riskColor + "22",
                  color: riskColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  border: `1.5px solid ${riskColor}44`,
                }}
              >
                {getInitials(scan.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {scan.name ?? "—"}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", margin: "0.1rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {scan.company ?? "—"}
                </p>
              </div>

              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: riskColor,
                  backgroundColor: riskColor + "18",
                  borderRadius: "999px",
                  padding: "0.2rem 0.55rem",
                  flexShrink: 0,
                }}
              >
                {risk}
              </span>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 700, color: riskColor, margin: 0 }}>
                  {scan.score ?? "—"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--color-muted, #64748b)", margin: "0.1rem 0 0" }}>
                  {relativeTime(scan.researched_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
