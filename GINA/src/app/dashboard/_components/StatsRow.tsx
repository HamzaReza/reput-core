"use client";

import { DashboardStats } from "@/lib/api";

const CARDS = [
  {
    key: "clients" as const,
    label: "Total Clients",
    isScore: false,
    iconBg: "#f0f9ff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "leads" as const,
    label: "Briefs Ready",
    isScore: false,
    iconBg: "#f0fdf4",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
      </svg>
    ),
  },
  {
    key: "scans" as const,
    label: "Active Researches",
    isScore: false,
    iconBg: "#eff6ff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    key: "avg_score" as const,
    label: "Average ReputScore",
    isScore: true,
    iconBg: "#faf5ff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

function trendLabel(val: number | null | undefined, isScore: boolean): string | null {
  if (val == null) return null;
  if (val === 0) return "No change vs last month";
  const arrow = val > 0 ? "↑" : "↓";
  const abs = Math.abs(val);
  return isScore ? `${arrow} ${abs} pts vs last month` : `${arrow} ${abs}% vs last month`;
}

export default function StatsRow({ data, loading = false }: { data: DashboardStats; loading?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      <style>{`
        @keyframes stats-shimmer {
          0%   { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .stats-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200px 100%;
          animation: stats-shimmer 1.2s ease-in-out infinite;
          border-radius: 0.25rem;
        }
        @media (max-width: 1080px) {
          .stats-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 540px) {
          .stats-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {CARDS.map((card, i) => (
        <div
          key={card.label}
          className="glass glow-border animate-fade-up"
          style={{
            borderRadius: "0.875rem",
            padding: "1rem 1.125rem",
            animationDelay: `${i * 0.07}s`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "0.625rem",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-muted, #64748b)",
                margin: 0,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {card.label}
            </p>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "0.625rem",
                backgroundColor: card.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
          </div>

          {loading ? (
            <div className="stats-shimmer" style={{ height: "1.875rem", width: "55%", marginBottom: "0.375rem" }} />
          ) : (
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: 600,
                color: "var(--color-foreground, #1e293b)",
                margin: "0 0 0.3rem",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {data[card.key] > 0
                ? card.key === "avg_score"
                  ? `${data[card.key]} / 100`
                  : data[card.key].toLocaleString()
                : "—"}
            </p>
          )}

          {(() => {
            const val = data.trends?.[card.key];
            const label = trendLabel(val, card.isScore);
            if (!label) return null;
            const color = val === 0 ? "#94a3b8" : (val ?? 0) > 0 ? "#22c55e" : "#ef4444";
            return (
              <p style={{ fontSize: "0.7rem", fontWeight: 500, color, margin: 0 }}>
                {label}
              </p>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
