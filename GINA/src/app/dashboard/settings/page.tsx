"use client";

import { useEffect, useState } from "react";
import { employeesApi } from "@/lib/api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass glow-border" style={{ borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.375rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border, #e2e8f0)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", height: "56px", borderBottom: "1px solid var(--color-border, #e2e8f0)" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: "0.8rem", color: "var(--color-muted, #64748b)", margin: "0.15rem 0 0" }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    employeesApi.me()
      .then((e) => {
        setName(e.name ?? "");
        setEmail(e.email);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await employeesApi.updateMe({ name });
      try {
        const stored = localStorage.getItem("reput_user");
        if (stored) {
          const u = JSON.parse(stored);
          localStorage.setItem("reput_user", JSON.stringify({ ...u, name }));
          localStorage.setItem("reput_name", name);
        }
        window.dispatchEvent(new Event("reput-auth-change"));
      } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "clamp(1.25rem, 4vw, 2rem)", backgroundColor: "#f8fafc", minHeight: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.25rem" }}>
          Settings
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
          Manage your account and workspace preferences.
        </p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        {loading ? (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #64748b)", margin: "0.5rem 0" }}>Loading…</p>
        ) : (
          <>
            <Field label="Full Name" description="Your display name across the platform.">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.875rem", color: "var(--color-foreground, #1e293b)", backgroundColor: "#fff", outline: "none", width: "220px" }}
              />
            </Field>
            <Field label="Email Address" description="Contact support to change your email.">
              <input
                value={email}
                readOnly
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.875rem", color: "var(--color-muted, #64748b)", backgroundColor: "#f8fafc", outline: "none", width: "240px", cursor: "default" }}
              />
            </Field>
            {error && (
              <p style={{ fontSize: "0.8125rem", color: "#ef4444", margin: "0.75rem 0 0" }}>{error}</p>
            )}
            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
              {saved && (
                <span style={{ fontSize: "0.8125rem", color: "#22c55e", fontWeight: 600 }}>Saved successfully</span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="glow-button"
                style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.875rem", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Security */}
      <Section title="Security">
        <Field label="Password" description="Update your account password.">
          <button
            style={{ padding: "0.4rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", backgroundColor: "#fff", cursor: "pointer" }}
          >
            Change Password
          </button>
        </Field>
      </Section>
    </div>
  );
}
