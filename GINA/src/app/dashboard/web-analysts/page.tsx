"use client";

import { WebAnalyst, webAnalystsApi } from "@/lib/api";
import { useEffect, useState } from "react";

function getInitials(name: string, email: string) {
  const source = name || email;
  return source
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WebAnalystsPage() {
  const [list, setList] = useState<WebAnalyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    webAnalystsApi
      .list()
      .then(setList)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load web analysts."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        padding: "clamp(1.25rem, 4vw, 2rem)",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--color-foreground, #1e293b)",
          margin: "0 0 1.25rem",
        }}
      >
        Web Analysts
      </h1>

      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", overflowX: "auto" }}
      >
        <div style={{ minWidth: "600px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 130px",
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid var(--color-border, #e2e8f0)",
              backgroundColor: "#f8fafc",
            }}
          >
            {["Name", "Email", "Joined"].map((h) => (
              <p
                key={h}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--color-muted, #64748b)",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </p>
            ))}
          </div>

          {loading && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
                Loading web analysts…
              </p>
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "#ef4444", margin: 0 }}>{error}</p>
            </div>
          )}
          {!loading && !error && list.length === 0 && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
                No web analysts found.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            list.map((emp, i) => {
              const isLast = i === list.length - 1;
              return (
                <div
                  key={emp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 130px",
                    padding: "0.875rem 1.25rem",
                    alignItems: "center",
                    borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(72,212,184,0.12)",
                        color: "#48D4B8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(emp.name, emp.email)}
                    </div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--color-foreground, #1e293b)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {emp.name}
                    </p>
                  </div>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-muted, #64748b)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {emp.email}
                  </p>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-muted, #64748b)",
                      margin: 0,
                    }}
                  >
                    {formatDate(emp.created_at)}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
