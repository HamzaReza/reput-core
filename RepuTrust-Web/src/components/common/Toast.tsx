"use client";

import { useState, useCallback, useRef } from "react";

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2800);
  }, []);

  return { visible, message, show };
}

export function Toast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "1rem"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none",
        zIndex: 9999,
        backgroundColor: "#1e293b",
        color: "#ffffff",
        padding: "0.75rem 1.25rem",
        borderRadius: "0.625rem",
        fontSize: "0.9rem",
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#48D4B8" }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      {message}
    </div>
  );
}
