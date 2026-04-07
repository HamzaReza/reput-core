"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { auth, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

function Spinner() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{
        animation: "reput-spin 0.75s linear infinite",
        display: "inline-block",
        verticalAlign: "middle",
        marginRight: "0.5rem",
      }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoginLoading(true);
    try {
      const res = await auth.login(email, password);
      setToken(res.access_token);
      try {
        localStorage.setItem("reput_user", JSON.stringify(res.user));
        localStorage.setItem("reput_name", res.user.name || res.user.email);
        if (res.user.profile?.keywords?.length) {
          localStorage.setItem("reput_keywords", res.user.profile.keywords.join(","));
        }
        if (res.user.profile?.avatar_url) {
          localStorage.setItem("reput_avatar", res.user.profile.avatar_url);
        }
      } catch {}
      window.dispatchEvent(new Event("reput-auth-change"));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoginLoading(false);
    }
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
          padding: "6rem 1rem 2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "26rem" }}>
          <div
            style={
              {
                borderRadius: "0.875rem",
                padding: "2rem",
                background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
                boxShadow: "0 8px 32px rgba(68,121,218,0.28)",
                "--color-foreground": "#ffffff",
                "--color-muted": "rgba(255,255,255,0.72)",
                "--color-border": "rgba(255,255,255,0.3)",
              } as React.CSSProperties
            }
          >
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                textAlign: "center",
                color: "#ffffff",
              }}
            >
              Welcome
            </h1>
            <p
              style={{
                textAlign: "center",
                color: "var(--color-muted)",
                marginBottom: "2rem",
                fontSize: "0.875rem",
              }}
            >
              Sign in to view your ReputScore and scan results
            </p>

            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
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
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-primary)",
                    textDecoration: "none",
                  }}
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <p style={{ color: "#FF6B4A", fontSize: "0.875rem", textAlign: "center", margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="glow-button"
                style={{
                  width: "100%",
                  fontWeight: 700,
                  padding: "0.75rem",
                  borderRadius: "0.625rem",
                  opacity: loginLoading ? 0.8 : 1,
                }}
              >
                {loginLoading ? (
                  <>
                    <Spinner />
                    Signing in…
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <button
                onClick={() => {
                  setLinkedinLoading(true);
                  setTimeout(() => {
                    try {
                      if (localStorage.getItem("reput_authed") === "true") {
                        router.push("/dashboard");
                      } else {
                        router.push("/auth?step=3");
                      }
                    } catch {
                      router.push("/auth?step=3");
                    }
                  }, 1200);
                }}
                disabled={linkedinLoading}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "0.625rem",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  cursor: linkedinLoading ? "default" : "pointer",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  opacity: linkedinLoading ? 0.7 : 1,
                }}
              >
                {linkedinLoading ? (
                  <>
                    <Spinner />
                    Connecting…
                  </>
                ) : (
                  "Continue with LinkedIn"
                )}
              </button>
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: "1.25rem",
                color: "var(--color-muted)",
                fontSize: "0.875rem",
              }}
            >
              Don&apos;t have an account?{" "}
              <a
                href="/auth"
                style={{
                  color: "var(--color-primary)",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Sign up free
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
