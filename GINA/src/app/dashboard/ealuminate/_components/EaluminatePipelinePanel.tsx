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

export function EaluminatePipelinePanel({
  pipelineStep,
  steps,
}: EaluminatePipelinePanelProps) {
  return (
    <div
      className="eal-pipeline"
      style={{
        border: "1px solid rgba(255, 255, 255, 0.35)",
        borderRadius: "0.625rem",
        background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
        boxShadow: "0 10px 24px rgba(68, 121, 218, 0.2)",
        padding: "1rem",
        position: "sticky",
        top: "1rem",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.95)",
          margin: "0 0 0.875rem",
        }}
      >
        Scan pipeline
      </p>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = pipelineStep > stepNum;
        const isActive = pipelineStep === stepNum;
        return (
          <div
            key={step.n}
            style={{
              marginBottom: i < 3 ? "0.75rem" : 0,
              padding: "0.65rem 0.625rem",
              borderRadius: "0.5rem",
              backgroundColor: isActive
                ? "rgba(255, 255, 255, 0.28)"
                : isCompleted
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(255, 255, 255, 0.14)",
              border: isActive
                ? "1px solid rgba(255, 255, 255, 0.65)"
                : isCompleted
                  ? "1px solid rgba(255, 255, 255, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  backgroundColor: isCompleted
                    ? "rgba(68, 121, 218, 0.45)"
                    : isActive
                      ? "rgba(72, 212, 184, 0.45)"
                      : "rgba(255, 255, 255, 0.2)",
                  border: isCompleted
                    ? "1px solid rgba(255, 255, 255, 0.4)"
                    : isActive
                      ? "1px solid rgba(255, 255, 255, 0.45)"
                      : "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: "999px",
                  padding: "0.2rem 0.42rem",
                  color: "rgba(255, 255, 255, 0.95)",
                  flexShrink: 0,
                }}
              >
                {step.n}
              </span>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: isActive || isCompleted ? 700 : 600,
                  color: isActive
                    ? "#ffffff"
                    : isCompleted
                      ? "rgba(255, 255, 255, 0.96)"
                      : "rgba(255, 255, 255, 0.9)",
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </span>
            </div>
            <p
              style={{
                margin: "0 0 0 1.7rem",
                fontSize: "0.875rem",
                color: isActive
                  ? "rgba(255, 255, 255, 0.92)"
                  : isCompleted
                    ? "rgba(255, 255, 255, 0.86)"
                    : "rgba(255, 255, 255, 0.78)",
                lineHeight: 1.45,
              }}
            >
              {step.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
