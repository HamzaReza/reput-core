"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { auth, isAuthed, users } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const plans = [
  {
    name: "Basic Scan",
    price: "Free",
    description:
      "Self-service scanning for individuals monitoring their own name.",
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
    description:
      "Continuous monitoring with alerts for professionals and public figures.",
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
];

export default function QuotePage() {
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthed()) {
      auth
        .me()
        .then((user) => setUserPlan(user.plan))
        .catch(() => {});
    }
  }, []);

  const isPro = userPlan === "pro";

  const handleStartTrial = async () => {
    if (!isAuthed()) {
      router.push("/auth");
      return;
    }
    setTrialLoading(true);
    setTrialError("");
    try {
      await users.startTrial();
      router.push("/dashboard");
    } catch (e) {
      setTrialError(
        e instanceof Error ? e.message : "Could not activate trial.",
      );
    } finally {
      setTrialLoading(false);
    }
  };

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
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            padding: "2rem 1.5rem",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1
              className="neon-text"
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              Removal Plans
            </h1>
            <p
              style={{
                color: "var(--color-muted)",
                maxWidth: "32rem",
                margin: "0 auto",
              }}
            >
              From self-service scanning to fully managed content removal — pick
              the plan that fits your needs.
            </p>
          </div>

          {/* Pricing Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
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
                    ? "rgba(68,121,218,0.06)"
                    : "var(--color-surface)",
                  border: plan.highlight
                    ? "1px solid rgba(68,121,218,0.35)"
                    : "1px solid var(--color-border)",
                }}
              >
                {plan.highlight && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-0.75rem",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
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
                      color: plan.highlight
                        ? "var(--color-primary)"
                        : "var(--color-foreground)",
                      marginBottom: "0.5rem",
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                    flex: 1,
                  }}
                >
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
                      <span
                        style={{
                          color: "var(--color-primary)",
                          flexShrink: 0,
                          marginTop: "0.05rem",
                        }}
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isPro}
                  onClick={() => {
                    if (isPro) return;
                    if (plan.cta === "Request a Quote")
                      router.push("/quote/request");
                    else if (plan.cta === "Start Pro Trial") handleStartTrial();
                  }}
                  className={plan.highlight && !isPro ? "glow-button" : ""}
                  style={
                    isPro
                      ? {
                          width: "100%",
                          fontWeight: 700,
                          padding: "0.75rem",
                          borderRadius: "0.625rem",
                          border: "1px solid rgba(68,121,218,0.2)",
                          backgroundColor: "rgba(68,121,218,0.08)",
                          color: "var(--color-muted)",
                          cursor: "not-allowed",
                          fontSize: "0.9375rem",
                          opacity: 0.6,
                        }
                      : plan.highlight
                        ? {
                            fontWeight: 700,
                            padding: "0.75rem",
                            borderRadius: "0.625rem",
                            transition: "all 0.3s",
                            width: "100%",
                            cursor: "pointer",
                          }
                        : {
                            width: "100%",
                            fontWeight: 700,
                            padding: "0.75rem",
                            borderRadius: "0.625rem",
                            border: "1px solid rgba(68,121,218,0.35)",
                            backgroundColor: "transparent",
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            fontSize: "0.9375rem",
                          }
                  }
                >
                  {plan.cta === "Start Pro Trial" && trialLoading
                    ? "Activating…"
                    : plan.cta}
                </button>
                {plan.cta === "Start Pro Trial" && trialError && (
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#FF6B4A",
                      marginTop: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    {trialError}
                  </p>
                )}
              </div>
            ))}
          </div>

          {isPro && (
            <div
              style={{
                textAlign: "center",
                padding: "1rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(68,121,218,0.4)",
                backgroundColor: "rgba(68,121,218,0.08)",
                maxWidth: "28rem",
                margin: "0 auto",
              }}
            >
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--color-foreground)",
                  margin: 0,
                }}
              >
                You are currently subscribed to the{" "}
                <span style={{ color: "var(--color-primary)" }}>
                  Pro Monitor
                </span>{" "}
                plan.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
