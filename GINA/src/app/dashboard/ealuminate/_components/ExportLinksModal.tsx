"use client";
import { useMemo, useState } from "react";
import type { WebLink } from "@/lib/api";

interface ExportLinksModalProps {
  links: WebLink[];
  onConfirm: (selected: WebLink[]) => void;
  onClose: () => void;
}

export default function ExportLinksModal({
  links,
  onConfirm,
  onClose,
}: ExportLinksModalProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(links.map((_, i) => i)),
  );
  const [query, setQuery] = useState("");

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // Carries original index so selection survives filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withIndex = links.map((link, i) => ({ link, i }));
    if (!q) return withIndex;
    return withIndex.filter(
      ({ link }) =>
        link.title?.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q),
    );
  }, [links, query]);

  // "Select all" acts on the currently visible (filtered) rows
  const allSelected =
    filtered.length > 0 && filtered.every(({ i }) => selected.has(i));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach(({ i }) => next.delete(i));
      else filtered.forEach(({ i }) => next.add(i));
      return next;
    });

  const noneSelected = selected.size === 0;
  const confirm = () =>
    onConfirm(links.filter((_, i) => selected.has(i)));

  const domainOf = useMemo(
    () => (url: string) => {
      try {
        return new URL(url).hostname.replace("www.", "");
      } catch {
        return url;
      }
    },
    [],
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "1rem",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: "min(92vw, 860px)",
          margin: "1rem",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem 1rem",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <p
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            Export Links to Excel
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#64748b",
              margin: "0.25rem 0 0",
            }}
          >
            Untick any links you want to exclude from the spreadsheet.
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: "0.75rem 1.5rem 0" }}>
          <div style={{ position: "relative", display: "flex" }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or URL…"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                borderRadius: "0.625rem",
                border: "1px solid #e2e8f0",
                fontSize: "0.8125rem",
                color: "#1e293b",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4479DA")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        {/* Select-all toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.625rem 1.5rem",
            borderBottom: "1px solid #f8fafc",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={{
                width: 16,
                height: 16,
                accentColor: "#4479DA",
                cursor: "pointer",
              }}
            />
            <span
              style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}
            >
              Select all
            </span>
          </label>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            {selected.size} of {links.length} selected
          </span>
        </div>

        {/* Link list */}
        <div style={{ padding: "0.5rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {links.length === 0 ? (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#94a3b8",
                padding: "1rem 0",
              }}
            >
              No links available to export.
            </p>
          ) : filtered.length === 0 ? (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#94a3b8",
                padding: "1rem 0",
              }}
            >
              No links match “{query.trim()}”.
            </p>
          ) : (
            filtered.map(({ link, i }) => {
              const checked = selected.has(i);
              return (
                <label
                  key={`${link.url}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.5rem 0.625rem",
                    margin: "0 -0.625rem",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "1px solid #f8fafc",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(i)}
                    style={{
                      width: 16,
                      height: 16,
                      marginTop: 2,
                      accentColor: "#4479DA",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: checked ? "#1e293b" : "#94a3b8",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {link.title || domainOf(link.url)}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.6875rem",
                        color: "#94a3b8",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {link.url}
                    </span>
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open link in new tab"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      padding: "0.25rem",
                      borderRadius: "0.375rem",
                      color: "#94a3b8",
                      transition: "background 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#4479DA";
                      e.currentTarget.style.background = "#eef3fc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#94a3b8";
                      e.currentTarget.style.background = "transparent";
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
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.625rem",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "transparent",
              color: "#64748b",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={noneSelected}
            onClick={confirm}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: "999px",
              border: "none",
              background: noneSelected ? "#cbd5e1" : "#4479DA",
              color: "#ffffff",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: noneSelected ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "background 0.15s",
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
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            Export XLSX
          </button>
        </div>
      </div>
    </div>
  );
}
