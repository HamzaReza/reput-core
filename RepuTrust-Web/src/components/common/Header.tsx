"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
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
        {/* Logo — left */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <Image
            src="/images/logo-white.png"
            alt="RepuTrust Logo"
            width={220}
            height={66}
            style={{ height: "2rem", width: "auto" }}
            priority
          />
        </Link>

        {/* Right side: nav links + sign in, all grouped together */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            href="/dashboard"
            className="header-nav-link"
            style={{
              color: "var(--color-muted)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/quote"
            className="header-nav-link"
            style={{
              color: "var(--color-muted)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Get Quote
          </Link>
          <Link
            href="/settings"
            className="header-nav-link"
            style={{
              color: "var(--color-muted)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Settings
          </Link>

          <Link
            href="/auth"
            className="glow-button"
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
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
