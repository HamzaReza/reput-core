"use client";

import { useEffect, useState } from "react";
import { meetings, type Meeting } from "@/lib/api";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  upcoming: { bg: "rgba(76,175,80,0.12)", color: "#4CAF50" },
  completed: { bg: "rgba(255,255,255,0.06)", color: "var(--color-muted)" },
  cancelled: { bg: "rgba(255,61,0,0.10)", color: "#FF6B4A" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MeetingsTab() {
  const [meetingList, setMeetingList] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetings
      .getMy()
      .then(setMeetingList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="glass glow-border animate-scale-in"
      style={{ borderRadius: "0.875rem", padding: "2rem" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          Meetings
        </h2>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
          Your past, current, and upcoming sessions with the RepuTrust team.
        </p>
      </div>

      {/* Meetings list */}
      {loading ? (
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center" }}>
          Loading meetings…
        </p>
      ) : meetingList.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center" }}>
          No meetings yet. Run a scan to schedule one.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {meetingList.map((m) => {
            const colors = STATUS_COLORS[m.status] ?? STATUS_COLORS.completed;
            return (
              <div
                key={m.id}
                className="glass"
                style={{
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                      {m.title}
                    </span>
                    {m.event_type && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "0.15rem 0.6rem",
                          borderRadius: "9999px",
                          backgroundColor: "rgba(255,255,255,0.07)",
                          color: "var(--color-muted)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {m.event_type}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "0.2rem 0.75rem",
                      borderRadius: "9999px",
                      backgroundColor: colors.bg,
                      color: colors.color,
                    }}
                  >
                    {m.status}
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                  {formatDate(m.start_time)} — {formatDate(m.end_time)}
                </p>
                {m.attendees.length > 0 && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    {m.attendees.map((a) => a.name || a.email).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
