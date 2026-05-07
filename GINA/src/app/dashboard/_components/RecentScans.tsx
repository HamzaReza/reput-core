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
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "0.875rem 0",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
        }}
      >
        <div
          style={{
            height: 13,
            width: "38%",
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
          }}
        />
        <div
          style={{
            height: 20,
            width: 60,
            backgroundColor: "#f1f5f9",
            borderRadius: 10,
          }}
        />
      </div>
      <div
        style={{
          height: 11,
          width: "55%",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
          marginBottom: "0.35rem",
        }}
      />
      <div
        style={{
          height: 10,
          width: "80%",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
        }}
      />
    </div>
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
        padding: "1.25rem",
        animationDelay: "0.28s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
          }}
        >
          Recent Leads
        </p>
        {hasMore && (
          <Link
            href="/dashboard/leads"
            style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4479da", textDecoration: "none" }}
          >
            View All
          </Link>
        )}
      </div>

      <div>
        {loading && [0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}

        {!loading && scans.length === 0 && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted, #64748b)",
              textAlign: "center",
              padding: "1.5rem 0",
              margin: 0,
            }}
          >
            No scans yet. Run a scan in Ealuminate.
          </p>
        )}

        {!loading &&
          scans.map((scan, i) => {
            const risk = riskFromScore(scan.score);
            const riskColor = RISK_COLORS[risk] ?? "#94a3b8";
            const isLast = i === scans.length - 1;
            return (
              <div
                key={scan.id}
                onClick={() => router.push(`/dashboard/ealuminate?lead=${scan.id}`)}
                style={{
                  padding: "0.875rem 0",
                  borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "var(--color-foreground, #1e293b)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {scan.name ?? "—"}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: risk === "Pending" ? "#94a3b8" : riskColor,
                      backgroundColor:
                        risk === "Pending" ? "#f1f5f9" : riskColor + "18",
                      borderRadius: "999px",
                      padding: "0.2rem 0.6rem",
                      flexShrink: 0,
                    }}
                  >
                    {risk === "Pending" ? "Pending" : `${scan.score} · ${risk}`}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-muted, #64748b)",
                    margin: "0 0 0.25rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>By:</span>{" "}
                  {scan.scanned_by_name ?? scan.scanned_by_email ?? "—"}
                  {scan.country ? ` · ${scan.country}` : ""}
                  {scan.researched_at
                    ? ` · ${relativeTime(scan.researched_at)}`
                    : ""}
                </p>

                {scan.background && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted, #64748b)",
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {scan.background}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
