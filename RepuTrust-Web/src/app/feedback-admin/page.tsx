"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { feedback, type FeedbackItem } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function FeedbackAdminPage() {
  const hasLoadedRef = useRef(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    feedback
      .list()
      .then(setItems)
      .catch(() => setError("Failed to load feedback."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(
    (item) =>
      item.message.toLowerCase().includes(search.toLowerCase()) ||
      (item.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, filtered.length);
  const pageItems = filtered.slice(start, end);

  // Reset to page 1 on search or page size change
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  return (
    <div
      className="grid-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-foreground)",
      }}
    >
      <Header />

      <main style={{ flex: 1, paddingTop: "4.5rem", paddingBottom: "4rem" }}>
        <div
          style={{ margin: "0 auto", padding: "1.5rem clamp(1rem, 4vw, 2rem)" }}
        >
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--color-foreground)",
              marginBottom: "1.25rem",
            }}
          >
            User Feedback
          </h1>

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
              {loading
                ? "Loading…"
                : `${filtered.length} response${filtered.length !== 1 ? "s" : ""}`}
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message or email…"
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "0.625rem",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-foreground)",
                fontSize: "0.8125rem",
                outline: "none",
                width: "220px",
              }}
            />
          </div>

          {loading && (
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              Loading…
            </p>
          )}
          {error && (
            <p style={{ color: "var(--color-error)", fontSize: "0.875rem" }}>
              {error}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              No feedback yet.
            </p>
          )}

          {/* Table */}
          {!loading && !error && items.length > 0 && (
            <>
              <div
                className="glass"
                style={{
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Head */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 160px",
                    borderBottom: "1px solid var(--color-border)",
                    background: "#f8fafc",
                  }}
                >
                  {["Message", "Email", "Date"].map((col, i) => (
                    <div
                      key={col}
                      style={{
                        padding: "0.75rem 1.25rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-muted)",
                        borderRight:
                          i < 2 ? "1px solid var(--color-border)" : undefined,
                      }}
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {pageItems.length === 0 ? (
                  <div
                    style={{
                      padding: "2rem 1.25rem",
                      textAlign: "center",
                      color: "var(--color-muted)",
                      fontSize: "0.875rem",
                    }}
                  >
                    No results for &quot;{search}&quot;
                  </div>
                ) : (
                  pageItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 160px",
                        background:
                          idx % 2 === 0 ? "var(--color-surface)" : "#f8fafc",
                        borderBottom:
                          idx < pageItems.length - 1
                            ? "1px solid var(--color-border)"
                            : undefined,
                      }}
                    >
                      <div
                        style={{
                          padding: "0.875rem 1.25rem",
                          fontSize: "0.875rem",
                          lineHeight: 1.65,
                          color: "var(--color-foreground)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          borderRight: "1px solid var(--color-border)",
                        }}
                      >
                        {item.message}
                      </div>
                      <div
                        style={{
                          padding: "0.875rem 1.25rem",
                          fontSize: "0.8125rem",
                          color: item.email
                            ? "var(--color-primary)"
                            : "var(--color-border)",
                          fontFamily: "ui-monospace, 'SF Mono', monospace",
                          display: "flex",
                          alignItems: "flex-start",
                          borderRight: "1px solid var(--color-border)",
                          wordBreak: "break-all",
                        }}
                      >
                        {item.email ?? (
                          <span
                            style={{
                              color: "var(--color-border)",
                              fontStyle: "italic",
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          padding: "0.875rem 1.25rem",
                          fontSize: "0.75rem",
                          fontFamily: "ui-monospace, 'SF Mono', monospace",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--color-foreground)",
                            fontWeight: 500,
                          }}
                        >
                          {new Date(item.created_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                        <span style={{ color: "var(--color-muted)" }}>
                          {new Date(item.created_at).toLocaleTimeString(
                            undefined,
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Pagination bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1.25rem",
                    borderTop: "1px solid var(--color-border)",
                    background: "#f8fafc",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {/* Rows per page */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      fontSize: "0.8125rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    <span>Rows per page</span>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setPageSizeOpen((o) => !o)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)",
                          color: "var(--color-foreground)",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {pageSize}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {pageSizeOpen && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 4px)",
                            left: 0,
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "0.5rem",
                            overflow: "hidden",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                            zIndex: 10,
                            minWidth: "80px",
                          }}
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                setPageSize(size);
                                setPageSizeOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                width: "100%",
                                padding: "0.5rem 0.875rem",
                                background:
                                  size === pageSize
                                    ? "var(--color-primary)"
                                    : "transparent",
                                color:
                                  size === pageSize
                                    ? "#fff"
                                    : "var(--color-foreground)",
                                border: "none",
                                fontSize: "0.8125rem",
                                fontWeight: size === pageSize ? 700 : 400,
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              {size === pageSize && (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Page info + nav */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      fontSize: "0.8125rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    <span>
                      {filtered.length === 0 ? "0" : `${start + 1}–${end}`} of{" "}
                      {filtered.length}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)",
                          color:
                            safePage === 1
                              ? "var(--color-border)"
                              : "var(--color-muted)",
                          fontSize: "0.8125rem",
                          cursor: safePage === 1 ? "default" : "pointer",
                        }}
                      >
                        Previous
                      </button>
                      <span
                        style={{
                          color: "var(--color-foreground)",
                          fontWeight: 500,
                        }}
                      >
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={safePage === totalPages}
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)",
                          color:
                            safePage === totalPages
                              ? "var(--color-border)"
                              : "var(--color-muted)",
                          fontSize: "0.8125rem",
                          cursor:
                            safePage === totalPages ? "default" : "pointer",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
