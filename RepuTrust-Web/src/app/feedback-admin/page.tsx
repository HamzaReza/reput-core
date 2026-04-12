"use client";

import { feedback, type FeedbackItem } from "@/lib/api";
import { useEffect, useState } from "react";

export default function FeedbackAdminPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    feedback
      .list()
      .then(setItems)
      .catch(() => setError("Failed to load feedback."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background, #0a0a0f)",
        color: "var(--color-foreground, #fff)",
        padding: "2rem 1.25rem",
        maxWidth: "640px",
        margin: "0 auto",
        fontFamily: "inherit",
      }}
    >
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: "0.25rem",
        }}
      >
        User Feedback
      </h1>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "rgba(255,255,255,0.45)",
          marginBottom: "2rem",
        }}
      >
        {items.length} response{items.length !== 1 ? "s" : ""}
      </p>

      {loading && (
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>
          Loading…
        </p>
      )}

      {error && (
        <p style={{ color: "#FF6B4A", fontSize: "0.875rem" }}>{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>
          No feedback yet.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "1rem 1.25rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.88)",
                margin: "0 0 0.625rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {item.message}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {item.email && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(72,212,184,0.7)",
                    fontFamily: "ui-monospace, 'SF Mono', monospace",
                  }}
                >
                  {item.email}
                </span>
              )}
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "ui-monospace, 'SF Mono', monospace",
                }}
              >
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
