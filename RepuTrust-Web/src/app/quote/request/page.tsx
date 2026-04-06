"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.625rem",
  border: "1px solid var(--color-border)",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--color-foreground)",
  marginBottom: "0.5rem",
};

export default function RemovalRequestPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem("reput_authed") !== "true") {
        router.replace("/auth");
        return;
      }
      setAuthed(true);
      const n = localStorage.getItem("reput_name");
      if (n) setName(n);
      const e = localStorage.getItem("reput_email");
      if (e) setEmail(e);
    } catch {}
  }, [router]);

  if (!authed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
  };

  const handleClose = () => {
    setShowSuccess(false);
    router.push("/dashboard");
  };

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4.5rem 1.5rem 2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "36rem" }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h1
              style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--color-foreground)" }}
            >
              Request a Removal Quote
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              Describe the negative content you need removed and we&apos;ll get back to you within 24 hours.
            </p>
          </div>

          <div
            style={{
              borderRadius: "0.875rem",
              padding: "clamp(1.25rem, 5vw, 2rem)",
              background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 8px 32px rgba(68,121,218,0.28)",
              "--color-foreground": "#ffffff",
              "--color-muted": "rgba(255,255,255,0.72)",
              "--color-border": "rgba(255,255,255,0.3)",
            } as React.CSSProperties}
          >
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Negative Links or URLs</label>
                <textarea
                  rows={5}
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Paste any negative URLs or describe the content you need removed..."
                  required
                />
              </div>

              <button
                type="submit"
                className="glow-button"
                style={{
                  width: "100%",
                  fontWeight: 700,
                  padding: "0.75rem",
                  borderRadius: "0.625rem",
                }}
              >
                Submit Removal Request
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Success modal */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <div
            className="glass"
            style={{
              borderRadius: "1rem",
              padding: "2.5rem 2rem",
              maxWidth: "22rem",
              width: "100%",
              textAlign: "center",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Check icon */}
            <div
              style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "50%",
                backgroundColor: "rgba(68,121,218,0.08)",
                border: "1px solid rgba(68,121,218,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2
              style={{
                fontSize: "1.375rem",
                fontWeight: 700,
                color: "var(--color-foreground)",
                marginBottom: "0.625rem",
              }}
            >
              Request Submitted
            </h2>
            <p
              style={{
                color: "var(--color-muted)",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                marginBottom: "2rem",
              }}
            >
              We&apos;ve received your removal request and will get back to you within <strong style={{ color: "var(--color-foreground)" }}>24 hours</strong>.
            </p>

            <button
              onClick={handleClose}
              className="glow-button"
              style={{
                width: "100%",
                fontWeight: 700,
                padding: "0.75rem",
                borderRadius: "0.625rem",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
