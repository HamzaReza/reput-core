"use client";

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "clamp(1.25rem, 4vw, 2rem)", backgroundColor: "#f8fafc", minHeight: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.25rem" }}>
          Analytics
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
          Insights and performance metrics across all scans.
        </p>
      </div>

      <div
        className="glass glow-border"
        style={{
          borderRadius: "0.875rem",
          padding: "3rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.375rem" }}>
            Analytics Coming Soon
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0, maxWidth: "360px" }}>
            Detailed scan analytics, trend reports, and reputation scoring history will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
