"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { meetings, isAuthed, type Meeting } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tab = "upcoming" | "past";

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  upcoming: { bg: "rgba(74,143,212,0.15)", color: "#4a8fd4", label: "Upcoming" },
  completed: { bg: "rgba(47,184,176,0.15)", color: "#2fb8b0", label: "Completed" },
  cancelled: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Cancelled" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const badge = STATUS_COLORS[meeting.status] ?? STATUS_COLORS.upcoming;
  const isPast = meeting.status === "completed" || meeting.status === "cancelled";

  return (
    <div
      style={{
        borderRadius: "0.875rem",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        opacity: isPast ? 0.85 : 1,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: "0.9375rem",
              color: "var(--color-foreground)",
              marginBottom: "0.25rem",
              wordBreak: "break-word",
            }}
          >
            {meeting.title}
          </p>
          {meeting.event_type && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {meeting.event_type}
            </p>
          )}
        </div>
        <span
          style={{
            flexShrink: 0,
            padding: "0.2rem 0.65rem",
            borderRadius: "999px",
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            backgroundColor: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--color-border)" }} />

      {/* Date / time row */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-foreground)" }}>{formatDate(meeting.start_time)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-foreground)" }}>
            {formatTime(meeting.start_time)} – {formatTime(meeting.end_time)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MeetingPage() {
  const router = useRouter();
  const hasLoadedRef = useRef(false);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed()) { router.replace("/login"); return; }
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    meetings.getMy()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [router]);

  const now = new Date();
  const upcoming = data.filter((m) => m.status === "upcoming" && new Date(m.start_time) >= now);
  const past = data.filter((m) => m.status !== "upcoming" || new Date(m.start_time) < now);
  const shown = tab === "upcoming" ? upcoming : past;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    borderRadius: "999px",
    border: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.15s",
    backgroundColor: active ? "var(--color-button)" : "transparent",
    color: active ? "#fff" : "var(--color-muted)",
  });

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
      <main
        style={{
          flex: 1,
          paddingTop: "5rem",
          paddingBottom: "3rem",
        }}
      >
        <div
          style={{
            maxWidth: "42rem",
            margin: "0 auto",
            padding: "1.5rem clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.375rem",
              color: "var(--color-foreground)",
            }}
          >
            Meetings
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            Your scheduled sessions with the RepuTrust team.
          </p>

          {/* Tabs */}
          <div
            style={{
              display: "inline-flex",
              gap: "0.25rem",
              padding: "0.25rem",
              borderRadius: "999px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              marginBottom: "1.5rem",
            }}
          >
            <button style={tabStyle(tab === "upcoming")} onClick={() => setTab("upcoming")}>
              Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
            </button>
            <button style={tabStyle(tab === "past")} onClick={() => setTab("past")}>
              Past {past.length > 0 && `(${past.length})`}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-muted)" }}>
              Loading…
            </div>
          ) : shown.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                color: "var(--color-muted)",
                border: "1px dashed var(--color-border)",
                borderRadius: "0.875rem",
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-foreground)" }}>
                No {tab} meetings
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                {tab === "upcoming"
                  ? "You have no upcoming sessions booked."
                  : "No past meetings on record yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {shown.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
