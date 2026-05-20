"use client";

import {
  ClientAddEventPayload,
  ClientDetail,
  ClientEventType,
  clientsApi,
  isAdmin,
  WebAnalystItem,
  webAnalysts,
} from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ── Meta ───────────────────────────────────────────────────────────────────────

const EVENT_META: Record<
  ClientEventType,
  { label: string; color: string; dot: string }
> = {
  research: { label: "Researched", color: "#64748b", dot: "#94a3b8" },
  scan: { label: "Scan Complete", color: "#4479da", dot: "#4479da" },
  quote_sent: { label: "Quote Sent", color: "#d97706", dot: "#f59e0b" },
  quote_accepted: { label: "Quote Accepted", color: "#22c55e", dot: "#22c55e" },
  quote_rejected: { label: "Quote Rejected", color: "#ef4444", dot: "#ef4444" },
  contract_created: {
    label: "Contract Created",
    color: "#8b5cf6",
    dot: "#8b5cf6",
  },
  meeting_set: { label: "Meeting Set", color: "#48D4B8", dot: "#48D4B8" },
};

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

function riskFromScore(s: number) {
  if (s >= 86) return "Good";
  if (s >= 61) return "Mediocre";
  if (s >= 26) return "Poor";
  return "Negative";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function summarizeEventData(
  eventType: ClientEventType,
  data: Record<string, unknown>,
): string {
  if (eventType === "research") {
    const summary = data.summary as string | undefined;
    const keywords = data.keywords as string[] | undefined;
    return [summary, keywords?.length ? `Keywords: ${keywords.join(", ")}` : ""]
      .filter(Boolean)
      .join(" | ");
  }
  if (eventType === "scan") {
    const score = data.score as number | undefined;
    const linksCount = data.links_count as number | undefined;
    const negativeCount = data.negative_count as number | undefined;
    const headline = (data.summary as { headline?: string } | undefined)
      ?.headline;
    return [
      score !== undefined ? `Score: ${score}` : "",
      linksCount !== undefined ? `Sources: ${linksCount}` : "",
      negativeCount !== undefined ? `Flagged: ${negativeCount}` : "",
      headline ? `Headline: ${headline}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }
  if (eventType === "quote_sent") {
    return [
      data.plan_type ? `Plan: ${String(data.plan_type)}` : "",
      data.amount ? `Amount: $${String(data.amount)}` : "",
      data.message ? `Message: ${String(data.message)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }
  return [
    data.notes ? String(data.notes) : "",
    data.reason ? String(data.reason) : "",
    data.date ? `Date: ${String(data.date)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.875rem",
  borderRadius: "0.875rem",
  border: "1px solid var(--color-border, #e2e8f0)",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9rem",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 500,
  color: "var(--color-muted, #64748b)",
  marginBottom: "0.375rem",
};

const PLAN_TYPES = ["Basic", "Professional", "Enterprise", "Custom"];

// ── Event detail renderers ─────────────────────────────────────────────────────

function ResearchDetail({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as string | undefined;
  const keywords = data.keywords as string[] | undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {summary && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {summary}
        </p>
      )}
      {keywords && keywords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {keywords.map((kw) => (
            <span
              key={kw}
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.6rem",
                borderRadius: "999px",
                backgroundColor: "rgba(68,121,218,0.08)",
                color: "#4479da",
                border: "1px solid rgba(68,121,218,0.2)",
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScanDetail({
  data,
  router,
  eventId,
}: {
  data: Record<string, unknown>;
  router: ReturnType<typeof useRouter>;
  eventId?: string;
}) {
  const [linksExpanded, setLinksExpanded] = useState(false);

  const score = data.score as number | undefined;
  const linksCount = data.links_count as number | undefined;
  const negCount = data.negative_count as number | undefined;
  const summary = data.summary as { headline?: string } | null | undefined;
  const keywords = data.keywords as string[] | undefined;
  const leadId = data.lead_id as string | undefined;
  const links = data.links as
    | Array<{
        url: string;
        title: string;
        source: string;
        sentiment: string;
        risk: string;
      }>
    | undefined;

  const risk = score !== undefined ? riskFromScore(score) : null;
  const color = risk ? RISK_COLORS[risk] : "#94a3b8";

  const SENTIMENT_COLORS: Record<string, string> = {
    negative: "#ef4444",
    positive: "#22c55e",
    neutral: "#94a3b8",
  };
  const RISK_BADGE_COLORS: Record<string, string> = {
    high: "#ef4444",
    medium: "#f97316",
    low: "#eab308",
    none: "#94a3b8",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {score !== undefined && risk && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color,
              backgroundColor: color + "18",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
            }}
          >
            {risk}
          </span>
          {linksCount !== undefined && (
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {linksCount} sources · {negCount ?? 0} flagged
            </span>
          )}
        </div>
      )}
      {summary?.headline && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          "{summary.headline}"
        </p>
      )}
      {keywords && keywords.length > 0 && data.useKeywords !== false && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {keywords.map((kw) => (
            <span
              key={kw}
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.6rem",
                borderRadius: "999px",
                backgroundColor: "rgba(68,121,218,0.08)",
                color: "#4479da",
                border: "1px solid rgba(68,121,218,0.2)",
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {links && links.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setLinksExpanded((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#4479da",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: linksExpanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {linksExpanded ? "Hide" : "Show"} {links.length} links
          </button>
          {linksExpanded && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              {links.map((link, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.625rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                  }}
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      ((
                        e.currentTarget as HTMLAnchorElement
                      ).style.textDecoration = "underline")
                    }
                    onMouseLeave={(e) =>
                      ((
                        e.currentTarget as HTMLAnchorElement
                      ).style.textDecoration = "none")
                    }
                  >
                    {link.title || link.url}
                  </a>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {link.source && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {link.source}
                      </span>
                    )}
                    {link.sentiment && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor:
                            (SENTIMENT_COLORS[link.sentiment] ?? "#94a3b8") +
                            "18",
                          color: SENTIMENT_COLORS[link.sentiment] ?? "#94a3b8",
                          border: `1px solid ${SENTIMENT_COLORS[link.sentiment] ?? "#94a3b8"}40`,
                          fontWeight: 600,
                        }}
                      >
                        {link.sentiment}
                      </span>
                    )}
                    {link.risk && link.risk !== "none" && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor:
                            (RISK_BADGE_COLORS[link.risk] ?? "#94a3b8") + "18",
                          color: RISK_BADGE_COLORS[link.risk] ?? "#94a3b8",
                          border: `1px solid ${RISK_BADGE_COLORS[link.risk] ?? "#94a3b8"}40`,
                          fontWeight: 600,
                        }}
                      >
                        {link.risk} risk
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {leadId && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({ lead: leadId });
            if (eventId) params.set("event", eventId);
            router.push(`/dashboard/ealuminate?${params.toString()}`);
          }}
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.35rem 0.875rem",
            borderRadius: "999px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "1.5px solid #4479da",
            backgroundColor: "transparent",
            color: "#4479da",
            marginTop: "0.25rem",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View in Ealuminate
        </button>
      )}
    </div>
  );
}

function QuoteSentDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {!!data.plan_type && (
        <p style={{ fontSize: "0.8125rem", color: "#475569", margin: 0 }}>
          <strong>Plan:</strong> {String(data.plan_type)}
        </p>
      )}
      {!!data.amount && (
        <p style={{ fontSize: "0.8125rem", color: "#475569", margin: 0 }}>
          <strong>Amount:</strong> ${String(data.amount)}
        </p>
      )}
      {!!data.message && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {String(data.message)}
        </p>
      )}
    </div>
  );
}

function NoteDetail({ data }: { data: Record<string, unknown> }) {
  const text = data.notes || data.reason;
  if (!text && !data.date) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {!!data.date && (
        <p style={{ fontSize: "0.8125rem", color: "#475569", margin: 0 }}>
          <strong>Date:</strong> {fmtDate(String(data.date))}
        </p>
      )}
      {!!text && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {String(text)}
        </p>
      )}
    </div>
  );
}

// ── Quote history card ─────────────────────────────────────────────────────────

function QuoteHistory({ events }: { events: ClientDetail["events"] }) {
  const quoteEvents = events.filter(
    (e) =>
      e.event_type === "quote_sent" ||
      e.event_type === "quote_accepted" ||
      e.event_type === "quote_rejected",
  );
  if (quoteEvents.length === 0) return null;

  return (
    <div
      className="glass glow-border"
      style={{
        borderRadius: "0.875rem",
        padding: "1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <p
        style={{
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--color-foreground, #1e293b)",
          margin: "0 0 1rem",
        }}
      >
        Quote History
      </p>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}
      >
        {quoteEvents.map((e) => {
          const meta = EVENT_META[e.event_type as ClientEventType];
          const data = e.data ?? {};
          return (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.625rem",
                backgroundColor: "#f8fafc",
                border: "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  minWidth: 0,
                }}
              >
                {e.event_type === "quote_sent" && (
                  <>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      {data.plan_type ? String(data.plan_type) : "Quote"}
                      {data.amount ? ` · $${data.amount}` : ""}
                    </p>
                    {data.message && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "#64748b",
                        }}
                      >
                        {String(data.message)}
                      </p>
                    )}
                  </>
                )}
                {(e.event_type === "quote_accepted" ||
                  e.event_type === "quote_rejected") && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </p>
                )}
                {!!data.notes && e.event_type !== "quote_sent" && (
                  <p
                    style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}
                  >
                    {String(data.notes)}
                  </p>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "0.25rem",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: meta.color,
                    backgroundColor: meta.color + "18",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                  }}
                >
                  {meta.label}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                  {formatDateTime(e.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Action panel ───────────────────────────────────────────────────────────────

type FormMode = "quote" | "accepted" | "rejected" | "contract" | null;

function ActionPanel({
  lastEventType,
  onSubmit,
  submitting,
}: {
  lastEventType: ClientEventType | undefined;
  onSubmit: (payload: ClientAddEventPayload) => Promise<void>;
  submitting: boolean;
}) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [planType, setPlanType] = useState("Professional");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  const resetForm = () => {
    setFormMode(null);
    setMessage("");
    setAmount("");
    setNotes("");
    setMeetingDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let payload: ClientAddEventPayload;
    if (formMode === "quote") {
      payload = {
        event_type: "quote_sent",
        event_data: {
          plan_type: planType,
          message,
          amount: parseFloat(amount),
        },
      };
    } else if (formMode === "accepted") {
      payload = { event_type: "quote_accepted", event_data: { notes } };
    } else if (formMode === "rejected") {
      payload = { event_type: "quote_rejected", event_data: { reason: notes } };
    } else if (formMode === "contract") {
      payload = {
        event_type: "contract_created",
        event_data: { notes, date: meetingDate },
      };
    } else return;
    await onSubmit(payload);
    resetForm();
  };

  if (lastEventType === "quote_sent") {
    return (
      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", padding: "1.25rem" }}
      >
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
              animation: "pulse 1.5s infinite",
              flexShrink: 0,
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#d97706",
            }}
          >
            Waiting for quote response…
          </p>
        </div>
      </div>
    );
  }

  if (lastEventType === "contract_created") {
    return (
      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", padding: "1.25rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#8b5cf6",
            }}
          >
            Contract created — client onboarded
          </p>
        </div>
      </div>
    );
  }

  const showQuote =
    lastEventType === "scan" || lastEventType === "quote_rejected";
  const showContract = lastEventType === "quote_accepted";

  if (!showQuote && !showContract) return null;

  return (
    <div
      className="glass glow-border"
      style={{ borderRadius: "0.875rem", padding: "1.25rem" }}
    >
      <p
        style={{
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--color-foreground, #1e293b)",
          margin: "0 0 0.875rem",
        }}
      >
        Next Step
      </p>

      {showQuote && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <button
              disabled
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                border: "1.5px solid #e2e8f0",
                cursor: "not-allowed",
                opacity: 0.4,
                backgroundColor: "#f8fafc",
                color: "#94a3b8",
              }}
            >
              {lastEventType === "quote_rejected"
                ? "Create New Quote"
                : "Create Quote"}
            </button>
          </div>
          {formMode === "quote" && (
            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              <div>
                <label style={labelStyle}>Plan Type</label>
                <select
                  required
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {PLAN_TYPES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any notes about this quote…"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="glow-button"
                style={{
                  padding: "0.6rem 1.25rem",
                  fontWeight: 700,
                  borderRadius: "999px",
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? "default" : "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {submitting ? "Sending…" : "Send Quote"}
              </button>
            </form>
          )}
        </div>
      )}

      {showContract && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div>
            <button
              onClick={() =>
                setFormMode(formMode === "contract" ? null : "contract")
              }
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                border: "1.5px solid",
                cursor: "pointer",
                borderColor: formMode === "contract" ? "#8b5cf6" : "#e2e8f0",
                backgroundColor:
                  formMode === "contract" ? "rgba(139,92,246,0.08)" : "#fff",
                color: formMode === "contract" ? "#8b5cf6" : "#1e293b",
              }}
            >
              Create Contract
            </button>
          </div>
          {formMode === "contract" && (
            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              <div>
                <label style={labelStyle}>Contract Date</label>
                <input
                  required
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contract details, scope, terms…"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.6rem 1.25rem",
                  fontWeight: 700,
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  border: "none",
                  backgroundColor: "#8b5cf6",
                  color: "#fff",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  alignSelf: "flex-start",
                }}
              >
                {submitting ? "Creating…" : "Confirm Contract"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const adminView = isAdmin();
  const [analystsList, setAnalystsList] = useState<WebAnalystItem[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignId, setReassignId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  const reload = async () => {
    const data = await clientsApi.get(id).catch(() => null);
    if (data) setClient(data);
  };

  useEffect(() => {
    clientsApi
      .get(id)
      .then(setClient)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (adminView)
      webAnalysts
        .list()
        .then(setAnalystsList)
        .catch(() => {});
  }, [adminView]);

  const handleReassign = async () => {
    setReassigning(true);
    try {
      await clientsApi.assign(id, reassignId || null);
      setReassignOpen(false);
      await reload();
    } catch {
      /* non-fatal */
    } finally {
      setReassigning(false);
    }
  };

  const handleAddEvent = async (payload: ClientAddEventPayload) => {
    setSubmitting(true);
    try {
      await clientsApi.addEvent(id, payload);
      await reload();
    } catch {
      /* non-fatal */
    } finally {
      setSubmitting(false);
    }
  };

  const hasSimulatedRef = useRef(false);
  const THREE_MIN_MS = 30 * 1000;
  useEffect(() => {
    if (!client) return;
    const lastEvent = client.events[client.events.length - 1];
    if (lastEvent?.event_type !== "quote_sent") {
      hasSimulatedRef.current = false; // reset so next quote can be simulated
      return;
    }
    if (hasSimulatedRef.current) return; // already fired for this quote

    const elapsed = Date.now() - new Date(lastEvent.created_at).getTime();
    const delay = Math.max(0, THREE_MIN_MS - elapsed);

    const timer = setTimeout(async () => {
      hasSimulatedRef.current = true; // block re-entry before async work starts
      const accepted = Math.random() < 0.5;
      await handleAddEvent(
        accepted
          ? {
              event_type: "quote_accepted",
              event_data: { notes: "Auto-simulated acceptance (dev)" },
            }
          : {
              event_type: "quote_rejected",
              event_data: { reason: "Auto-simulated rejection (dev)" },
            },
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [client]);

  if (loading) {
    return (
      <div
        style={{
          padding: "clamp(1.25rem, 4vw, 2rem)",
          backgroundColor: "#f8fafc",
          minHeight: "100%",
        }}
      >
        <div
          style={{
            height: 20,
            width: "30%",
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
            marginBottom: "0.5rem",
          }}
        />
        <div
          style={{
            height: 14,
            width: "20%",
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
          }}
        />
      </div>
    );
  }

  if (!client) {
    return (
      <div
        style={{
          padding: "clamp(1.25rem, 4vw, 2rem)",
          backgroundColor: "#f8fafc",
          minHeight: "100%",
        }}
      >
        <p style={{ color: "var(--color-muted, #64748b)" }}>
          Client not found.
        </p>
      </div>
    );
  }

  const lastEventType = client.events[client.events.length - 1]?.event_type as
    | ClientEventType
    | undefined;
  const handleExportTimelinePdf = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const timelineRows = client.events
      .map((event) => {
        const meta = EVENT_META[event.event_type as ClientEventType] ?? {
          label: event.event_type,
          color: "#64748b",
          dot: "#94a3b8",
        };
        const details = summarizeEventData(
          event.event_type as ClientEventType,
          (event.data ?? {}) as Record<string, unknown>,
        );
        return `<div class="tl-row">
          <div style="display:flex;justify-content:space-between;gap:0.75rem;margin-bottom:0.2rem;">
            <span style="font-weight:700;font-size:11px;border-radius:999px;padding:2px 8px;letter-spacing:0.01em;white-space:nowrap;background:${meta.color}18;color:${meta.color};border:1px solid ${meta.color}40;">${escapeHtml(meta.label)}</span>
            <span style="color:#64748b;font-size:11px;white-space:nowrap;">${escapeHtml(formatDateTime(event.created_at))}</span>
          </div>
          ${details ? `<p style="margin:0;color:#475569;font-size:12px;line-height:1.55;">${escapeHtml(details)}</p>` : ""}
        </div>`;
      })
      .join("");

    const filename = `client-timeline-${client.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}.pdf`;

    const css = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      .tl-wrap {
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        width: 760px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem;
        color: #1e293b;
        line-height: 1.55;
      }
      .tl-row {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.72rem 0.85rem;
        margin-bottom: 0.55rem;
        background: #f8fafc;
      }
      .tl-footer {
        margin-top: 1.3rem;
        padding-top: 0.7rem;
        border-top: 1px solid #e2e8f0;
        color: #94a3b8;
        font-size: 11px;
      }
    `;

    const bodyHtml = `
      <div class="tl-wrap">
        <h1 style="margin:0 0 0.25rem;font-size:1.3rem;letter-spacing:-0.01em;">Client Timeline</h1>
        <p style="margin:0 0 1.1rem;color:#64748b;font-size:0.86rem;">${escapeHtml(client.name)}${client.company ? ` · ${escapeHtml(client.company)}` : ""}${client.country ? ` · ${escapeHtml(client.country)}` : ""}</p>
        ${timelineRows || "<p>No timeline events available.</p>"}
        <p class="tl-footer">Generated by GINA · ${new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:-9999px;top:0;z-index:-1;background:#f8fafc;padding:24px;";
    container.innerHTML = bodyHtml;
    document.body.appendChild(container);

    const wrap = container.querySelector(".tl-wrap") as HTMLElement;

    try {
      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pdfW;

      let remaining = imgH;
      let yOffset = 0;

      pdf.addImage(imgData, "JPEG", 0, yOffset, pdfW, imgH);
      remaining -= pdfH;

      while (remaining > 0) {
        yOffset -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, yOffset, pdfW, imgH);
        remaining -= pdfH;
      }

      pdf.save(filename);
    } finally {
      document.head.removeChild(style);
      document.body.removeChild(container);
    }
  };

  return (
    <div
      style={{
        padding: "clamp(1.25rem, 4vw, 2rem)",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => router.push("/dashboard/clients")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "var(--color-muted, #64748b)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            padding: 0,
            marginBottom: "0.875rem",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          All Clients
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: 0,
            }}
          >
            {client.name}
          </h1>
          <button
            type="button"
            onClick={handleExportTimelinePdf}
            className="glow-button"
            style={{
              borderRadius: "999px",
              padding: "0.45rem 0.8rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Export Timeline PDF
          </button>
        </div>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-muted, #64748b)",
            margin: 0,
          }}
        >
          {[client.company, client.country].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div style={{ maxWidth: "42rem" }}>
        {/* Admin-only: assignment info + reassign */}
        {adminView && (
          <div
            className="glass glow-border"
            style={{
              borderRadius: "0.875rem",
              padding: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--color-foreground, #1e293b)",
                margin: "0 0 0.875rem",
              }}
            >
              Assignment Info
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "0.875rem",
              }}
            >
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    minWidth: 140,
                  }}
                >
                  Researched by
                </span>
                <span style={{ fontSize: "0.8125rem", color: "#1e293b" }}>
                  {client.researched_by_name ?? "—"}
                  {client.researched_by_role && (
                    <span
                      style={{
                        marginLeft: "0.375rem",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        color: "#4479da",
                        backgroundColor: "rgba(68,121,218,0.08)",
                        padding: "0.1rem 0.5rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(68,121,218,0.2)",
                      }}
                    >
                      {client.researched_by_role}
                    </span>
                  )}
                </span>
              </div>
              {client.scanned_by_name && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#94a3b8",
                      minWidth: 140,
                    }}
                  >
                    Scanned by
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#1e293b" }}>
                    {client.scanned_by_name}
                    {client.scanned_by_role && (
                      <span
                        style={{
                          marginLeft: "0.375rem",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          color: "#4479da",
                          backgroundColor: "rgba(68,121,218,0.08)",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(68,121,218,0.2)",
                        }}
                      >
                        {client.scanned_by_role}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    minWidth: 140,
                  }}
                >
                  Assigned to
                </span>
                <span style={{ fontSize: "0.8125rem", color: "#1e293b" }}>
                  {client.assigned_to_name ?? (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                      Unassigned
                    </span>
                  )}
                </span>
              </div>
            </div>

            {!reassignOpen ? (
              <button
                type="button"
                onClick={() => {
                  setReassignId(client.assigned_to_id ?? "");
                  setReassignOpen(true);
                }}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  border: "1.5px solid #e2e8f0",
                  backgroundColor: "#fff",
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                {client.assigned_to_id ? "Reassign" : "Assign"}
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={reassignId}
                  onChange={(e) => setReassignId(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: "auto",
                    minWidth: 180,
                    flex: 1,
                  }}
                >
                  <option value="">— Unassign —</option>
                  {analystsList
                    .filter((a) => a.role === "analyst")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={reassigning}
                  className="glow-button"
                  style={{
                    padding: "0.4rem 1rem",
                    fontWeight: 700,
                    borderRadius: "999px",
                    fontSize: "0.8125rem",
                    opacity: reassigning ? 0.6 : 1,
                    cursor: reassigning ? "default" : "pointer",
                  }}
                >
                  {reassigning ? "Saving…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setReassignOpen(false)}
                  style={{
                    padding: "0.4rem 0.875rem",
                    borderRadius: "999px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#fff",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action panel (contextual) */}
        <div style={{ marginBottom: "1.25rem" }}>
          <ActionPanel
            lastEventType={lastEventType}
            onSubmit={handleAddEvent}
            submitting={submitting}
          />
        </div>

        {/* Quote history */}
        <QuoteHistory events={client.events} />

        {/* Full timeline */}
        <div
          className="glass glow-border"
          style={{ borderRadius: "0.875rem", padding: "1.5rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 1.25rem",
            }}
          >
            Timeline
          </p>

          {client.events.length === 0 && (
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-muted, #64748b)",
                margin: 0,
              }}
            >
              No events yet.
            </p>
          )}

          <div style={{ position: "relative" }}>
            {client.events.map((event, i) => {
              const meta = EVENT_META[event.event_type as ClientEventType] ?? {
                label: event.event_type,
                color: "#64748b",
                dot: "#94a3b8",
              };
              const isLast = i === client.events.length - 1;
              const data = event.data ?? {};
              return (
                <div
                  key={event.id}
                  style={{ display: "flex", gap: "1rem", position: "relative" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: meta.dot,
                        border: "2px solid #fff",
                        boxShadow: `0 0 0 2px ${meta.dot}40`,
                        flexShrink: 0,
                        marginTop: "0.15rem",
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          backgroundColor: "#e2e8f0",
                          minHeight: "1.5rem",
                          margin: "0.25rem 0",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{ flex: 1, paddingBottom: isLast ? 0 : "1.25rem" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    {event.event_type === "research" && (
                      <>
                        <ResearchDetail data={data} />
                        {!client.events.slice(i + 1).some((e) => {
                          if (e.event_type !== "scan") return false;
                          const researchLeadId = data.lead_id as
                            | string
                            | undefined;
                          if (!researchLeadId) return true;
                          return (
                            (e.data?.lead_id as string | undefined) ===
                            researchLeadId
                          );
                        }) && (
                          <button
                            type="button"
                            onClick={() => {
                              const leadId = data.lead_id as string | undefined;
                              if (leadId)
                                router.push(
                                  `/dashboard/ealuminate?lead=${leadId}`,
                                );
                              else router.push("/dashboard/ealuminate");
                            }}
                            className="glow-button"
                            style={{
                              marginTop: "0.625rem",
                              padding: "0.4rem 1rem",
                              fontWeight: 700,
                              borderRadius: "999px",
                              fontSize: "0.8125rem",
                              cursor: "pointer",
                            }}
                          >
                            Run Scan in Ealuminate
                          </button>
                        )}
                      </>
                    )}
                    {event.event_type === "scan" && (
                      <ScanDetail
                        data={data}
                        router={router}
                        eventId={event.id}
                      />
                    )}
                    {event.event_type === "quote_sent" && (
                      <QuoteSentDetail data={data} />
                    )}
                    {(event.event_type === "quote_accepted" ||
                      event.event_type === "quote_rejected" ||
                      event.event_type === "contract_created" ||
                      event.event_type === "meeting_set") && (
                      <NoteDetail data={data} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
