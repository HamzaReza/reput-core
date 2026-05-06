"use client";

const STATS = [
  {
    label: "Total Scans",
    value: "2,455",
    trend: "+12% from last month",
    up: true,
    iconBg: "#eff6ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Reports Generated",
    value: "124.3K",
    trend: "+8% from last month",
    up: true,
    iconBg: "#f0fdf4",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Active Leads",
    value: "8,679",
    trend: "+17% from last month",
    up: true,
    iconBg: "#fef3c7",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Archived Leads",
    value: "6,784",
    trend: "-8% from last month",
    up: false,
    iconBg: "#fef2f2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    label: "Flagged Issues",
    value: "268",
    trend: "+24% from last month",
    up: true,
    iconBg: "#fdf4ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

export default function StatsRow() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="glass glow-border animate-fade-up"
          style={{
            flex: "1 1 160px",
            borderRadius: "0.875rem",
            padding: "1.125rem 1.25rem",
            animationDelay: `${i * 0.07}s`,
          }}
        >
          {/* Top row: label + icon */}
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
              {stat.label}
            </p>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: stat.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
          </div>

          {/* Value */}
          <p
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 0.25rem",
              lineHeight: 1.1,
            }}
          >
            {stat.value}
          </p>

          {/* Trend */}
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: stat.up ? "#22c55e" : "#ef4444",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            {stat.up ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {stat.trend}
          </p>
        </div>
      ))}
    </div>
  );
}
