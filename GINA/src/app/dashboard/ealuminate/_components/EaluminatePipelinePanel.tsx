"use client";

interface PipelineStep {
  n: string;
  title: string;
  desc: string;
}

interface EaluminatePipelinePanelProps {
  pipelineStep: number;
  steps: readonly PipelineStep[];
}

const STEP_ICONS = [
  /* 1 — Profile research: user */
  <svg
    key="user"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>,
  /* 2 — Keyword preparation: key */
  <svg
    key="key"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3L22 7l-3-3" />
  </svg>,
  /* 3 — Scan and classification: database */
  <svg
    key="db"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>,
  /* 4 — Brief ready: file-text */
  <svg
    key="file"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>,
];

export function EaluminatePipelinePanel({
  pipelineStep,
  steps,
}: EaluminatePipelinePanelProps) {
  return (
    <div
      className="eal-pipeline"
      style={{
        border: "1px solid #d1d9e0",
        borderRadius: "0.875rem",
        background: "#ffffff",
        padding: "clamp(0.875rem, 2vw, 1.25rem)",
        position: "sticky",
        top: "1rem",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "clamp(0.875rem, 2vw, 1.25rem)",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(0.5625rem, 1.5vw, 0.6875rem)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Scan Pipeline
        </p>
        {/* share-2 / network icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </div>

      {/* Steps */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.75rem, 1.5vw, 1rem)",
        }}
      >
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = pipelineStep > stepNum;
          const isActive = pipelineStep === stepNum;
          const iconColor = isCompleted
            ? "#48D4B8"
            : isActive
              ? "#4479DA"
              : "#94a3b8";

          return (
            <div
              key={step.n}
              style={{
                display: "flex",
                gap: "clamp(0.5rem, 1vw, 0.75rem)",
                alignItems: "flex-start",
              }}
            >
              {/* Number circle */}
              <div
                style={{
                  width: "clamp(1.75rem, 4vw, 2rem)",
                  height: "clamp(1.75rem, 4vw, 2rem)",
                  borderRadius: "50%",
                  backgroundColor: isCompleted
                    ? "#48D4B8"
                    : isActive
                      ? "#4479DA"
                      : "#f1f5f9",
                  border: `1.5px solid ${isCompleted ? "#48D4B8" : isActive ? "#4479DA" : "#e2e8f0"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  minWidth: "clamp(1.75rem, 4vw, 2rem)",
                }}
              >
                {isCompleted ? (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      fontWeight: 700,
                      color: isActive ? "#fff" : "#94a3b8",
                    }}
                  >
                    {stepNum}
                  </span>
                )}
              </div>

              {/* Step icon circle */}
              <div
                style={{
                  width: "clamp(1.625rem, 3.5vw, 1.875rem)",
                  height: "clamp(1.625rem, 3.5vw, 1.875rem)",
                  borderRadius: "50%",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: iconColor,
                  marginTop: "0.0625rem",
                  minWidth: "clamp(1.625rem, 3.5vw, 1.875rem)",
                }}
              >
                {STEP_ICONS[i] ?? null}
              </div>

              {/* Text */}
              <div style={{ flex: 1, paddingTop: "0.125rem", minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 0.2rem",
                    fontSize: "clamp(0.75rem, 1.5vw, 0.875rem)",
                    fontWeight: isActive || isCompleted ? 600 : 500,
                    color: isActive
                      ? "#1e293b"
                      : isCompleted
                        ? "#475569"
                        : "#94a3b8",
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(0.6875rem, 1.25vw, 0.8125rem)",
                    color: isActive ? "#64748b" : "#94a3b8",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          marginTop: "clamp(0.875rem, 2vw, 1.25rem)",
          paddingTop: "clamp(0.75rem, 1.5vw, 1rem)",
          borderTop: "1px solid #f1f5f9",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor:
              pipelineStep >= 5
                ? "#4CAF50"
                : pipelineStep > 0
                  ? "#4479DA"
                  : "#4CAF50",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "clamp(0.6875rem, 1.25vw, 0.8125rem)",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          {pipelineStep === 0
            ? "Pipeline ready"
            : pipelineStep >= 4
              ? "Scan complete"
              : "In progress…"}
        </span>
      </div>
    </div>
  );
}
