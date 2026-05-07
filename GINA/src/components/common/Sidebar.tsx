"use client";

import { clearAuth } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  badge?: number | null;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Ealuminate",
    href: "/dashboard/ealuminate",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Operators",
    href: "/dashboard/operators",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export default function Sidebar({
  open,
  onClose,
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    clearAuth();
    window.dispatchEvent(new Event("reput-auth-change"));
    router.push("/login");
  };

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const readUser = () => {
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email ?? "");
        setUserName(u.name || u.email || "");
      }
    } catch {}
  };

  useEffect(() => {
    readUser();
    window.addEventListener("reput-auth-change", readUser);
    return () => window.removeEventListener("reput-auth-change", readUser);
  }, []);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <aside
      style={{
        width: collapsed ? "60px" : "240px",
        height: "100%",
        backgroundColor: "#ffffff",
        borderRight: "1px solid var(--color-border, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: "64px",
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "center",
          padding: collapsed ? "0" : "0 1.25rem",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", overflow: "hidden" }}
        >
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
      <nav
        style={{
          flex: 1,
          padding: collapsed ? "0.75rem 0" : "0.75rem",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                gap: "0.625rem",
                padding: collapsed ? "0.65rem 0" : "0.6rem 0.75rem",
                borderRadius: collapsed ? "0" : "0.5rem",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "#48D4B8"
                  : "var(--color-foreground, #1e293b)",
                backgroundColor: isActive
                  ? "rgba(72,212,184,0.10)"
                  : "transparent",
                transition: "background-color 0.15s, color 0.15s",
                marginBottom: "0.125rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    color: isActive ? "#48D4B8" : "var(--color-muted, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </span>
              {!collapsed && item.badge != null && (
                <span
                  style={{
                    backgroundColor: "#48D4B8",
                    color: "#fff",
                    borderRadius: "999px",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "0.125rem 0.4rem",
                    lineHeight: 1.4,
                    flexShrink: 0,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div
        style={{
          padding: collapsed ? "1rem 0" : "1rem 1.25rem",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          alignItems: collapsed ? "center" : "stretch",
          gap: "0.75rem",
          overflow: "hidden",
        }}
      >
        {collapsed ? (
          /* Collapsed: just avatar + sign-out icon */
          <>
            {userName && (
              <div
                title={userName}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(72,212,184,0.15)",
                  color: "#48D4B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials || "U"}
              </div>
            )}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-muted, #64748b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.25rem",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        ) : (
          /* Expanded: name + email + sign-out button */
          <>
            {userName && (
              <div>
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
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="gina-sidebar-desktop">{sidebarContent}</div>

      {/* Mobile overlay */}
      <div
        className="gina-mobile-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          pointerEvents: open ? "all" : "none",
        }}
      >
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
