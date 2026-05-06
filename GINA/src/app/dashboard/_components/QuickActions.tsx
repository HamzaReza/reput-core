"use client";

import { useRouter } from "next/navigation";

const ACTIONS = [
  {
    label: "New Scan",
    iconBg: "#eff6ff",
    href: "/dashboard/ealuminate",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Export Report",
    iconBg: "#f0fdf4",
    href: null,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    label: "Invite User",
    iconBg: "#fef3c7",
    href: null,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    label: "View Analytics",
    iconBg: "#fdf4ff",
    href: null,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.42s" }}
    >
      <p
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--color-foreground, #1e293b)",
          margin: "0 0 1rem",
        }}
      >
        Quick Actions
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.href) {
                router.push(action.href);
              }
            }}
            className="glow-border"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 0.75rem",
              borderRadius: "0.75rem",
              backgroundColor: "#fff",
              cursor: "pointer",
              textAlign: "center",
              transition: "background-color 0.15s, transform 0.15s",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: action.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {action.icon}
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-foreground, #1e293b)",
              }}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
