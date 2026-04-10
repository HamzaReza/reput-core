"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ScheduleMeetingCTA() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const cal = await getCalApi({ namespace: "reputtrust-cta" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop — fully covers everything */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(92vw, 54rem)",
          maxHeight: "88vh",
          borderRadius: "1rem",
          overflow: "hidden",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            Schedule a Meeting
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-muted)",
              fontSize: "1.25rem",
              lineHeight: 1,
              padding: "0.25rem 0.5rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Cal embed */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Cal
            namespace="reputtrust-cta"
            calLink={process.env.NEXT_PUBLIC_CAL_LINK ?? ""}
            style={{ width: "100%", height: "650px" }}
            config={{ layout: "month_view" }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
      <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
        We found issues affecting your reputation. Our team can help.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "9999px",
          backgroundColor: "var(--color-button)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.9375rem",
          border: "none",
          cursor: "pointer",
        }}
      >
        Schedule a Meeting
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </div>
  );
}
