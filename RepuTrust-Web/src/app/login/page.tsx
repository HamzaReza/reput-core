"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { Toast, useToast } from "@/components/common/Toast";
import { auth, setToken } from "@/lib/api";
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
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_expired") {
      toast.show("The session has expired");
    }
  }, []);

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
          localStorage.setItem(
            "reput_keywords",
            res.user.profile.keywords.join(","),
          );
        }
        if (res.user.profile?.avatar_url) {
          localStorage.setItem("reput_avatar", res.user.profile.avatar_url);
        }
      } catch {}
      window.dispatchEvent(new Event("reput-auth-change"));
      // is_verified check commented out — OTP not active in beta
      // if (!res.user.is_verified) { router.push("/auth?step=2"); } else
      if (!res.user.profile_complete) {
        router.push("/auth?step=6");
      } else {
        router.push("/dashboard");
      }
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
                <p
                  style={{
                    color: "#FF6B4A",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    margin: 0,
                  }}
                >
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
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              <p
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.8125rem",
                  margin: "0 0 0.25rem",
                }}
              >
                Or continue with
              </p>

              {/* Google */}
              <button
                onClick={() => toast.show("Coming soon")}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "0.625rem",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M43.611 20.083H42V20H24v8h11.303C33.9 32.67 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    fill="#FFC107"
                  />
                  <path
                    d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    fill="#FF3D00"
                  />
                  <path
                    d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.311 0-9.863-3.309-11.29-7.913l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    fill="#4CAF50"
                  />
                  <path
                    d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C42.012 35.853 44 30.338 44 24c0-1.341-.138-2.65-.389-3.917z"
                    fill="#1976D2"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Apple */}
              <button
                onClick={() => toast.show("Coming soon")}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "0.625rem",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                </svg>
                Continue with Apple
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => toast.show("Coming soon")}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "0.625rem",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Continue with LinkedIn
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
