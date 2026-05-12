"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { webAnalystsApi, clearAuth } from "@/lib/api";

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

type Modal = "password" | "delete" | null;

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const [modal, setModal] = useState<Modal>(null);

  // Change password form
  const [pwCurrent, setPwCurrent]   = useState("");
  const [pwNew, setPwNew]           = useState("");
  const [pwConfirm, setPwConfirm]   = useState("");
  const [pwError, setPwError]       = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwSaved, setPwSaved]       = useState(false);

  // Delete account
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    webAnalystsApi.me()
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
      await webAnalystsApi.updateMe({ name });
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

  const openPasswordModal = () => {
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwError(""); setPwSaved(false);
    setModal("password");
  };

  const handleChangePassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError("");
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError("All fields are required."); return; }
    if (pwNew !== pwConfirm) { setPwError("New passwords do not match."); return; }
    if (pwNew.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    setPwSaving(true);
    try {
      await webAnalystsApi.changePassword({ current_password: pwCurrent, new_password: pwNew });
      setPwSaved(true);
      setTimeout(() => { setPwSaved(false); setModal(null); }, 1500);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await webAnalystsApi.deleteMe();
      clearAuth();
      router.replace("/login");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account.");
      setDeleting(false);
    }
  };

  const MODAL_OVERLAY: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  };

  const MODAL_CARD: React.CSSProperties = {
    background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
    borderRadius: "1.125rem",
    padding: "2rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
  };

  return (
    <div style={{ padding: "clamp(1.25rem, 4vw, 2rem)", backgroundColor: "#f8fafc", minHeight: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.25rem" }}>
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
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.875rem", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.875rem", color: "var(--color-foreground, #1e293b)", backgroundColor: "#fff", outline: "none", width: "220px" }}
              />
            </Field>
            <Field label="Email Address" description="Contact support to change your email.">
              <input
                value={email}
                readOnly
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.875rem", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.875rem", color: "var(--color-muted, #64748b)", backgroundColor: "#f8fafc", outline: "none", width: "240px", cursor: "default" }}
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
                style={{ padding: "0.5rem 1.25rem", borderRadius: "999px", fontSize: "0.875rem", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
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
            onClick={openPasswordModal}
            style={{ padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", backgroundColor: "#fff", cursor: "pointer" }}
          >
            Change Password
          </button>
        </Field>
      </Section>

      {/* Danger Zone */}
      <div style={{ borderRadius: "0.875rem", backgroundColor: "#111318", padding: "1.75rem", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: "0 0 0.5rem" }}>Danger Zone</h2>
        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          These actions are irreversible. Please proceed with caution and ensure you have backed up any important data before continuing.
        </p>

        <div style={{ border: "1px solid rgba(248,113,113,0.4)", borderRadius: "0.625rem", overflow: "hidden" }}>
          {/* Content */}
          <div style={{ backgroundColor: "#111318", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff", margin: "0 0 0.625rem" }}>Delete Account</p>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>
              Permanently remove your account and all of its associated data. This action is not reversible, so please continue with caution.
            </p>
          </div>
          {/* Footer bar */}
          <div style={{ backgroundColor: "rgba(127,29,29,0.35)", borderTop: "1px solid rgba(248,113,113,0.3)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => { setDeleteError(""); setModal("delete"); }}
              style={{ padding: "0.5rem 1.125rem", borderRadius: "0.5rem", border: "none", fontSize: "0.875rem", fontWeight: 700, color: "#fff", backgroundColor: "#ef4444", cursor: "pointer" }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {modal === "password" && (
        <div onClick={() => setModal(null)} style={MODAL_OVERLAY}>
          <div onClick={(e) => e.stopPropagation()} style={MODAL_CARD}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.5rem", color: "#fff" }}>
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {([
                { id: "current", label: "Current Password", value: pwCurrent, set: setPwCurrent },
                { id: "new",     label: "New Password",     value: pwNew,     set: setPwNew },
                { id: "confirm", label: "Confirm New Password", value: pwConfirm, set: setPwConfirm },
              ] as const).map(({ id, label, value, set }) => (
                <div key={id}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: "0.375rem" }}>
                    {label}
                  </label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              {pwError && <p style={{ fontSize: "0.8125rem", color: "#fca5a5", margin: 0 }}>{pwError}</p>}
              {pwSaved && <p style={{ fontSize: "0.8125rem", color: "#bbf7d0", margin: 0, fontWeight: 600 }}>Password updated!</p>}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={{ padding: "0.55rem 1.125rem", fontSize: "0.875rem", fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: "0.5rem", cursor: "pointer", color: "#fff" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  style={{ padding: "0.55rem 1.375rem", fontSize: "0.875rem", fontWeight: 700, border: "none", backgroundColor: "#fff", color: "#4479DA", borderRadius: "0.5rem", cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}
                >
                  {pwSaving ? "Saving…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {modal === "delete" && (
        <div onClick={() => setModal(null)} style={MODAL_OVERLAY}>
          <div onClick={(e) => e.stopPropagation()} style={MODAL_CARD}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#fff" }}>
              Delete Account?
            </h2>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
              This will <strong style={{ color: "#fff" }}>permanently delete</strong> your account and all associated data. This action cannot be undone.
            </p>
            {deleteError && <p style={{ fontSize: "0.8125rem", color: "#fca5a5", margin: "0 0 1rem" }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setModal(null)}
                style={{ padding: "0.55rem 1.125rem", fontSize: "0.875rem", fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: "0.5rem", cursor: "pointer", color: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ padding: "0.55rem 1.375rem", fontSize: "0.875rem", fontWeight: 700, border: "none", backgroundColor: "#fff", color: "#ef4444", borderRadius: "0.5rem", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
