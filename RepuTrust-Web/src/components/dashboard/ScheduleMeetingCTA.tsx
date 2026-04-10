"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";

export default function ScheduleMeetingCTA() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const cal = await getCalApi({ namespace: "reputtrust-cta" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, [open]);

  return (
    <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
      <p
        style={{
          color: "var(--color-muted)",
          fontSize: "0.875rem",
          marginBottom: "0.75rem",
        }}
      >
        We found issues affecting your reputation. Our team can help.
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        {open ? "Hide Scheduler" : "Schedule a Meeting"}
      </button>

      {open && (
        <div
          style={{
            marginTop: "1.5rem",
            borderRadius: "0.75rem",
            overflow: "hidden",
          }}
        >
          <Cal
            namespace="reputtrust-cta"
            calLink={process.env.NEXT_PUBLIC_CAL_LINK ?? ""}
            style={{ width: "100%", height: "650px" }}
            config={{ layout: "month_view" }}
          />
        </div>
      )}
    </div>
  );
}
