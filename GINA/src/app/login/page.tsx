"use client";

import { auth, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.625rem",
  border: "1px solid rgba(255,255,255,0.3)",
  backgroundColor: "rgba(255,255,255,0.15)",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "rgba(255,255,255,0.85)",
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
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
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-background, #ffffff)",
        padding: "1.5rem",
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "0.75rem" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Ealixir.png"
          alt="Ealixir"
          style={{ height: "5.5rem", objectFit: "contain" }}
        />
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          borderRadius: "1rem",
          padding: "2rem",
          background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
          boxShadow: "0 8px 40px rgba(68,121,218,0.28)",
        }}
      >
        <h1
          style={{
            fontSize: "1.625rem",
            fontWeight: 700,
            marginBottom: "0.375rem",
            textAlign: "center",
            color: "#ffffff",
          }}
        >
          Sign in to GINA
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.7)",
            marginBottom: "2rem",
            fontSize: "0.875rem",
          }}
        >
          Lead intelligence & reputation platform
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
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p
              style={{
                color: "#FFB4A2",
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
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.625rem",
              border: "none",
              backgroundColor: "#ffffff",
              color: "#4479DA",
              fontWeight: 700,
              fontSize: "0.9375rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
              transition: "opacity 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <>
                <Spinner />
                Signing in…
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
