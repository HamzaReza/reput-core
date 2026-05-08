"use client";

import Link from "next/link";

interface TopBarProps {
  userName: string;
  userEmail: string;
}

export default function TopBar({ userName: _userName }: TopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: "1.5rem",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      {/* Left: title + subtitle */}
      <div>
        <h1
          style={{
            fontSize: "1.625rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted, #64748b)",
            margin: "0.25rem 0 0",
            fontWeight: 400,
          }}
        >
          Global Identity Network Architecture
        </p>
      </div>

      {/* Right: date range chip + CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          flexShrink: 0,
        }}
      >
        {/* Date range chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "#ffffff",
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--color-foreground, #1e293b)",
            cursor: "default",
            userSelect: "none",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          May 1 – May 31, 2025
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* New Research CTA */}
        <Link
          href="/dashboard/ealuminate"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.875rem",
            borderRadius: "999px",
            backgroundColor: "#4479DA",
            color: "#ffffff",
            fontSize: "0.8rem",
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.01em",
            transition: "background-color 0.15s",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Research
        </Link>
      </div>
    </div>
  );
}
