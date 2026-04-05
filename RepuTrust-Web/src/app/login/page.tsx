"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(13,17,23,0.6)",
  color: "var(--color-foreground)",
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("reput_authed", "true");
    } catch {}
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
          padding: "4.5rem 1rem 2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "26rem" }}>
          <div className="glass" style={{ borderRadius: "0.875rem", padding: "2rem" }}>
            <h1
              className="neon-text"
              style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}
            >
              Welcome Back
            </h1>
            <p style={{ textAlign: "center", color: "var(--color-muted)", marginBottom: "2rem", fontSize: "0.875rem" }}>
              Sign in to view your ReputScore and scan results
            </p>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <a
                  href="#"
                  style={{ fontSize: "0.8125rem", color: "#4ECDC4", textDecoration: "none" }}
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="glow-button"
                style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "0.5rem" }}
              >
                Login
              </button>
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <button
                onClick={() => {
                  try { localStorage.setItem("reput_authed", "true"); } catch {}
                  router.push("/dashboard");
                }}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  backgroundColor: "transparent",
                  color: "var(--color-foreground)",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                }}
              >
                Continue with LinkedIn
              </button>
            </div>

            <p style={{ textAlign: "center", marginTop: "1.25rem", color: "var(--color-muted)", fontSize: "0.875rem" }}>
              Don&apos;t have an account?{" "}
              <a href="/auth" style={{ color: "#4ECDC4", fontWeight: 500, textDecoration: "none" }}>
                Sign up free
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer
        style={{
          padding: "2rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            textAlign: "center",
            color: "var(--color-muted)",
            fontSize: "0.875rem",
          }}
        >
          <p>&copy; 2025 RepuTrust. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
