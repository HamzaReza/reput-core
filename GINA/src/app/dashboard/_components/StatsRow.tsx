"use client";

import { DashboardStats } from "@/lib/api";

const CARDS = [
  {
    key: "users" as const,
    label: "Total Users",
    iconBg: "#eff6ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: "scans" as const,
    label: "Total Scans",
    iconBg: "#eef3ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    key: "leads" as const,
    label: "Leads Generated",
    iconBg: "#fef3c7",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: "contracts" as const,
    label: "Contracts",
    iconBg: "#f0fdf4",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
      </svg>
    ),
  },
];

export default function StatsRow({ data }: { data: DashboardStats }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      {CARDS.map((card, i) => (
        <div
          key={card.key}
          className="glass glow-border animate-fade-up"
          style={{
            flex: "1 1 160px",
            borderRadius: "0.875rem",
            padding: "1.125rem 1.25rem",
            animationDelay: `${i * 0.07}s`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "var(--color-muted, #64748b)",
                margin: 0,
              }}
            >
              {card.label}
            </p>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
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

          <p
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 0.25rem",
              lineHeight: 1.1,
            }}
          >
            {data[card.key] > 0 ? data[card.key].toLocaleString() : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
