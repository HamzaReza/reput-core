"use client";

import Link from "next/link";

export default function DashboardHome() {
  return (
    <div
      style={{
        padding: "clamp(1.5rem, 4vw, 2.5rem)",
        maxWidth: "56rem",
        margin: "0 auto",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Greeting */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.375rem, 3vw, 1.75rem)",
            fontWeight: 800,
            color: "var(--color-foreground, #1e293b)",
            margin: "0 0 0.375rem",
          }}
        >
          Welcome to GINA
        </h1>
        <p style={{ color: "var(--color-muted, #64748b)", fontSize: "0.9375rem", margin: 0 }}>
          Lead intelligence &amp; reputation platform. Select a tool from the sidebar to get started.
        </p>
      </div>

      {/* Tool cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))",
          gap: "1.25rem",
        }}
      >
        <Link href="/dashboard/lead" style={{ textDecoration: "none" }}>
          <div
            className="glass glow-border"
            style={{
              borderRadius: "0.875rem",
              padding: "1.5rem",
              cursor: "pointer",
              transition: "transform 0.15s",
            }}
          >
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.625rem",
                backgroundColor: "rgba(68,121,218,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4479DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--color-foreground, #1e293b)",
                margin: "0 0 0.375rem",
              }}
            >
              Lead Generate
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-muted, #64748b)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Research a prospect&apos;s online reputation, generate a ReputScore, and get a meeting brief.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
