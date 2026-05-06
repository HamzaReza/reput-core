"use client";

import { User, users } from "@/lib/api";
import { useEffect, useState } from "react";

function getInitials(name: string | null, email: string) {
  const source = name || email;
  return source
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersPage() {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    users
      .list()
      .then(setUserList)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load users."),
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
      <div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--color-foreground, #1e293b)",
            margin: "0 0 0.25rem",
          }}
        >
          Users
        </h1>
      </div>

      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", overflowX: "auto" }}
      >
        <div style={{ minWidth: "900px" }}>
          {/* Table header — hidden on mobile */}
          <div
            className="users-table-header"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 100px 110px 120px",
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid var(--color-border, #e2e8f0)",
              backgroundColor: "#f8fafc",
            }}
          >
            {["Name", "Email", "Plan", "Profile", "Joined"].map((h) => (
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

          {/* States */}
          {loading && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-muted, #64748b)",
                  margin: 0,
                }}
              >
                Loading users…
              </p>
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "#ef4444", margin: 0 }}>
                {error}
              </p>
            </div>
          )}
          {!loading && !error && userList.length === 0 && (
            <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-muted, #64748b)",
                  margin: 0,
                }}
              >
                No users found.
              </p>
            </div>
          )}

          {/* Rows */}
          {!loading &&
            !error &&
            userList.map((user, i) => {
              const isLast = i === userList.length - 1;
              return (
                <div
                  key={user.id}
                  className="users-table-row"
                  style={{
                    padding: "0.875rem 1.25rem",
                    alignItems: "center",
                    borderBottom: isLast
                      ? "none"
                      : "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  {/* Name + avatar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      minWidth: 0,
                    }}
                  >
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
                      {getInitials(user.name, user.email)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "var(--color-foreground, #1e293b)",
                          margin: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.name ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
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
                    {user.email}
                  </p>

                  {/* Plan */}
                  {user.plan ? (
                    <span
                      style={{
                        display: "inline-flex",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: user.plan === "pro" ? "#4479da" : "#64748b",
                        backgroundColor:
                          user.plan === "pro" ? "#eff6ff" : "#f1f5f9",
                        borderRadius: "999px",
                        padding: "0.2rem 0.55rem",
                        width: "fit-content",
                        textTransform: "capitalize",
                      }}
                    >
                      {user.plan}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-muted, #64748b)",
                      }}
                    >
                      —
                    </span>
                  )}

                  {/* Profile complete */}
                  <span
                    style={{
                      display: "inline-flex",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: user.profile_complete ? "#22c55e" : "#ef4444",
                      backgroundColor: user.profile_complete
                        ? "#f0fdf4"
                        : "#fef2f2",
                      borderRadius: "999px",
                      padding: "0.2rem 0.55rem",
                      width: "fit-content",
                    }}
                  >
                    {user.profile_complete ? "Complete" : "Incomplete"}
                  </span>

                  {/* Joined */}
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-muted, #64748b)",
                      margin: 0,
                    }}
                  >
                    {formatDate(user.created_at)}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      <style>{`
        .users-table-header { display: grid !important; }
        .users-table-row    { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 100px 110px 120px; }
      `}</style>
    </div>
  );
}
