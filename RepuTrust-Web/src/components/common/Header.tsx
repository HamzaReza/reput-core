"use client";

import { clearAuth, isAuthed as checkAuthed } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth" || pathname === "/login";
  const isAdminPage = pathname === "/feedback-admin";
  const [isAuthed, setIsAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setIsAuthed(checkAuthed());

    const onAuthChange = () => setIsAuthed(checkAuthed());
    window.addEventListener("reput-auth-change", onAuthChange);

    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("reput-auth-change", onAuthChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close drawer on route change / resize
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const signOut = () => {
    clearAuth();
    setIsAuthed(false);
    setDrawerOpen(false);
    window.dispatchEvent(new Event("reput-auth-change"));
    router.push("/login");
  };

  const close = () => setDrawerOpen(false);

  const navLinkStyle: React.CSSProperties = {
    color: "var(--color-muted)",
    fontSize: "0.875rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "color 0.2s",
  };

  const drawerLinkStyle: React.CSSProperties = {
    display: "block",
    padding: "0.75rem 0",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-muted)",
    textDecoration: "none",
    transition: "color 0.2s",
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 50,
          backgroundColor: scrolled
            ? "rgba(255,255,255,0.72)"
            : "rgba(255,255,255,0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(0,0,0,0.08)"
            : "1px solid rgba(0,0,0,0.04)",
          transition:
            "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <nav
          style={{
            margin: "0 auto",
            height: "4.5rem",
            padding: "0 clamp(1rem, 4vw, 2rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href={isAuthPage || isAdminPage ? "#" : isAuthed ? "/dashboard" : "/"}
            onClick={isAuthPage ? (e) => { e.preventDefault(); signOut(); } : isAdminPage ? (e) => e.preventDefault() : undefined}
            style={{ display: "flex", alignItems: "center", flexShrink: 0, cursor: isAdminPage ? "default" : "pointer" }}
          >
            <Image
              src="/images/logo-grey.png"
              alt="RepuTrust Logo"
              width={220}
              height={66}
              style={{ height: "clamp(1.5rem, 5vw, 2.25rem)", width: "auto" }}
              priority
              loading="eager"
            />
          </Link>

          {/* Desktop nav */}
          <div
            className="desktop-nav"
            style={{
              display: isAuthPage || isAdminPage ? "none" : "flex",
              alignItems: "center",
              gap: "clamp(0.75rem, 2.5vw, 2rem)",
            }}
          >
            {isAuthed && (
              <Link
                href="/dashboard"
                className="header-nav-link"
                style={navLinkStyle}
              >
                Scanner
              </Link>
            )}
            {isAuthed && (
              <Link
                href="/meeting"
                className="header-nav-link"
                style={navLinkStyle}
              >
                Meetings
              </Link>
            )}
            {isAuthed && (
              <Link
                href="/settings"
                className="header-nav-link"
                style={navLinkStyle}
              >
                Settings
              </Link>
            )}
            {isAuthed ? (
              <button
                onClick={signOut}
                className="glow-button"
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                className="glow-button"
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  display: "inline-block",
                  textDecoration: "none",
                }}
              >
                Login
              </Link>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            className={isAuthPage || isAdminPage ? "hamburger hamburger-hidden" : "hamburger"}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{
              display: "none",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "5px",
              width: "2.25rem",
              height: "2.25rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                width: "22px",
                height: "2px",
                backgroundColor: "var(--color-foreground)",
                borderRadius: "2px",
                display: "block",
              }}
            />
            <span
              style={{
                width: "22px",
                height: "2px",
                backgroundColor: "var(--color-foreground)",
                borderRadius: "2px",
                display: "block",
              }}
            />
            <span
              style={{
                width: "22px",
                height: "2px",
                backgroundColor: "var(--color-foreground)",
                borderRadius: "2px",
                display: "block",
              }}
            />
          </button>
        </nav>
      </header>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 998,
            backgroundColor: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          width: "min(18rem, 85vw)",
          backgroundColor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Drawer header */}
        <div style={{ marginBottom: "2rem" }}>
          <Image
            src="/images/logo-grey.png"
            alt="RepuTrust"
            width={220}
            height={66}
            style={{ height: "clamp(1.5rem, 5vw, 2.25rem)", width: "auto" }}
          />
        </div>

        {/* Drawer links */}
        <nav style={{ flex: 1 }}>
          {isAuthed && (
            <Link
              href="/dashboard"
              onClick={close}
              className="drawer-nav-link"
              style={drawerLinkStyle}
            >
              Scanner
            </Link>
          )}
          {isAuthed && (
            <Link
              href="/meeting"
              onClick={close}
              className="drawer-nav-link"
              style={drawerLinkStyle}
            >
              Meetings
            </Link>
          )}
          {isAuthed && (
            <Link
              href="/settings"
              onClick={close}
              className="drawer-nav-link"
              style={drawerLinkStyle}
            >
              Settings
            </Link>
          )}
        </nav>

        {/* Drawer CTA */}
        <div style={{ paddingTop: "1.5rem" }}>
          {isAuthed ? (
            <button
              onClick={signOut}
              className="glow-button"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.625rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="glow-button"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.75rem",
                borderRadius: "0.625rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Login
            </Link>
          )}
        </div>
      </div>

      <style jsx global>{`
        .header-nav-link:hover,
        .drawer-nav-link:hover {
          color: var(--color-primary) !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .desktop-nav {
            display: none !important;
          }
          .hamburger {
            display: flex !important;
          }
          .hamburger-hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
