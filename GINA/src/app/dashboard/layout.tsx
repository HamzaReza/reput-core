"use client";

import Sidebar from "@/components/common/Sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("reput_token");
      if (!token) { router.replace("/login"); return; }
      setAuthed(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  if (authed === null) return null;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--color-background, #ffffff)",
      }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Mobile top bar */}
        <header
          className="gina-topbar"
          style={{
            display: "none",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "#ffffff",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-foreground, #1e293b)",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Ealixir.png"
            alt="Ealixir"
            style={{ height: "2.75rem", objectFit: "contain" }}
          />
        </header>

        {/* Scrollable content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f8fafc",
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .gina-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
