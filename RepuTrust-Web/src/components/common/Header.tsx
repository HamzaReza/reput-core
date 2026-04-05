"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    try {
      setIsAuthed(localStorage.getItem("reput_authed") === "true");
    } catch {}
  }, []);

  const signOut = () => {
    try {
      localStorage.clear();
    } catch {}
    setIsAuthed(false);
    window.dispatchEvent(new Event("reput-auth-change"));
    router.push("/");
  };

  return (
    <header
      style={{
        backgroundColor: "rgba(10, 14, 26, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
      }}
    >
      <nav
        style={{
          margin: "0 auto",
          height: "4.5rem",
          padding: "0 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image
            src="/images/logo-white.png"
            alt="RepuTrust Logo"
            width={220}
            height={66}
            style={{ height: "2rem", width: "auto" }}
            priority
          />
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {isAuthed && (
            <Link
              href="/dashboard"
              className="header-nav-link"
              style={{ color: "var(--color-muted)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            >
              Scanner
            </Link>
          )}

          <Link
            href="/quote"
            className="header-nav-link"
            style={{ color: "var(--color-muted)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
          >
            Removal Plans
          </Link>

          {isAuthed && (
            <Link
              href="/settings"
              className="header-nav-link"
              style={{ color: "var(--color-muted)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            >
              Settings
            </Link>
          )}

          {isAuthed ? (
            <button
              onClick={signOut}
              className="glow-button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", border: "none" }}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="glow-button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 600, display: "inline-block", textDecoration: "none" }}
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      <style jsx global>{`
        .header-nav-link:hover {
          color: #4ecdc4 !important;
        }
      `}</style>
    </header>
  );
}
