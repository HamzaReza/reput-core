"use client";

import Header from "@/components/common/Header";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Basic Scan",
    price: "Free",
    description: "Self-service scanning for individuals monitoring their own name.",
    features: [
      "1 scan per month",
      "Up to 3 keywords",
      "Top 50 results per scan",
      "Risk scoring (Critical / High / Medium)",
      "In-app results only",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro Monitor",
    price: "$29 / mo",
    description: "Continuous monitoring with alerts for professionals and public figures.",
    features: [
      "Unlimited scans",
      "Up to 20 keywords",
      "Full results (500+ sources)",
      "Weekly email digests",
      "Downloadable PDF reports",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlight: true,
  },
  {
    name: "Removal Service",
    price: "Custom",
    description: "Managed takedowns and de-indexing for damaging content found in your scan.",
    features: [
      "Everything in Pro",
      "Dedicated removal specialist",
      "DMCA & de-indexing requests filed",
      "Google suppression strategy",
      "Monthly progress reports",
      "SLA-backed response times",
    ],
    cta: "Request a Quote",
    highlight: false,
  },
];

export default function QuotePage() {
  const router = useRouter();

  return (
    <div
      className="grid-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--color-background)",
      }}
    >
      <Header />
      <main style={{ flex: 1, paddingTop: "4.5rem" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1
              className="neon-text"
              style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.75rem" }}
            >
              Removal Plans
            </h1>
            <p style={{ color: "var(--color-muted)", maxWidth: "32rem", margin: "0 auto" }}>
              From self-service scanning to fully managed content removal — pick the plan that fits your needs.
            </p>
          </div>

          {/* Pricing Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.5rem",
              marginBottom: "3rem",
            }}
          >
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={plan.highlight ? "glow-border" : "glass glow-border"}
                style={{
                  borderRadius: "0.875rem",
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  position: "relative",
                  backgroundColor: plan.highlight
                    ? "rgba(78,205,196,0.06)"
                    : "rgba(255,255,255,0.03)",
                  border: plan.highlight
                    ? "1px solid rgba(78,205,196,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {plan.highlight && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-0.75rem",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#4ECDC4",
                      color: "#000",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.875rem",
                      borderRadius: "9999px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most Popular
                  </span>
                )}

                <div>
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "var(--color-foreground)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {plan.name}
                  </h2>
                  <p
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: plan.highlight ? "#4ECDC4" : "var(--color-foreground)",
                      marginBottom: "0.5rem",
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
                    {plan.description}
                  </p>
                </div>

                <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.625rem",
                        fontSize: "0.875rem",
                        color: "var(--color-foreground)",
                      }}
                    >
                      <span style={{ color: "#4ECDC4", flexShrink: 0, marginTop: "0.05rem" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => plan.cta === "Request a Quote" ? router.push("/quote/request") : undefined}
                  className={plan.highlight ? "glow-button" : ""}
                  style={
                    plan.highlight
                      ? { fontWeight: 700, padding: "0.75rem", borderRadius: "0.5rem", transition: "all 0.3s", width: "100%", cursor: "pointer" }
                      : {
                          width: "100%",
                          fontWeight: 700,
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid rgba(78,205,196,0.4)",
                          backgroundColor: "transparent",
                          color: "#4ECDC4",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          fontSize: "0.9375rem",
                        }
                  }
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

        </div>
      </main>

      <footer
        style={{
          padding: "2rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            textAlign: "center",
            color: "var(--color-muted)",
            fontSize: "0.875rem",
          }}
        >
          <p>&copy; 2025 RepuTrust. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
