"use client";

import { leads, RecentLead } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

function riskFromScore(score: number | null): string {
  if (score === null) return "Pending";
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
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SkeletonRow() {
  return (
    <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--color-border, #e2e8f0)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <div style={{ height: 13, width: "30%", backgroundColor: "#f1f5f9", borderRadius: 6 }} />
        <div style={{ height: 20, width: 70, backgroundColor: "#f1f5f9", borderRadius: 10 }} />
      </div>
      <div style={{ height: 11, width: "45%", backgroundColor: "#f1f5f9", borderRadius: 6, marginBottom: "0.35rem" }} />
      <div style={{ height: 10, width: "75%", backgroundColor: "#f1f5f9", borderRadius: 6 }} />
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const [list, setList] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leads.list(100).then(setList).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        padding: "clamp(1.25rem, 4vw, 2rem)",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.25rem" }}>
          All Leads
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
          {!loading && `${list.length} lead${list.length !== 1 ? "s" : ""} total`}
        </p>
      </div>

      <div className="glass glow-border" style={{ borderRadius: "0.875rem", overflow: "hidden" }}>
        {loading && [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

        {!loading && list.length === 0 && (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", textAlign: "center", padding: "2rem 1.25rem", margin: 0 }}>
            No leads yet. Run a scan in Ealuminate.
          </p>
        )}

        {!loading && list.map((lead, i) => {
          const risk = riskFromScore(lead.score);
          const riskColor = RISK_COLORS[risk] ?? "#94a3b8";
          const isLast = i === list.length - 1;

          return (
            <div
              key={lead.id}
              onClick={() => router.push(`/dashboard/ealuminate?lead=${lead.id}`)}
              style={{
                padding: "0.875rem 1.25rem",
                borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
                cursor: "pointer",
                transition: "background-color 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lead.name ?? "—"}
                  {lead.company && <span style={{ fontWeight: 400, color: "var(--color-muted, #64748b)", marginLeft: "0.4rem" }}>· {lead.company}</span>}
                </p>
                <span style={{
                  fontSize: "0.6875rem", fontWeight: 700,
                  color: risk === "Pending" ? "#94a3b8" : riskColor,
                  backgroundColor: risk === "Pending" ? "#f1f5f9" : riskColor + "18",
                  borderRadius: "999px", padding: "0.2rem 0.6rem", flexShrink: 0,
                }}>
                  {risk === "Pending" ? "Pending" : `${lead.score} · ${risk}`}
                </span>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", margin: "0 0 0.25rem" }}>
                <span style={{ fontWeight: 600 }}>By:</span>{" "}
                {lead.scanned_by_name ?? lead.scanned_by_email ?? "—"}
                {lead.country ? ` · ${lead.country}` : ""}
                {lead.researched_at ? ` · ${relativeTime(lead.researched_at)}` : ""}
              </p>

              {lead.background && (
                <p style={{
                  fontSize: "0.75rem", color: "var(--color-muted, #64748b)", margin: 0,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {lead.background}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
