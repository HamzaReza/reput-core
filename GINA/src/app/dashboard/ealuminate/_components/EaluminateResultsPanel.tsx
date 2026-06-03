"use client";

import type { WebLink } from "@/lib/api";
import type { ComponentType } from "react";
import React, { useState } from "react";
import type { RiskLevel, ScanResult } from "./types";

const BRIEF_SECTION_COLORS: Record<string, string> = {
  "Key Points": "#4479DA",
  "Meeting Angles": "#6366f1",
  "Risk Indicators": "#ef4444",
  "Objection Handlers": "#48D4B8",
  "Supporting Intelligence": "#64748b",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  news: "News Articles",
  regulatory: "Regulatory Sources",
  social: "Social Mentions",
  filing: "Company Filings",
  court: "Court Records",
  sanction: "Sanctions & Watchlists",
  blog: "Blog Posts",
  forum: "Forum Discussions",
};

function BriefCollapse({
  label,
  items,
  ordered,
  open,
  onToggle,
  itemColor,
  children,
}: {
  label: string;
  items?: string[];
  ordered?: boolean;
  open: boolean;
  onToggle: () => void;
  itemColor?: string;
  children?: React.ReactNode;
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
        <div
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            cursor: "pointer",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#1e293b",
              lineHeight: 1.4,
            }}
          >
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
            style={{
              flexShrink: 0,
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        {open && items && (
          <List
            style={{
              margin: "0.625rem 0 0",
              paddingLeft: "1.1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "0.625rem",
            }}
          >
            {items.map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: "0.8125rem",
                  color: itemColor ?? "#475569",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </li>
            ))}
          </List>
        )}
        {open && children && (
          <div
            style={{
              marginTop: "0.625rem",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "0.625rem",
            }}
          >
            {children}
          </div>
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
  scanDuration?: number | null;
  currentStep?: string | null;
  jobId?: string | null;
}

function scoreDescription(score: number): string {
  if (score >= 86)
    return `A score of ${score} indicates a strong positive digital reputation with minimal risk indicators and favorable online presence.`;
  if (score >= 61)
    return `A score of ${score} indicates a mediocre to fair reputation with several risk areas to monitor. Some adverse content exists but may be manageable.`;
  if (score >= 26)
    return `A score of ${score} indicates a poor reputation with significant risk indicators. Notable adverse content has been identified across sources.`;
  return `A score of ${score} indicates a negative reputation profile. Critical risk signals and adverse content were detected across multiple sources.`;
}

export function EaluminateResultsPanel({
  loading,
  result,
  fullName,
  score,
  scoreLabel,
  usedKeywords,
  allLinks,
  expandedLinkIndex,
  setExpandedLinkIndex,
  apiRiskToUi,
  riskColors,
  onExportSummary,
  GaugeComponent,
  useKeywords,
  scanDuration,
  currentStep,
  jobId,
}: EaluminateResultsPanelProps) {
  const [openBriefSection, setOpenBriefSection] = useState<string | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  // Compute keyword hit counts from allLinks
  const keywordCounts: Record<string, number> = {};
  allLinks.forEach((link) => {
    const kws = (
      link.keywords?.length ? link.keywords : link.keyword ? [link.keyword] : []
    ) as string[];
    kws.forEach((kw) => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });

  const sortedKeywordHits = usedKeywords
    .map((kw) => ({ kw, count: keywordCounts[kw] || 0 }))
    .sort((a, b) => b.count - a.count);

  const visibleKeywords = showAllKeywords
    ? sortedKeywordHits
    : sortedKeywordHits.slice(0, 5);

  // Compute source type counts for Supporting Intelligence
  const sourceCounts = allLinks.reduce<Record<string, number>>((acc, link) => {
    const rawType = (link as unknown as { type?: string }).type ?? "other";
    const label = SOURCE_TYPE_LABELS[rawType] ?? rawType;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const sourceEntries = Object.entries(sourceCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div
      className="animate-scale-in"
      style={{
        borderRadius: "0.875rem",
        border: result ? "1px solid #d1d9e0" : "none",
        backgroundColor: result ? "#ffffff" : "transparent",
        minHeight: 0,
        display: loading || result ? "block" : "none",
      }}
    >
      {/* ── Loading state ── */}
      {loading &&
        (() => {
          const phaseKeys = [
            "building_queries",
            "serper_search",
            "firecrawl_scrape",
            "claude_classification",
            "generating_brief",
          ] as const;
          const activeIdx = currentStep
            ? phaseKeys.indexOf(currentStep as (typeof phaseKeys)[number])
            : 0;
          const safeIdx = activeIdx < 0 ? 0 : activeIdx;
          const progressPct = Math.max(
            5,
            Math.round((safeIdx / phaseKeys.length) * 100),
          );

          const VISUAL_STEPS = [
            {
              label: "Building search queries",
              desc: "Identity, employment, and context discovery.",
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
            },
            {
              label: "Searching the web",
              desc: "Build a relevant set of keywords and filters.",
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              ),
            },
            {
              label: "Scraping web pages",
              desc: "Sources scanned and signals are categorized.",
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              ),
            },
            {
              label: "Classifying results",
              desc: "Findings summarized into an executive-ready report.",
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="12" y1="9" x2="8" y2="9" />
                </svg>
              ),
            },
            {
              label: "Generating your brief",
              desc: "Generating your brief and report insights.",
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
            },
          ];

          return (
            <div
              className="animate-fade-in"
              style={{
                border: "1px solid #d1d9e0",
                borderRadius: "0.875rem",
                backgroundColor: "#ffffff",
                padding: "clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 3vw, 2rem)",
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              <style>{`
              @keyframes eal-scan-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(0.85); }
              }
              @keyframes eal-ring-pulse {
                0%, 100% { opacity: 0.35; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.08); }
              }
            `}</style>

              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  marginBottom: "0.375rem",
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
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#1e293b",
                    }}
                  >
                    Scan in Progress
                  </span>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#4479DA",
                      flexShrink: 0,
                      animation: "eal-scan-pulse 1.4s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>

              {/* Subtitle */}
              <p
                style={{
                  margin: "0 0 clamp(1.5rem, 3vw, 2.25rem)",
                  fontSize: "0.875rem",
                  color: "#64748b",
                }}
              >
                Ealuminate is scanning the web for relevant results.
              </p>

              {/* Horizontal pipeline */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0,
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                }}
              >
                {VISUAL_STEPS.map((step, i) => {
                  const isCompleted = i < safeIdx;
                  const isActive = i === safeIdx;
                  const iconColor =
                    isCompleted || isActive ? "#4479DA" : "#cbd5e1";
                  const circleBg =
                    isCompleted || isActive
                      ? "rgba(68,121,218,0.07)"
                      : "#f8fafc";
                  const circleBorder =
                    isCompleted || isActive ? "#4479DA" : "#e2e8f0";

                  return (
                    <React.Fragment key={i}>
                      {/* Step */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: "clamp(5.5rem, 12vw, 7.5rem)",
                          flex: "0 0 auto",
                        }}
                      >
                        {/* Circle with optional outer ring for active */}
                        <div
                          style={{
                            position: "relative",
                            width: "clamp(52px, 8vw, 68px)",
                            height: "clamp(52px, 8vw, 68px)",
                            marginBottom: "0.75rem",
                          }}
                        >
                          {isActive && (
                            <div
                              style={{
                                position: "absolute",
                                inset: "-7px",
                                borderRadius: "50%",
                                border: "1.5px solid rgba(68,121,218,0.3)",
                                animation:
                                  "eal-ring-pulse 1.6s ease-in-out infinite",
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              backgroundColor: circleBg,
                              border: `2px solid ${circleBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: iconColor,
                              boxSizing: "border-box",
                            }}
                          >
                            {step.icon}
                          </div>
                        </div>
                        {/* Labels */}
                        <p
                          style={{
                            margin: "0 0 0.2rem",
                            fontSize: "clamp(0.6875rem, 1.2vw, 0.8125rem)",
                            fontWeight: 600,
                            color:
                              isCompleted || isActive ? "#1e293b" : "#94a3b8",
                            textAlign: "center",
                            lineHeight: 1.3,
                          }}
                        >
                          {i + 1}. {step.label}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "clamp(0.625rem, 1vw, 0.75rem)",
                            color: "#94a3b8",
                            textAlign: "center",
                            lineHeight: 1.4,
                            maxWidth: "7rem",
                          }}
                        >
                          {step.desc}
                        </p>
                      </div>

                      {/* Arrow connector */}
                      {i < VISUAL_STEPS.length - 1 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "center",
                            flex: "1 1 auto",
                            minWidth: "clamp(1.5rem, 3vw, 3rem)",
                            paddingTop: "calc(clamp(52px, 8vw, 68px) / 2 - 6px)",
                          }}
                        >
                          <svg
                            width="32"
                            height="12"
                            viewBox="0 0 32 12"
                            fill="none"
                          >
                            <line
                              x1="0"
                              y1="6"
                              x2="26"
                              y2="6"
                              stroke={i < safeIdx ? "#4479DA" : "#e2e8f0"}
                              strokeWidth="1.5"
                              strokeDasharray={i < safeIdx ? "none" : "4 3"}
                            />
                            <polyline
                              points="22,2 28,6 22,10"
                              fill="none"
                              stroke={i < safeIdx ? "#4479DA" : "#e2e8f0"}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: "clamp(1rem, 2.5vw, 1.75rem)" }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: "#e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #4479DA, #48D4B8)",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "0.375rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "#4479DA",
                      fontWeight: 700,
                    }}
                  >
                    {progressPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Result state ── */}
      {!loading && result && (
        <div
          className="animate-fade-up"
          style={{ width: "100%", textAlign: "left" }}
        >
          <style>{`
            @media (max-width: 480px) {
              .eal-result-cols { flex-direction: column !important; }
              .eal-result-left { width: 100% !important; min-width: 0 !important; }
            }
            @media (max-width: 768px) {
              .eal-result-cols { flex-direction: column !important; }
              .eal-result-left { width: 100% !important; min-width: 0 !important; }
            }
          `}</style>

          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding:
                "clamp(0.875rem, 2vw, 1.25rem) clamp(1rem, 3vw, 1.75rem)",
              borderBottom: "1px solid #f1f5f9",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(0.9375rem, 3vw, 1.1875rem)",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Reputation Result
            </h2>
            <button
              type="button"
              onClick={onExportSummary}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.45rem clamp(0.75rem, 2vw, 1rem)",
                borderRadius: "0.625rem",
                border: "1px solid #d1d9e0",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#4479DA";
                (e.currentTarget as HTMLButtonElement).style.color = "#4479DA";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#d1d9e0";
                (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              }}
            >
              <svg
                width="13"
                height="13"
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
              Export Report
            </button>
          </div>

          {/* Two-column body */}
          <div
            className="eal-result-cols"
            style={{
              display: "flex",
              gap: "clamp(1rem, 3vw, 2rem)",
              alignItems: "flex-start",
              padding: "clamp(1rem, 2vw, 1.5rem) clamp(1rem, 3vw, 1.75rem)",
              boxSizing: "border-box",
              flexWrap: "wrap",
            }}
          >
            {/* LEFT — gauge + score */}
            <div
              className="eal-result-left"
              style={{
                width: "min(38%, 18rem)",
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              <GaugeComponent score={score} />
              <div
                style={{
                  marginTop: "-3.25rem",
                  position: "relative",
                  zIndex: 1,
                  display: "inline-block",
                  padding: "0.625rem 2rem",
                  borderRadius: "0.875rem",
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
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
              <p
                style={{
                  marginTop: "0.875rem",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  fontWeight: 500,
                }}
              >
                ReputScore®
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>0</span>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background:
                      "linear-gradient(90deg, #FF3D00, #FF8C00, #FFD600, #4CAF50)",
                    maxWidth: "8rem",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  100
                </span>
              </div>
            </div>

            {/* RIGHT — name, description, keywords */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: "0 0 0.375rem",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                }}
              >
                {fullName}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  marginBottom: "0.875rem",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Subject of Analysis
                </span>
              </div>

              <p
                style={{
                  margin: "0 0 1.25rem",
                  fontSize: "0.875rem",
                  color: "#64748b",
                  lineHeight: 1.65,
                }}
              >
                {scoreDescription(score)}
              </p>

              {/* Top Matched Keywords */}
              {useKeywords && sortedKeywordHits.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      marginBottom: "0.625rem",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#94a3b8",
                      }}
                    >
                      Top Matched Keywords
                    </p>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                  >
                    {visibleKeywords.map(({ kw, count }) => (
                      <span
                        key={kw}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "999px",
                          backgroundColor: "rgba(68,121,218,0.07)",
                          border: "1px solid rgba(68,121,218,0.18)",
                          color: "#4479DA",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                        }}
                      >
                        {kw}
                        {count > 0 && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#94a3b8",
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  {sortedKeywordHits.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllKeywords((v) => !v)}
                      style={{
                        marginTop: "0.5rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        color: "#4479DA",
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      {showAllKeywords
                        ? "Show fewer keywords"
                        : `View all keywords (${sortedKeywordHits.length})`}
                    </button>
                  )}
                </div>
              )}

              {allLinks.length > 0 && (
                <p
                  style={{
                    marginTop: "0.875rem",
                    fontSize: "0.875rem",
                    color: "#64748b",
                  }}
                >
                  Retrieved{" "}
                  <strong style={{ color: "#1e293b" }}>
                    {allLinks.length}
                  </strong>{" "}
                  relevant {allLinks.length === 1 ? "link" : "links"}{" "}
                  {useKeywords
                    ? "across all keyword searches."
                    : "from the direct name search."}
                </p>
              )}
            </div>
          </div>

          {/* Dev scan duration */}
          {process.env.NODE_ENV === "development" && scanDuration != null && (
            <div
              style={{
                padding: "0 1.75rem 0.75rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontFamily: "monospace",
                  color: "#94a3b8",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  padding: "0.2rem 0.5rem",
                }}
              >
                ⏱ scan took{" "}
                {scanDuration >= 60
                  ? `${Math.floor(scanDuration / 60)}m ${scanDuration % 60}s`
                  : `${scanDuration}s`}
              </span>
            </div>
          )}

          {/* Internal Meeting Brief */}
          {result.summary && (
            <div
              style={{
                margin: "0 1.75rem 1.5rem",
                borderRadius: "0.875rem",
                border: "1px solid #d1d9e0",
                backgroundColor: "#f8fafc",
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              {/* Brief header */}
              <div
                style={{
                  padding: "0.875rem 1.125rem",
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: "#f1f5f9",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.2rem",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  Internal Meeting Brief
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    color: "#64748b",
                  }}
                >
                  AI-generated brief to support informed meetings and
                  decision-making.
                </p>
              </div>

              <div
                style={{
                  padding: "1rem 1.125rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {(
                  [
                    {
                      label: "Key Points",
                      items: result.summary.issues,
                      ordered: false,
                      itemColor: "#475569",
                    },
                    {
                      label: "Meeting Angles",
                      items: result.summary.talkingPoints,
                      ordered: true,
                      itemColor: "#475569",
                    },
                    ...(result.summary.riskIndicators?.length
                      ? [
                          {
                            label: "Risk Indicators",
                            items: result.summary.riskIndicators,
                            ordered: false,
                            itemColor: "#ef4444",
                          },
                        ]
                      : []),
                    ...(result.summary.objectionHandlers?.length
                      ? [
                          {
                            label: "Objection Handlers",
                            items: result.summary.objectionHandlers,
                            ordered: true,
                            itemColor: "#475569",
                          },
                        ]
                      : []),
                  ] as {
                    label: string;
                    items: string[];
                    ordered: boolean;
                    itemColor: string;
                  }[]
                ).map(({ label, items, ordered, itemColor }) => (
                  <BriefCollapse
                    key={label}
                    label={label}
                    items={items}
                    ordered={ordered}
                    itemColor={itemColor}
                    open={openBriefSection === label}
                    onToggle={() =>
                      setOpenBriefSection(
                        openBriefSection === label ? null : label,
                      )
                    }
                  />
                ))}

                {/* Supporting Intelligence */}
                {sourceEntries.length > 0 && (
                  <BriefCollapse
                    label="Supporting Intelligence"
                    open={openBriefSection === "Supporting Intelligence"}
                    onToggle={() =>
                      setOpenBriefSection(
                        openBriefSection === "Supporting Intelligence"
                          ? null
                          : "Supporting Intelligence",
                      )
                    }
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(10rem, 1fr))",
                        gap: "0.75rem",
                      }}
                    >
                      {sourceEntries.map(([label, count]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "0.625rem",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              color: "#475569",
                              fontWeight: 500,
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              color: "#1e293b",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </BriefCollapse>
                )}
              </div>

              {/* Footer disclaimer */}
              <div
                style={{
                  padding: "0.75rem 1.125rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  This brief is AI-generated and should be reviewed by analysts.
                </p>
              </div>
            </div>
          )}

          {/* No results */}
          {allLinks.length === 0 && (
            <div
              style={{
                margin: "1.5rem 1.75rem",
                padding: "1.5rem",
                borderRadius: "0.875rem",
                border: "1px solid #e2e8f0",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              No results found.
            </div>
          )}

          {/* Link list */}
          {allLinks.length > 0 && (
            <div
              style={{
                margin: "0 1.75rem 1.75rem",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[...allLinks]
                .sort((a, b) => {
                  if (!a.date && !b.date) return 0;
                  if (!a.date) return 1;
                  if (!b.date) return -1;
                  return (
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                })
                .map((item, i) => {
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
                            gap: "0.5rem",
                            marginTop: "0.375rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#94a3b8",
                              flexShrink: 0,
                            }}
                          >
                            {domain}
                          </span>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#cbd5e1",
                              flexShrink: 0,
                            }}
                          >
                            ·
                          </span>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              color: risk.color,
                              flexShrink: 0,
                            }}
                          >
                            {uiRisk}
                          </span>
                          {useKeywords &&
                            (() => {
                              const kws = item.keywords?.length
                                ? item.keywords
                                : item.keyword
                                  ? [item.keyword]
                                  : [];
                              if (!kws.length) return null;
                              return (
                                <div
                                  style={
                                    {
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      flex: 1,
                                      minWidth: 0,
                                      overflowX: "auto",
                                      flexWrap: "nowrap",
                                      scrollbarWidth: "none",
                                      msOverflowStyle: "none",
                                    } as React.CSSProperties
                                  }
                                >
                                  {kws.map((kw, ki) => (
                                    <React.Fragment key={ki}>
                                      <span
                                        style={{
                                          fontSize: "0.6875rem",
                                          color: "#cbd5e1",
                                          flexShrink: 0,
                                        }}
                                      >
                                        ·
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "0.6875rem",
                                          fontWeight: 500,
                                          color: "#6366f1",
                                          backgroundColor:
                                            "rgba(99,102,241,0.08)",
                                          padding: "0.125rem 0.5rem",
                                          borderRadius: "999px",
                                          flexShrink: 0,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {kw}
                                      </span>
                                    </React.Fragment>
                                  ))}
                                </div>
                              );
                            })()}
                          {item.country && (
                            <>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  color: "#cbd5e1",
                                  flexShrink: 0,
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
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.country}
                              </span>
                            </>
                          )}
                          {item.date && (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                color: "#94a3b8",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                marginLeft: "auto",
                              }}
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
