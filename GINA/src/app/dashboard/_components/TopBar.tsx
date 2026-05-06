"use client";

interface TopBarProps {
  userName: string;
  userEmail: string;
}

export default function TopBar({ userName }: TopBarProps) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "0.875rem",
        border: "1px solid var(--color-border, #e2e8f0)",
        padding: "0.875rem 1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <h1
        style={{
          fontSize: "1.125rem",
          fontWeight: 800,
          color: "var(--color-foreground, #1e293b)",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        Dashboard
      </h1>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-muted, #64748b)",
          margin: "0.125rem 0 0",
        }}
      >
        Welcome back, {userName}
      </p>
    </div>
  );
}
