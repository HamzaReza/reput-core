"use client";

import type { WebLink } from "@/lib/api";
import React from "react";
import type { ComponentType } from "react";
import { useState } from "react";
import type { RiskLevel, ScanResult } from "./types";

const BRIEF_SECTION_COLORS: Record<string, string> = {
  "Key Points": "#4479DA",
  "Meeting Angles": "#6366f1",
  "Risk Indicators": "#ef4444",
  "Objection Handlers": "#48D4B8",
};

function BriefCollapse({
  label,
  items,
  ordered,
  open,
  onToggle,
  itemColor,
}: {
  label: string;
  items: string[];
  ordered?: boolean;
  open: boolean;
  onToggle: () => void;
  itemColor?: string;
}) {
  const color = BRIEF_SECTION_COLORS[label] ?? "#4479DA";
  const List = ordered ? "ol" : "ul";
  return (
    <div
      style={{
        display: "flex",
        borderRadius: "0.875rem",
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #e2e8f0",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#b6c4d4")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
    >
      <div style={{ width: 4, flexShrink: 0, backgroundColor: color }} />
      <div style={{ flex: 1, padding: "0.75rem 0.875rem", minWidth: 0 }}>
        <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", cursor: "pointer" }}>
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.4 }}>
            {label}
          </p>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        {open && (
          <List
            style={{ margin: "0.625rem 0 0", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.625rem" }}
          >
            {items.map((item, i) => (
              <li key={i} style={{ fontSize: "0.8125rem", color: itemColor ?? "#475569", lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}

interface EaluminateResultsPanelProps {
  loading: boolean;
  result: ScanResult | null;
  fullName: string;
  score: number;
  scoreLabel: (score: number) => { label: string; color: string };
  usedKeywords: string[];
  tipVisible: boolean;
  tipIdx: number;
  tips: readonly string[];
  allLinks: WebLink[];
  expandedLinkIndex: string | null;
  setExpandedLinkIndex: (value: string | null) => void;
  apiRiskToUi: (risk: string) => RiskLevel;
  riskColors: Record<RiskLevel, { bg: string; color: string; border: string }>;
  onExportSummary: () => void;
  GaugeComponent: ComponentType<{ score: number }>;
  useKeywords: boolean;
  isResuming?: boolean;
}

function KeywordsUsed({
  usedKeywords,
  allLinks,
  useKeywords,
}: {
  usedKeywords: string[];
  allLinks: WebLink[];
  useKeywords: boolean;
}) {
  return (
    <div style={{ marginTop: "1.25rem" }}>
      {useKeywords && usedKeywords.length > 0 && (
        <>
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              marginBottom: "0.5rem",
            }}
          >
            Keywords Found
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            {usedKeywords.map((kw) => (
              <span
                key={kw}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  backgroundColor: "rgba(68,121,218,0.08)",
                  border: "1px solid rgba(29, 65, 133, 0.2)",
                  color: "#4479DA",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </>
      )}
      {allLinks.length > 0 && (
        <p
          style={{
            marginTop: "0.6rem",
            fontSize: "0.9375rem",
            color: "#64748b",
          }}
        >
          We retrieved{" "}
          <strong style={{ color: "#1e293b" }}>{allLinks.length}</strong>{" "}
          relevant {allLinks.length === 1 ? "link" : "links"}{" "}
          {useKeywords
            ? "across all keyword searches."
            : "from the direct name search."}
        </p>
      )}
    </div>
  );
}

export function EaluminateResultsPanel({
  loading,
  result,
  fullName,
  score,
  scoreLabel,
  usedKeywords,
  tipVisible,
  tipIdx,
  tips,
  allLinks,
  expandedLinkIndex,
  setExpandedLinkIndex,
  apiRiskToUi,
  riskColors,
  onExportSummary,
  GaugeComponent,
  useKeywords,
  isResuming,
}: EaluminateResultsPanelProps) {
  const [openBriefSection, setOpenBriefSection] = useState<string | null>(null);

  return (
    <div
      className="animate-scale-in"
      style={{
        borderRadius: "0.875rem",
        border: loading || result ? "1px solid #d1d9e0" : "none",
        backgroundColor: loading || result ? "#ffffff" : "transparent",
        padding: "2.5rem 2rem",
        textAlign: "center",
        minHeight: loading || result ? "24rem" : 0,
        display: loading || result ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {loading && (
        <div
          className="animate-fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            width: "100%",
            maxWidth: "22rem",
            textAlign: "center",
            marginTop: "5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "2px solid #48D4B8",
                animation: "repu-ring-pulse 2.4s ease-out infinite",
                animationDelay: "0s",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "2px solid #4479DA",
                animation: "repu-ring-pulse 2.4s ease-out infinite",
                animationDelay: "0.8s",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "2px solid #48D4B8",
                animation: "repu-ring-pulse 2.4s ease-out infinite",
                animationDelay: "1.6s",
              }}
            />
            <img
              src="/images/logo-icon.png"
              alt="GINA"
              style={{
                width: 90,
                height: 90,
                objectFit: "contain",
                animation: "repu-logo-spin 4s linear infinite",
                position: "relative",
                zIndex: 1,
              }}
            />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              REPUTATION INTELLIGENCE IN PROGRESS
            </p>
            {isResuming && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                Still calculating your report — please wait…
              </p>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "#94a3b8",
              lineHeight: 1.65,
              opacity: tipVisible ? 1 : 0,
              transition: "opacity 0.5s ease",
              minHeight: "3.2em",
              willChange: "opacity",
              width: "100%",
            }}
          >
            <span style={{ fontWeight: 600, color: "#64748b" }}>Tip — </span>
            {tips[tipIdx]}
          </p>
        </div>
      )}

      {!loading && result && (
        <div
          className="animate-fade-up"
          style={{ width: "100%", textAlign: "center" }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-foreground)",
              letterSpacing: "0.08em",
              marginBottom: "2rem",
              textTransform: "uppercase",
            }}
          >
            {fullName}
          </h2>

          <GaugeComponent score={score} />

          <div
            style={{
              display: "inline-block",
              marginTop: "-3.25rem",
              position: "relative",
              zIndex: 1,
              padding: "0.625rem 2rem",
              borderRadius: "0.875rem",
              backgroundColor: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 600,
                color: scoreLabel(score).color,
                lineHeight: 1,
                marginBottom: "0.25rem",
              }}
            >
              {score}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: scoreLabel(score).color,
                textTransform: "uppercase",
              }}
            >
              {scoreLabel(score).label}
            </p>
          </div>

          <KeywordsUsed
            usedKeywords={usedKeywords}
            allLinks={allLinks}
            useKeywords={useKeywords}
          />

          {result.summary && (
            <div
              style={{
                marginTop: "1.25rem",
                borderRadius: "0.875rem",
                border: "1px solid #d1d9e0",
                backgroundColor: "#f8fafc",
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: "#f1f5f9",
                }}
              >
                <span
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Internal · Meeting Brief
                </span>
                <button
                  type="button"
                  onClick={onExportSummary}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.45rem",
                    borderRadius: "999px",
                    border: "1px solid transparent",
                    backgroundColor: "transparent",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#cbd5e1";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#4479DA";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#64748b";
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
                  Export
                </button>
              </div>
              <div style={{ padding: "1rem" }}>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.875rem" }}>
                  {result.summary.headline}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {([
                    { label: "Key Points",        items: result.summary.issues,                                             ordered: false, itemColor: "#475569" },
                    { label: "Meeting Angles",     items: result.summary.talkingPoints,                                      ordered: true,  itemColor: "#475569" },
                    ...(result.summary.riskIndicators?.length    ? [{ label: "Risk Indicators",   items: result.summary.riskIndicators,   ordered: false, itemColor: "#ef4444" }] : []),
                    ...(result.summary.objectionHandlers?.length ? [{ label: "Objection Handlers", items: result.summary.objectionHandlers, ordered: true,  itemColor: "#475569" }] : []),
                  ] as { label: string; items: string[]; ordered: boolean; itemColor: string }[]).map(({ label, items, ordered, itemColor }) => (
                    <BriefCollapse
                      key={label}
                      label={label}
                      items={items}
                      ordered={ordered}
                      itemColor={itemColor}
                      open={openBriefSection === label}
                      onToggle={() => setOpenBriefSection(openBriefSection === label ? null : label)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {allLinks.length === 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.5rem",
                borderRadius: "0.875rem",
                border: "1px solid var(--color-border)",
                textAlign: "center",
                color: "var(--color-muted)",
              }}
            >
              No results found.
            </div>
          )}

          {allLinks.length > 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {allLinks.map((item, i) => {
                const uiRisk = apiRiskToUi(item.risk);
                const risk = riskColors[uiRisk];
                const domain = (() => {
                  try {
                    return new URL(item.url).hostname.replace("www.", "");
                  } catch {
                    return item.source ?? "";
                  }
                })();
                const isExpanded = expandedLinkIndex === String(i);
                return (
                  <div
                    key={item.url}
                    onClick={() =>
                      setExpandedLinkIndex(isExpanded ? null : String(i))
                    }
                    style={{
                      display: "flex",
                      borderRadius: "0.875rem",
                      overflow: "hidden",
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "#b6c4d4")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                  >
                    <div
                      style={{
                        width: 4,
                        flexShrink: 0,
                        backgroundColor: risk.color,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        padding: "0.75rem 0.875rem",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#1e293b",
                            lineHeight: 1.4,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          <span
                            style={{
                              color: "#94a3b8",
                              fontWeight: 400,
                              marginRight: "0.35rem",
                            }}
                          >
                            {i + 1}.
                          </span>
                          {item.title}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexShrink: 0,
                          }}
                        >
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: "#94a3b8",
                              display: "flex",
                              lineHeight: 1,
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
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              color: "#cbd5e1",
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          marginTop: "0.375rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.6875rem", color: "#94a3b8" }}
                          >
                            {domain}
                          </span>
                          <span
                            style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}
                          >
                            ·
                          </span>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              color: risk.color,
                            }}
                          >
                            {uiRisk}
                          </span>
                          {useKeywords && (() => {
                            const kws = item.keywords?.length
                              ? item.keywords
                              : item.keyword
                              ? [item.keyword]
                              : [];
                            return kws.map((kw, ki) => (
                              <React.Fragment key={ki}>
                                <span style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>·</span>
                                <span
                                  style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 500,
                                    color: "#6366f1",
                                    backgroundColor: "rgba(99,102,241,0.08)",
                                    padding: "0.125rem 0.5rem",
                                    borderRadius: "999px",
                                  }}
                                >
                                  {kw}
                                </span>
                              </React.Fragment>
                            ));
                          })()}
                          {item.country && (
                            <>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  color: "#cbd5e1",
                                }}
                              >
                                ·
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  fontWeight: 500,
                                  color: "#0ea5e9",
                                  backgroundColor: "rgba(14,165,233,0.08)",
                                  padding: "0.125rem 0.5rem",
                                  borderRadius: "999px",
                                }}
                              >
                                {item.country}
                              </span>
                            </>
                          )}
                        </div>
                        {item.date && (
                          <span
                            style={{ fontSize: "0.6875rem", color: "#94a3b8" }}
                          >
                            {item.date}
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <p
                          style={{
                            margin: "0.625rem 0 0",
                            fontSize: "0.775rem",
                            color: "#64748b",
                            lineHeight: 1.6,
                            borderTop: "1px solid #f1f5f9",
                            paddingTop: "0.625rem",
                          }}
                        >
                          {item.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
