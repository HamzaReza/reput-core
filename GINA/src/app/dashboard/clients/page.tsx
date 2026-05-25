"use client";

import { ClientEventType, ClientListItem, clientsApi } from "@/lib/api";
import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
import "flag-icons/css/flag-icons.min.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import countryList from "react-select-country-list";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

type CaseStage =
  | "Deep Search Pending"
  | "Pre-Search Completed"
  | "Deep Search Completed"
  | "Client Report Ready"
  | "In Renewal Process"
  | "Waiting for Client"
  | "Monitoring";

type ResearchStatus =
  | "Pending"
  | "Completed"
  | "In Progress"
  | "On Hold"
  | "Monitoring"
  | "Verification";

interface DerivedClient extends ClientListItem {
  entityType: "Individual" | "Company";
  caseStage: CaseStage;
  researchStatus: ResearchStatus;
  alpha2: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<ClientEventType, string> = {
  research: "Researched",
  scan: "Scanned",
  quote_sent: "Quote Sent",
  quote_accepted: "Quote Accepted",
  quote_rejected: "Quote Rejected",
  contract_created: "Contract Created",
  meeting_set: "Meeting Set",
};

const CASE_STAGE_STYLES: Record<CaseStage, { color: string; bg: string }> = {
  "Deep Search Pending": { color: "#64748b", bg: "#f1f5f9" },
  "Pre-Search Completed": { color: "#4479da", bg: "rgba(68,121,218,0.1)" },
  "Deep Search Completed": { color: "#0ea5e9", bg: "rgba(14,165,233,0.1)" },
  "Client Report Ready": { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  "In Renewal Process": { color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  "Waiting for Client": { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  Monitoring: { color: "#48D4B8", bg: "rgba(72,212,184,0.1)" },
};

const RESEARCH_STATUS_META: Record<
  ResearchStatus,
  { icon: React.ReactNode; color: string }
> = {
  Completed: { icon: <CheckIcon />, color: "#22c55e" },
  "In Progress": { icon: <SpinnerIcon />, color: "#4479da" },
  "On Hold": { icon: <PauseIcon />, color: "#f97316" },
  Pending: { icon: <DotIcon />, color: "#94a3b8" },
  Monitoring: { icon: <RadarIcon />, color: "#48D4B8" },
  Verification: { icon: <FlagIcon />, color: "#eab308" },
};

const TABS: CaseStage[] = [
  "Pre-Search Completed",
  "Deep Search Pending",
  "Deep Search Completed",
  "In Renewal Process",
  "Waiting for Client",
  "Client Report Ready",
  "Monitoring",
];

const ROWS_OPTIONS = [10, 25, 50, 100] as const;

const GRID_COLS =
  "32px minmax(180px,2.5fr) minmax(120px,1fr) 75px minmax(130px,1.1fr) 120px 110px 75px 85px 105px 60px";

// ─── Country lookup ───────────────────────────────────────────────────────────

const COUNTRY_ALPHA2: Record<string, string> = Object.fromEntries(
  countryList()
    .getData()
    .map(({ label, value }: { label: string; value: string }) => [
      label.toLowerCase(),
      value,
    ]),
);

function countryToAlpha2(name: string): string {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  return COUNTRY_ALPHA2[lower] ?? COUNTRY_NAME_TO_ISO[lower] ?? "";
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function initialsFromName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "CL";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "CL";
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

function formatDateLine(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function deriveClient(c: ClientListItem): DerivedClient {
  const et = c.latest_event_type;

  const entityType: "Individual" | "Company" =
    c.name != null && c.name.trim() !== "" ? "Individual" : "Company";

  const stageMap: Partial<Record<ClientEventType, CaseStage>> = {
    research: "Pre-Search Completed",
    scan: "Deep Search Completed",
    quote_sent: "Waiting for Client",
    quote_accepted: "Client Report Ready",
    quote_rejected: "Pre-Search Completed",
    contract_created: "In Renewal Process",
    meeting_set: "Monitoring",
  };
  const caseStage: CaseStage = (et && stageMap[et]) ?? "Deep Search Pending";

  const statusMap: Partial<Record<ClientEventType, ResearchStatus>> = {
    research: "Completed",
    scan: "Completed",
    quote_sent: "In Progress",
    quote_accepted: "Completed",
    quote_rejected: "On Hold",
    contract_created: "Completed",
    meeting_set: "Monitoring",
  };
  const researchStatus: ResearchStatus = (et && statusMap[et]) ?? "Pending";

  const alpha2 = countryToAlpha2(c.country ?? "");

  return { ...c, entityType, caseStage, researchStatus, alpha2 };
}

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
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
  return list.map((c) => {
    const d = deriveClient(c);
    return {
      Name: c.name,
      Company: c.company ?? "",
      Country: c.country ?? "",
      "Entity Type": d.entityType,
      "Case Stage": d.caseStage,
      "Research Status": d.researchStatus,
      "Assigned To": c.assigned_to_name ?? "",
      RepScore: c.latest_score ?? "",
      "Latest Event": c.latest_event_type
        ? EVENT_LABELS[c.latest_event_type]
        : "",
      "Last Activity": formatDateTime(c.latest_event_at),
    };
  });
}

// ─── Small icon components ────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
function DotIcon() {
  return <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>·</span>;
}
function RadarIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
      <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function ExternalLinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function SearchInputIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        left: "0.625rem",
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.625rem 0.875rem",
        fontSize: "0.8125rem",
        fontWeight: active ? 700 : 500,
        color: active ? "#4479da" : "#64748b",
        background: "none",
        border: "none",
        borderBottom: active ? "2px solid #4479da" : "2px solid transparent",
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        flexShrink: 0,
      }}
    >
      {label}
      {count > 0 && (
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: active ? "#4479da" : "#94a3b8",
            backgroundColor: active ? "rgba(68,121,218,0.1)" : "#f1f5f9",
            borderRadius: "999px",
            padding: "0.1rem 0.45rem",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function PageBtn({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 0.5rem",
        borderRadius: "0.375rem",
        border: active ? "1px solid #4479da" : "1px solid #e2e8f0",
        backgroundColor: active ? "#4479da" : disabled ? "#f8fafc" : "#fff",
        color: active ? "#fff" : disabled ? "#c7d2dc" : "#1e293b",
        fontSize: "0.8125rem",
        fontWeight: active ? 700 : 500,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        padding: "0.5rem 1.25rem",
        alignItems: "center",
        gap: "1rem",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
      }}
    >
      <div
        style={{
          height: 14,
          width: 14,
          backgroundColor: "#f1f5f9",
          borderRadius: 3,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#f1f5f9",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 12,
              width: "70%",
              backgroundColor: "#f1f5f9",
              borderRadius: 6,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              height: 10,
              width: "40%",
              backgroundColor: "#f1f5f9",
              borderRadius: 6,
            }}
          />
        </div>
      </div>
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          style={{
            height: 12,
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
            width: i % 2 === 0 ? "75%" : "55%",
          }}
        />
      ))}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  color: "#1e293b",
  backgroundColor: "#ffffff",
  cursor: "pointer",
  outline: "none",
  height: 34,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter();

  // data
  const [list, setList] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CaseStage | "All">("All");
  const [filterStage, setFilterStage] = useState<CaseStage | "">("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterEntityType, setFilterEntityType] = useState<
    "" | "Individual" | "Company"
  >("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<10 | 25 | 50 | 100>(10);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // modals
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const headerCheckRef = useRef<HTMLInputElement | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    clientsApi
      .list(200)
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Reset page on filter change ─────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [
    search,
    activeTab,
    filterStage,
    filterCountry,
    filterEntityType,
    filterAssignedTo,
  ]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const derived: DerivedClient[] = list.map(deriveClient);

  const afterSearch = derived.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const primary = c.entityType === "Individual" ? c.name : (c.company ?? "");
    return (
      primary.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  const afterTab =
    activeTab === "All"
      ? afterSearch
      : afterSearch.filter((c) => c.caseStage === activeTab);

  const filtered = afterTab.filter((c) => {
    if (filterStage && c.caseStage !== filterStage) return false;
    if (filterCountry && c.country !== filterCountry) return false;
    if (filterEntityType && c.entityType !== filterEntityType) return false;
    if (filterAssignedTo && c.assigned_to_name !== filterAssignedTo)
      return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageStart = (page - 1) * rowsPerPage;
  const pageEnd = pageStart + rowsPerPage;
  const paginated = filtered.slice(pageStart, pageEnd);

  const tabCounts = TABS.reduce(
    (acc, tab) => {
      acc[tab] = afterSearch.filter((c) => c.caseStage === tab).length;
      return acc;
    },
    {} as Record<CaseStage, number>,
  );

  const uniqueCountries = [
    ...new Set(derived.map((c) => c.country).filter(Boolean)),
  ].sort() as string[];

  const uniqueAssignees = [
    ...new Set(derived.map((c) => c.assigned_to_name).filter(Boolean)),
  ].sort() as string[];

  // ── Checkbox state ──────────────────────────────────────────────────────────
  const allPageSelected =
    paginated.length > 0 && paginated.every((c) => selectedIds.has(c.id));
  const somePageSelected = paginated.some((c) => selectedIds.has(c.id));

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate =
        somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await clientsApi.delete(id);
      setList((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* non-fatal */
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => clientsApi.delete(id)));
      setList((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch {
      /* non-fatal */
    } finally {
      setBulkDeleting(false);
      setBulkConfirm(false);
    }
  };

  const handleExportCsv = () => {
    const rows = formatClientExportRows(list);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map(
            (h) =>
              `"${String(row[h as keyof typeof row] ?? "").replaceAll('"', '""')}"`,
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
    XLSX.writeFile(
      workbook,
      `clients-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((c) => next.delete(c.id));
      } else {
        paginated.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  // ── Page numbers ────────────────────────────────────────────────────────────
  const pageNumbers: number[] = (() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  })();

  const confirmClient = confirmId ? list.find((c) => c.id === confirmId) : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "clamp(1.25rem, 4vw, 2rem)",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 0.25rem",
            }}
          >
            Clients &amp; Cases
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted, #64748b)",
              margin: 0,
            }}
          >
            Manage operational workflow across reputation cases.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || list.length === 0}
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              borderRadius: "999px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: loading || list.length === 0 ? "default" : "pointer",
              opacity: loading || list.length === 0 ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={loading || list.length === 0}
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              borderRadius: "999px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: loading || list.length === 0 ? "default" : "pointer",
              opacity: loading || list.length === 0 ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export XLSX
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/ealuminate")}
            className="glow-button"
            style={{
              borderRadius: "999px",
              padding: "0.45rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "0",
        }}
      >
        <div
          style={{
            position: "relative",
            flexGrow: 1,
            minWidth: "200px",
            maxWidth: "300px",
          }}
        >
          <SearchInputIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, entities, or cases..."
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem 0.45rem 2rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              color: "#1e293b",
              backgroundColor: "#fff",
              outline: "none",
              height: 34,
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value as CaseStage | "")}
          style={selectStyle}
        >
          <option value="">Case Stage</option>
          {TABS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          style={selectStyle}
        >
          <option value="">Country</option>
          {uniqueCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterEntityType}
          onChange={(e) =>
            setFilterEntityType(e.target.value as "" | "Individual" | "Company")
          }
          style={selectStyle}
        >
          <option value="">Entity Type</option>
          <option value="Individual">Individual</option>
          <option value="Company">Company</option>
        </select>

        <select
          value={filterAssignedTo}
          onChange={(e) => setFilterAssignedTo(e.target.value)}
          style={selectStyle}
        >
          <option value="">Assigned To</option>
          {uniqueAssignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="tab-bar"
        style={
          {
            display: "flex",
            overflowX: "auto",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "0.875rem",
            marginTop: "0.5rem",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties
        }
      >
        <TabButton
          label="All"
          count={afterSearch.length}
          active={activeTab === "All"}
          onClick={() => setActiveTab("All")}
        />
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={tab}
            count={tabCounts[tab] ?? 0}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* ── Table ── */}
      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "max-content" }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLS,
                padding: "0.625rem 1.25rem",
                alignItems: "center",
                gap: "1rem",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <input
                type="checkbox"
                ref={headerCheckRef}
                checked={allPageSelected}
                onChange={togglePageSelection}
                style={{ cursor: "pointer", accentColor: "#4479da" }}
              />
              {[
                "Client",
                "Country",
                "Entity Type",
                "Case Stage",
                "Research Status",
                "Assigned To",
                "Links Found",
                "Negative Links",
                "Last Activity",
                "",
              ].map((label, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    userSelect: "none",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Loading skeletons */}
            {loading && [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-muted, #64748b)",
                  textAlign: "center",
                  padding: "2.5rem 1.25rem",
                  margin: 0,
                }}
              >
                {list.length === 0
                  ? "No clients yet. Complete a research in Ealuminate."
                  : "No clients match the current filters."}
              </p>
            )}

            {/* Data rows */}
            {!loading &&
              paginated.map((client, i) => {
                const isLast = i === paginated.length - 1;
                const stageStyle = CASE_STAGE_STYLES[client.caseStage];
                const statusMeta = RESEARCH_STATUS_META[client.researchStatus];
                const { date, time } = formatDateLine(client.latest_event_at);
                const displayName =
                  client.entityType === "Individual"
                    ? client.name
                    : (client.company ?? "—");
                const initials = initialsFromName(
                  displayName === "—" ? "" : displayName,
                );
                const analystInitials = initialsFromName(
                  client.assigned_to_name ?? "",
                );
                const isCompany = client.entityType === "Company";

                return (
                  <div
                    key={client.id}
                    onClick={() =>
                      router.push(`/dashboard/clients/${client.id}`)
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_COLS,
                      padding: "0.5rem 1.25rem",
                      alignItems: "center",
                      gap: "1rem",
                      borderBottom: isLast
                        ? "none"
                        : "1px solid var(--color-border, #e2e8f0)",
                      cursor: "pointer",
                      transition: "background-color 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          e.target.checked
                            ? next.add(client.id)
                            : next.delete(client.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer", accentColor: "#4479da" }}
                    />

                    {/* Client */}
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
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          flexShrink: 0,
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              color: "var(--color-foreground, #1e293b)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayName}
                          </span>
                          <span style={{ color: "#94a3b8", flexShrink: 0 }}>
                            <ExternalLinkIcon />
                          </span>
                        </div>
                        <span
                          style={{ fontSize: "0.6875rem", color: "#94a3b8" }}
                        >
                          RepScore — {client.latest_score ?? "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Country */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      {client.alpha2 && (
                        <span
                          className={`fi fi-${client.alpha2.toLowerCase()}`}
                          style={{ borderRadius: 2, flexShrink: 0 }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "#1e293b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {client.country || "—"}
                      </span>
                    </div>

                    {/* Entity Type */}
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: isCompany ? "#8b5cf6" : "#4479da",
                        backgroundColor: isCompany
                          ? "rgba(139,92,246,0.1)"
                          : "rgba(68,121,218,0.1)",
                        borderRadius: "999px",
                        padding: "0.15rem 0.55rem",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      {client.entityType}
                    </span>

                    {/* Case Stage */}
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: stageStyle.color,
                        backgroundColor: stageStyle.bg,
                        borderRadius: "999px",
                        padding: "0.15rem 0.6rem",
                        whiteSpace: "nowrap",
                        border: "1px solid transparent",
                        display: "inline-block",
                      }}
                    >
                      {client.caseStage}
                    </span>

                    {/* Research Status */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          color: statusMeta.color,
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {statusMeta.icon}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {client.researchStatus}
                      </span>
                    </div>

                    {/* Assigned To */}
                    {client.assigned_to_name ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            flexShrink: 0,
                            backgroundColor: "rgba(72,212,184,0.12)",
                            color: "#48D4B8",
                            border: "1px solid rgba(72,212,184,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.625rem",
                            fontWeight: 700,
                          }}
                        >
                          {analystInitials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "#1e293b",
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {client.assigned_to_name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
                        —
                      </span>
                    )}

                    {/* Links Found */}
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color:
                          client.latest_links_found != null
                            ? "#1e293b"
                            : "#94a3b8",
                      }}
                    >
                      {client.latest_links_found ?? "—"}
                    </span>

                    {/* Negative Links */}
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color:
                          client.latest_negative_links != null
                            ? "#ef4444"
                            : "#94a3b8",
                      }}
                    >
                      {client.latest_negative_links ?? "—"}
                    </span>

                    {/* Last Activity */}
                    <div>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "#1e293b",
                          margin: "0 0 0.1rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {date}
                      </p>
                      {time && (
                        <p
                          style={{
                            fontSize: "0.6875rem",
                            color: "#94a3b8",
                            margin: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {time}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(client.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#94a3b8",
                          padding: "0.25rem",
                          borderRadius: "0.375rem",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            "#ef4444")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            "#94a3b8")
                        }
                        aria-label="Delete client"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Selection bar ── */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.25rem",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "rgba(239,68,68,0.04)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              {selectedIds.size} client{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <button
              type="button"
              onClick={() => setBulkConfirm(true)}
              style={{
                padding: "0.45rem 0.875rem",
                borderRadius: "999px",
                fontSize: "0.8125rem",
                fontWeight: 700,
                border: "none",
                backgroundColor: "#ef4444",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <TrashIcon />
              Delete {selectedIds.size} selected
            </button>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.875rem 1.25rem",
              borderTop: "1px solid #e2e8f0",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to{" "}
              {Math.min(pageEnd, filtered.length)} of {filtered.length} results
            </span>

            <div style={{ display: "flex", gap: "0.25rem" }}>
              <PageBtn
                label="‹"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              />
              {pageNumbers.map((n) => (
                <PageBtn
                  key={n}
                  label={String(n)}
                  onClick={() => setPage(n)}
                  active={n === page}
                />
              ))}
              <PageBtn
                label="›"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              />
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Rows per page
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value) as 10 | 25 | 50 | 100);
                  setPage(1);
                }}
                style={{ ...selectStyle, padding: "0.3rem 0.5rem", height: 30 }}
              >
                {ROWS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk delete confirm modal ── */}
      {bulkConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
          }}
          onClick={() => {
            if (!bulkDeleting) setBulkConfirm(false);
          }}
        >
          <div
            className="glass"
            style={{
              borderRadius: "0.875rem",
              padding: "1.5rem",
              maxWidth: "24rem",
              width: "100%",
              boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#1e293b",
                margin: "0 0 0.5rem",
              }}
            >
              Delete {selectedIds.size} Client
              {selectedIds.size !== 1 ? "s" : ""}
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#475569",
                lineHeight: 1.6,
                margin: "0 0 1.25rem",
              }}
            >
              This will permanently remove all their research, scans, and
              history. This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.625rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setBulkConfirm(false)}
                disabled={bulkDeleting}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  color: "#64748b",
                  cursor: bulkDeleting ? "default" : "pointer",
                  opacity: bulkDeleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  cursor: bulkDeleting ? "default" : "pointer",
                  opacity: bulkDeleting ? 0.7 : 1,
                }}
              >
                {bulkDeleting
                  ? "Deleting…"
                  : `Delete ${selectedIds.size} client${selectedIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmClient && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
          }}
          onClick={() => {
            if (!deletingId) setConfirmId(null);
          }}
        >
          <div
            className="glass"
            style={{
              borderRadius: "0.875rem",
              padding: "1.5rem",
              maxWidth: "24rem",
              width: "100%",
              boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#1e293b",
                margin: "0 0 0.5rem",
              }}
            >
              Delete Client
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#475569",
                lineHeight: 1.6,
                margin: "0 0 1.25rem",
              }}
            >
              Delete <strong>{confirmClient.name}</strong>? This will
              permanently remove all their research, scans, and history. This
              cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.625rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                disabled={!!deletingId}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  color: "#64748b",
                  cursor: deletingId ? "default" : "pointer",
                  opacity: deletingId ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmClient.id)}
                disabled={!!deletingId}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  cursor: deletingId ? "default" : "pointer",
                  opacity: deletingId ? 0.7 : 1,
                }}
              >
                {deletingId === confirmClient.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
