"use client";

import { ClientEventType, ClientListItem, clientsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

const EVENT_LABELS: Record<ClientEventType, string> = {
  research: "Researched",
  scan: "Scanned",
  quote_sent: "Quote Sent",
  quote_accepted: "Quote Accepted",
  quote_rejected: "Quote Rejected",
  contract_created: "Contract Created",
  meeting_set: "Meeting Set",
};

const EVENT_COLORS: Record<ClientEventType, { color: string; bg: string }> = {
  research: { color: "#64748b", bg: "#f1f5f9" },
  scan: { color: "#4479da", bg: "rgba(68,121,218,0.1)" },
  quote_sent: { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  quote_accepted: { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  quote_rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  contract_created: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  meeting_set: { color: "#48D4B8", bg: "rgba(72,212,184,0.1)" },
};

const RISK_COLORS: Record<string, string> = {
  Good: "#22c55e",
  Mediocre: "#eab308",
  Poor: "#f97316",
  Negative: "#ef4444",
};

function riskFromScore(score: number): string {
  if (score >= 86) return "Good";
  if (score >= 61) return "Mediocre";
  if (score >= 26) return "Poor";
  return "Negative";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "CL";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "CL";
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatClientExportRows(list: ClientListItem[]) {
  return list.map((client) => ({
    Name: client.name,
    Company: client.company ?? "",
    Country: client.country ?? "",
    "Latest Event": client.latest_event_type ? EVENT_LABELS[client.latest_event_type] : "",
    "Latest Score": client.latest_score ?? "",
    "Latest Event At": formatDateTime(client.latest_event_at),
    "Client ID": client.id,
  }));
}

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
        }}
      >
        <div
          style={{
            height: 13,
            width: "30%",
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
          }}
        />
        <div
          style={{
            height: 20,
            width: 90,
            backgroundColor: "#f1f5f9",
            borderRadius: 10,
          }}
        />
      </div>
      <div
        style={{
          height: 11,
          width: "45%",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [list, setList] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExportCsv = () => {
    const rows = formatClientExportRows(list);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) =>
            `"${String(row[header as keyof typeof row] ?? "").replaceAll('"', '""')}"`,
          )
          .join(","),
      ),
    ];
    downloadTextFile(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      csvRows.join("\n"),
      "text/csv;charset=utf-8;",
    );
  };

  const handleExportXlsx = () => {
    const rows = formatClientExportRows(list);
    if (rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, `clients-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => {
    clientsApi
      .list(200)
      .then(setList)
      .catch(() => {})
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
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 0.25rem",
            }}
          >
            Clients
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted, #64748b)",
              margin: 0,
            }}
          >
            {!loading &&
              `${list.length} client${list.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || list.length === 0}
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              borderRadius: "0.5rem",
              padding: "0.45rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: loading || list.length === 0 ? "default" : "pointer",
              opacity: loading || list.length === 0 ? 0.6 : 1,
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={loading || list.length === 0}
            className="glow-button"
            style={{
              borderRadius: "0.5rem",
              padding: "0.45rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: loading || list.length === 0 ? "default" : "pointer",
              opacity: loading || list.length === 0 ? 0.6 : 1,
            }}
          >
            Export XLSX
          </button>
        </div>
      </div>

      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", overflow: "hidden" }}
      >
        {loading && [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

        {!loading && list.length === 0 && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted, #64748b)",
              textAlign: "center",
              padding: "2rem 1.25rem",
              margin: 0,
            }}
          >
            No clients yet. Complete a research in Ealuminate.
          </p>
        )}

        {!loading &&
          list.map((client, i) => {
            const isLast = i === list.length - 1;
            const eventType = client.latest_event_type;
            const eventStyle = eventType
              ? EVENT_COLORS[eventType]
              : { color: "#94a3b8", bg: "#f1f5f9" };
            const initials = initialsFromName(client.name);

            let badgeText = eventType ? EVENT_LABELS[eventType] : "—";
            if (eventType === "scan" && client.latest_score !== null) {
              const risk = riskFromScore(client.latest_score);
              badgeText = `${client.latest_score} · ${risk}`;
              eventStyle.color = RISK_COLORS[risk] ?? eventStyle.color;
              eventStyle.bg = (RISK_COLORS[risk] ?? "#94a3b8") + "18";
            }

            return (
              <div
                key={client.id}
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: isLast
                    ? "none"
                    : "1px solid var(--color-border, #e2e8f0)",
                  cursor: "pointer",
                  transition: "background-color 0.12s, box-shadow 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 0,
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "999px",
                        flexShrink: 0,
                        backgroundColor: "#f1f5f9",
                        color: "#64748b",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6875rem",
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: 700,
                          color: "var(--color-foreground, #1e293b)",
                          margin: "0 0 0.2rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {client.name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-muted, #64748b)",
                          margin: 0,
                        }}
                      >
                        {[client.company, client.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.3rem",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: eventStyle.color,
                          backgroundColor: eventStyle.bg,
                          borderRadius: "999px",
                          padding: "0.24rem 0.65rem",
                          whiteSpace: "nowrap",
                          border: "1px solid transparent",
                        }}
                      >
                        {badgeText}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          color: "#94a3b8",
                          fontSize: "0.95rem",
                          lineHeight: 1,
                        }}
                      >
                        ›
                      </span>
                    </div>
                    {client.latest_event_at && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          color: "#94a3b8",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDateTime(client.latest_event_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
