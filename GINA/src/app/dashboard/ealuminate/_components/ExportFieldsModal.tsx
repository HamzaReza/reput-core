"use client";
import { useState } from "react";

interface Field {
  key: string;
  label: string;
  color: string;
}

interface ExportFieldsModalProps {
  title: string;
  fields: Field[];
  onConfirm: (selectedKeys: string[]) => void;
  onClose: () => void;
}

export default function ExportFieldsModal({
  title,
  fields,
  onConfirm,
  onClose,
}: ExportFieldsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(fields.map((f) => f.key)),
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const noneSelected = selected.size === 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "1rem",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 420,
          margin: "1rem",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem 1rem",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <p
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#64748b",
              margin: "0.25rem 0 0",
            }}
          >
            Select the sections to include in the export.
          </p>
        </div>

        {/* Field list */}
        <div style={{ padding: "0.75rem 1.5rem" }}>
          {fields.map((field) => {
            const checked = selected.has(field.key);
            return (
              <label
                key={field.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  cursor: "pointer",
                  userSelect: "none",
                  borderBottom: "1px solid #f8fafc",
                }}
              >
                {/* Colored accent bar */}
                <span
                  style={{
                    width: 3,
                    height: 18,
                    borderRadius: 2,
                    background: field.color,
                    flexShrink: 0,
                  }}
                />
                {/* Native checkbox styled */}
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(field.key)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: field.color,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: checked ? "#1e293b" : "#94a3b8",
                    transition: "color 0.15s",
                  }}
                >
                  {field.label}
                </span>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.625rem",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "transparent",
              color: "#64748b",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={noneSelected}
            onClick={() => onConfirm(Array.from(selected))}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: "999px",
              border: "none",
              background: noneSelected ? "#cbd5e1" : "#4479DA",
              color: "#ffffff",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: noneSelected ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "background 0.15s",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
