"use client";

import { clearAuth } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Lead Generate",
    href: "/dashboard/lead",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    clearAuth();
    window.dispatchEvent(new Event("reput-auth-change"));
    router.push("/login");
  };

  let userName = "";
  let userEmail = "";
  try {
    const raw = localStorage.getItem("reput_user");
    if (raw) {
      const u = JSON.parse(raw);
      userEmail = u.email ?? "";
      userName = u.name || userEmail;
    }
  } catch {}

  const sidebarContent = (
    <aside
      style={{
        width: "240px",
        height: "100%",
        backgroundColor: "#ffffff",
        borderRight: "1px solid var(--color-border, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "1.25rem 1.25rem 1rem",
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Link href="/dashboard" onClick={onClose} style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/images/Ealixir.png"
            alt="Ealixir"
            width={160}
            height={54}
            style={{ objectFit: "contain" }}
          />
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.75rem 0.75rem", overflowY: "auto" }}>
        <p
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-muted, #64748b)",
            padding: "0 0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          Tools
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#4479DA" : "var(--color-foreground, #1e293b)",
                backgroundColor: isActive ? "rgba(68,121,218,0.08)" : "transparent",
                transition: "background-color 0.15s, color 0.15s",
                marginBottom: "0.125rem",
              }}
            >
              <span
                style={{
                  color: isActive ? "#4479DA" : "var(--color-muted, #64748b)",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
        }}
      >
        {userName && (
          <div style={{ marginBottom: "0.75rem" }}>
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-foreground, #1e293b)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </p>
            {userEmail !== userName && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-muted, #64748b)",
                  margin: "0.125rem 0 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </p>
            )}
          </div>
        )}
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "transparent",
            color: "var(--color-muted, #64748b)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "background-color 0.15s, color 0.15s",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="gina-sidebar-desktop">{sidebarContent}</div>

      {/* Mobile overlay — always in DOM so transitions play on both open and close */}
      <div
        className="gina-mobile-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          pointerEvents: open ? "all" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            opacity: open ? 1 : 0,
            transition: "opacity 0.42s ease",
          }}
        />
        {/* Drawer */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            transform: open ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {sidebarContent}
        </div>
      </div>

      <style>{`
        .gina-sidebar-desktop { display: flex; height: 100%; }
        .gina-mobile-overlay { display: none; }
        @media (max-width: 767px) {
          .gina-sidebar-desktop { display: none; }
          .gina-mobile-overlay { display: flex; }
        }
      `}</style>
    </>
  );
}
