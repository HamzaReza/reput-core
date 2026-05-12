"use client";

import { WebAnalyst, webAnalystsApi, isAdmin } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("reput_user");
    if (!raw) return null;
    return JSON.parse(raw).id ?? null;
  } catch {
    return null;
  }
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "analyst" as "admin" | "analyst" };

export default function WebAnalystsPage() {
  const router = useRouter();
  const [list, setList] = useState<WebAnalyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [actionPending, setActionPending] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{ type: "block" | "unblock" | "delete"; target: WebAnalyst } | null>(null);

  const currentUserId = typeof window !== "undefined" ? getCurrentUserId() : null;

  useEffect(() => {
    if (!isAdmin()) { router.replace("/dashboard"); return; }
    webAnalystsApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load web analysts."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await webAnalystsApi.create(form);
      const newUser: WebAnalyst = {
        id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        is_blocked: false,
        created_at: new Date().toISOString(),
      };
      setList((prev) => [newUser, ...prev]);
      setModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeConfirmed() {
    if (!confirm || actionPending) return;
    const { type, target } = confirm;
    setConfirm(null);
    setActionPending(target.id);
    try {
      if (type === "delete") {
        await webAnalystsApi.delete(target.id);
        setList((prev) => prev.filter((u) => u.id !== target.id));
      } else {
        const blocked = type === "block";
        await webAnalystsApi.setBlocked(target.id, blocked);
        setList((prev) =>
          prev.map((u) => (u.id === target.id ? { ...u, is_blocked: blocked } : u))
        );
      }
    } catch {
      // silently ignore
    } finally {
      setActionPending(null);
    }
  }

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
          }}
        >
          Web Analysts
        </h1>
        <button
          onClick={() => { setModal(true); setFormError(""); setForm(EMPTY_FORM); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#48D4B8",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <div
        className="glass glow-border"
        style={{ borderRadius: "0.875rem", overflowX: "auto" }}
      >
        <div style={{ minWidth: "640px" }}>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,2fr) minmax(0,1.5fr) 120px 140px",
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid var(--color-border, #e2e8f0)",
              backgroundColor: "#f8fafc",
            }}
          >
            {["Name", "Email", "Joined", "Actions"].map((h) => (
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
              const isSelf = emp.id === currentUserId;
              const isAnalyst = emp.role === "analyst";
              const pending = actionPending === emp.id;

              return (
                <div
                  key={emp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,2fr) minmax(0,1.5fr) 120px 140px",
                    padding: "0.875rem 1.25rem",
                    alignItems: "center",
                    borderBottom: isLast ? "none" : "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  {/* Name + role + blocked badge — all inline */}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "var(--color-foreground, #1e293b)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {emp.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          color: emp.role === "admin" ? "#6366f1" : "#64748b",
                          backgroundColor: emp.role === "admin" ? "rgba(99,102,241,0.1)" : "rgba(100,116,139,0.1)",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "0.25rem",
                          textTransform: "capitalize",
                          flexShrink: 0,
                        }}
                      >
                        {emp.role}
                      </span>
                      {emp.is_blocked && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: "#ef4444",
                            backgroundColor: "rgba(239,68,68,0.1)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "0.25rem",
                            flexShrink: 0,
                          }}
                        >
                          Blocked
                        </span>
                      )}
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
                    {emp.email}
                  </p>

                  {/* Joined */}
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
                    {formatDate(emp.created_at)}
                  </p>

                  {/* Actions — only for analyst rows */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {isAnalyst && !isSelf && (
                      <>
                        <button
                          onClick={() => setConfirm({ type: emp.is_blocked ? "unblock" : "block", target: emp })}
                          disabled={pending}
                          title={emp.is_blocked ? "Unblock" : "Block"}
                          style={{
                            padding: "0.3rem 0.7rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            border: "1.5px solid",
                            borderColor: emp.is_blocked ? "#22c55e" : "#f59e0b",
                            color: emp.is_blocked ? "#22c55e" : "#f59e0b",
                            backgroundColor: emp.is_blocked ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)",
                            borderRadius: "0.4rem",
                            cursor: pending ? "not-allowed" : "pointer",
                            opacity: pending ? 0.5 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {emp.is_blocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => setConfirm({ type: "delete", target: emp })}
                          disabled={pending}
                          title="Delete"
                          style={{
                            padding: "0.3rem 0.7rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            border: "1.5px solid #ef4444",
                            color: "#ef4444",
                            backgroundColor: "rgba(239,68,68,0.06)",
                            borderRadius: "0.4rem",
                            cursor: pending ? "not-allowed" : "pointer",
                            opacity: pending ? 0.5 : 1,
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Create User Modal */}
      {modal && (
        <div
          onClick={() => setModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.875rem",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.25rem", color: "#1e293b" }}>
              Add User
            </h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {(["name", "email", "password"] as const).map((field) => (
                <div key={field}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.375rem",
                      textTransform: "capitalize",
                    }}
                  >
                    {field}
                  </label>
                  <input
                    type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.375rem",
                  }}
                >
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "analyst" }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    outline: "none",
                    backgroundColor: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <p style={{ fontSize: "0.8125rem", color: "#ef4444", margin: 0 }}>{formError}</p>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "transparent",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "none",
                    backgroundColor: "#48D4B8",
                    color: "#fff",
                    borderRadius: "0.5rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div
          onClick={() => setConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
              borderRadius: "1.125rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
            }}
          >
            {/* Title */}
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#fff" }}>
              {confirm.type === "delete"
                ? "Delete user?"
                : confirm.type === "block"
                ? "Block user?"
                : "Unblock user?"}
            </h2>

            {/* Description */}
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
              {confirm.type === "delete" && (
                <>This will permanently delete <strong style={{ color: "#fff" }}>{confirm.target.name}</strong>. This action cannot be undone.</>
              )}
              {confirm.type === "block" && (
                <><strong style={{ color: "#fff" }}>{confirm.target.name}</strong> will not be able to log in until unblocked.</>
              )}
              {confirm.type === "unblock" && (
                <><strong style={{ color: "#fff" }}>{confirm.target.name}</strong> will be able to log in again.</>
              )}
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  padding: "0.55rem 1.125rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "1.5px solid rgba(255,255,255,0.45)",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmed}
                style={{
                  padding: "0.55rem 1.375rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: "#fff",
                  color: confirm.type === "delete" ? "#ef4444" : confirm.type === "block" ? "#f59e0b" : "#22c55e",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                }}
              >
                {confirm.type === "delete" ? "Delete" : confirm.type === "block" ? "Block" : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
