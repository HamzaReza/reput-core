"use client";

import Link from "next/link";

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

const SCANS = [
  { name: "John Smith",   company: "Acme Corp",    score: 78, risk: "Good",     status: "Complete",  time: "2h ago" },
  { name: "Sarah Lee",    company: "TechStart",    score: 42, risk: "Poor",     status: "Complete",  time: "5h ago" },
  { name: "Mark Rivera",  company: "Global Media", score: 31, risk: "Negative", status: "In Review", time: "1d ago" },
  { name: "Emma Davis",   company: "Retail Plus",  score: 65, risk: "Mediocre", status: "Complete",  time: "2d ago" },
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function RecentScans() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.28s" }}
    >
      {/* Header */}
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
          Recent Scans
        </p>
        <Link
          href="/dashboard/ealuminate"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#4479da",
            textDecoration: "none",
          }}
        >
          View All
        </Link>
      </div>

      {/* Scan rows */}
      <div>
        {SCANS.map((scan, i) => {
          const riskColor = RISK_COLORS[scan.risk] ?? "#64748b";
          const isLast = i === SCANS.length - 1;
          return (
            <div
              key={scan.name + i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                paddingTop: "0.75rem",
                paddingBottom: "0.75rem",
                borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              {/* Avatar */}
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

              {/* Name + company */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--color-foreground, #1e293b)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {scan.name}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-muted, #64748b)",
                    margin: "0.1rem 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {scan.company}
                </p>
              </div>

              {/* Risk badge */}
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
                {scan.risk}
              </span>

              {/* Score + time */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: riskColor,
                    margin: 0,
                  }}
                >
                  {scan.score}
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--color-muted, #64748b)",
                    margin: "0.1rem 0 0",
                  }}
                >
                  {scan.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
