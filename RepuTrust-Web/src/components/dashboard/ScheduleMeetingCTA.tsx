"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  score: number;
  totalLinks: number;
  hasNegative: boolean;
  imperativeOpen?: boolean;
  onImperativeClose?: () => void;
}

export default function ScheduleMeetingCTA({
  score,
  totalLinks,
  hasNegative,
  imperativeOpen,
  onImperativeClose,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (imperativeOpen) setOpen(true);
  }, [imperativeOpen]);

  const handleClose = () => {
    setOpen(false);
    onImperativeClose?.();
  };
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const cal = await getCalApi({ namespace: "reputtrust-cta" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
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
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
        }}
      />
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
            onClick={handleClose}
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

  const isBadScore = score < 86 && totalLinks > 0;

  const message =
    totalLinks === 0
      ? "We couldn't find any relevant links with under your name"
      : score === 100 && hasNegative
        ? "Your reput score is good but we found issues affecting your reputation. Our team can help."
        : score === 100
          ? null
          : score >= 86 && hasNegative
            ? "Your reput score is good but we found issues affecting your reputation. Our team can help."
            : score >= 86
              ? "Your reput score is good - If you want it to be perfect, then contact our team"
              : null;

  return (
    <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
      {isBadScore ? (
        <div
          style={{
            borderRadius: "1.25rem",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #4a8fd4 0%, #3aafc4 50%, #2fb8b0 100%)",
            padding: "1.75rem 1.5rem 1.5rem",
            color: "#fff",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              marginBottom: "1.5rem",
              lineHeight: 1.2,
            }}
          >
            Did it ever happen?
          </h3>
          {[
            <>
              That you <strong>couldn&apos;t open a bank account</strong>?
            </>,
            <>
              That you <strong>couldn&apos;t find a job</strong> due to negative
              links?
            </>,
            <>
              That you were <strong>shamed</strong> for{" "}
              <strong>negative news about you</strong>?
            </>,
            <>
              That your kids <strong>weren&apos;t accepted</strong> to private
              schools?
            </>,
          ].map((line, i) => (
            <p
              key={i}
              style={{
                fontSize: "0.975rem",
                lineHeight: 1.55,
                marginBottom: "1rem",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {line}
            </p>
          ))}
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            If so you, <strong>WE</strong> can help you!
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              width: "100%",
              padding: "0.875rem",
              borderRadius: "9999px",
              background: "#fff",
              color: "#2a8fa8",
              fontWeight: 800,
              fontSize: "0.9375rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            Schedule a Meeting
          </button>
        </div>
      ) : (
        <>
          {message && (
            <p
              style={{
                color: "var(--color-muted)",
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
              }}
            >
              {message}
            </p>
          )}
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
        </>
      )}

      {mounted && open && createPortal(modal, document.body)}
    </div>
  );
}
