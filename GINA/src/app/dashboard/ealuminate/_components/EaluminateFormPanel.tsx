"use client";

import type {
  CSSProperties,
  ComponentType,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import { useState } from "react";
import MultiSelectPicker, { SingleSelectPicker } from "./MultiSelectPicker";
import type { KeywordFocus, PreAnalysisProfile } from "./types";

interface KeywordsEditorProps {
  keywords: string[];
  setKeywords: Dispatch<SetStateAction<string[]>>;
  readOnly?: boolean;
}

const MAX_KEYWORD_LANGUAGES = 5;

interface EaluminateFormPanelProps {
  scanComplete: boolean;
  preAnalysisDone: boolean;
  preAnalysisLoading: boolean;
  error: string;
  subjectType: "individual" | "company";
  setSubjectType: (value: "individual" | "company") => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  company: string;
  setCompany: (value: string) => void;
  countries: string[];
  setCountries: (value: string[]) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  description: string;
  keywordsCap: number;
  setKeywordsCap: (value: number) => void;
  keywordFocus: KeywordFocus;
  handleDescriptionChange: (value: string) => void;
  handleFocusChange: (value: KeywordFocus) => void;
  handleResearch: () => void;
  handleSkipToScan: () => void;
  preAnalysisProfile: PreAnalysisProfile | null;
  preAnalysisSummary: string;
  onExportReportMaster: () => void;
  keywordsReady: boolean;
  editableKeywords: string[];
  setEditableKeywords: Dispatch<SetStateAction<string[]>>;
  pagesCap: number;
  setPagesCap: (value: number) => void;
  handleRunScan: () => void;
  loading: boolean;
  countryOptions: readonly { value: string; label: string }[];
  KeywordsEditor: ComponentType<KeywordsEditorProps>;
  Spinner: ComponentType;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  keywordsCapOptions: readonly number[];
  keywordFocusOptions: readonly { value: KeywordFocus; label: string }[];
  pagesCapOptions: readonly number[];
  reportLanguage: string;
  setReportLanguage: (value: string) => void;
  reportLanguageOptions: readonly { value: string; label: string }[];
  keywordLanguages: string[];
  setKeywordLanguages: (value: string[]) => void;
  keywordLanguageOptions: readonly { value: string; label: string }[];
  useKeywords: boolean;
  setUseKeywords: (value: boolean) => void;
  scanFocus: KeywordFocus;
  setScanFocus: (value: KeywordFocus) => void;
  pipeline: ReactNode;
  scanTier: "standard" | "advanced";
  setScanTier: (value: "standard" | "advanced") => void;
  keywordLength: null | 1 | 2 | 3;
  setKeywordLength: (value: null | 1 | 2 | 3) => void;
  keywordLengthOptions: readonly { value: null | 1 | 2 | 3; label: string }[];
}

const PROFILE_FIELD_COLORS: Record<string, string> = {
  Identity: "#4479DA",
  Background: "#6366f1",
  Associations: "#f59e0b",
  "Recent News": "#48D4B8",
  "Negative Findings": "#ef4444",
  "Estimated Negative Links": "#FF6B4A",
  "Positive Presence": "#4CAF50",
  "Reputation Notes": "#94a3b8",
};

function ProfileCollapse({
  label,
  text,
  open,
  onToggle,
}: {
  label: string;
  text: string;
  open: boolean;
  onToggle: () => void;
}) {
  const color = PROFILE_FIELD_COLORS[label] ?? "#4479DA";
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
        {open && (
          <p
            style={{
              margin: "0.625rem 0 0",
              fontSize: "0.8125rem",
              color: "#64748b",
              lineHeight: 1.65,
              borderTop: "1px solid #f1f5f9",
              paddingTop: "0.625rem",
            }}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

export function EaluminateFormPanel(props: EaluminateFormPanelProps) {
  const [openProfileFields, setOpenProfileFields] = useState<string[]>([]);

  const {
    scanComplete,
    preAnalysisDone,
    preAnalysisLoading,
    error,
    subjectType,
    setSubjectType,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    company,
    setCompany,
    countries,
    setCountries,
    email,
    setEmail,
    phone,
    setPhone,
    description,
    keywordsCap,
    setKeywordsCap,
    keywordFocus,
    handleDescriptionChange,
    handleFocusChange,
    handleResearch,
    preAnalysisProfile,
    preAnalysisSummary,
    onExportReportMaster,
    keywordsReady,
    editableKeywords,
    setEditableKeywords,
    pagesCap,
    setPagesCap,
    handleRunScan,
    loading,
    countryOptions,
    KeywordsEditor,
    Spinner,
    inputStyle,
    labelStyle,
    keywordsCapOptions,
    keywordFocusOptions,
    pagesCapOptions,
    reportLanguage,
    setReportLanguage,
    reportLanguageOptions,
    keywordLanguages,
    setKeywordLanguages,
    keywordLanguageOptions,
    useKeywords,
    setUseKeywords,
    scanFocus,
    setScanFocus,
    pipeline,
    scanTier,
    setScanTier,
    keywordLength,
    setKeywordLength,
    keywordLengthOptions,
    handleSkipToScan,
  } = props;

  // Build profile field list for accordions
  const profileFieldEntries: [string, string][] = preAnalysisProfile
    ? ([
        ["Identity", preAnalysisProfile.identity],
        ["Background", preAnalysisProfile.background],
        preAnalysisProfile.associations
          ? ["Associations", preAnalysisProfile.associations]
          : null,
        preAnalysisProfile.recent_news
          ? ["Recent News", preAnalysisProfile.recent_news]
          : null,
        ["Positive Presence", preAnalysisProfile.positive_presence],
        ["Negative Findings", preAnalysisProfile.negative_findings],
        ["Reputation Notes", preAnalysisProfile.reputation_notes],
      ].filter(Boolean) as [string, string][])
    : [];

  const allExpanded =
    profileFieldEntries.length > 0 &&
    openProfileFields.length === profileFieldEntries.length;

  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      setOpenProfileFields([]);
    } else {
      setOpenProfileFields(profileFieldEntries.map(([label]) => label));
    }
  };

  const toggleProfileField = (label: string) => {
    setOpenProfileFields((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const statusColor = scanComplete
    ? "#4CAF50"
    : preAnalysisDone
      ? "#48D4B8"
      : "#4CAF50";
  const statusText = scanComplete
    ? "Complete"
    : preAnalysisDone
      ? "Research done"
      : "Ready";

  const pillBtn = (active: boolean): CSSProperties => ({
    padding: "0.4rem 1rem",
    borderRadius: "999px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    border: "1.5px solid",
    borderColor: active ? "#4479DA" : "#e2e8f0",
    backgroundColor: active ? "#eef3ff" : "#ffffff",
    color: active ? "#4479DA" : "#64748b",
  });

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .eal-subject-grid {
            grid-template-columns: 1fr !important;
          }
          .eal-name-row,
          .eal-company-field {
            grid-column: 1 !important;
          }
          .eal-name-row {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .eal-form {
            padding: 0.75rem !important;
          }
          .eal-name-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div
        style={{
          borderRadius: "0.875rem",
          border: "1px solid #d1d9e0",
          backgroundColor: "#ffffff",
          padding: "clamp(1.25rem, 4vw, 2rem)",
          marginBottom: "clamp(1rem, 3vw, 2rem)",
        }}
      >
        {/* Page header */}
        <div
          style={{
            position: "relative",
            marginBottom: "clamp(1rem, 2vw, 1.5rem)",
          }}
        >
          <h1
            style={{
              margin: "0 0 0.375rem",
              fontSize: "clamp(1rem, 4vw, 1.375rem)",
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            EALUMINATE
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.8125rem, 2vw, 0.9375rem)",
              color: "#64748b",
            }}
          >
            Enter the prospect&apos;s details to generate a reputation
            intelligence report.
          </p>
          <div
            style={{
              position: "static",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              marginTop: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: statusColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.8125rem)",
                fontWeight: 600,
                color: statusColor,
              }}
            >
              {statusText}
            </span>
          </div>
        </div>

        <form
          className="eal-card-body"
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement;
            if (submitter?.name === "skip") {
              handleSkipToScan();
            } else {
              handleResearch();
            }
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {/* ── STEP 1 — always visible ── */}
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#4479DA",
                  paddingBottom: "0.875rem",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                Research Setup &amp; Pre-Search Configuration
              </p>

              <div
                className="eal-subject-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "1rem",
                  alignItems: "end",
                }}
              >
                {/* Subject Type */}
                <div>
                  <label style={labelStyle}>Subject Type</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["individual", "company"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSubjectType(type)}
                        style={{
                          ...pillBtn(subjectType === type),
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          textTransform: "capitalize",
                        }}
                      >
                        {type === "individual" ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        ) : (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="2"
                              y="7"
                              width="20"
                              height="14"
                              rx="2"
                              ry="2"
                            />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                        )}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual: First + Last Name */}
                {subjectType === "individual" && (
                  <div
                    className="eal-name-row"
                    style={{
                      gridColumn: "span 2",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. John"
                        required
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Doe"
                        required
                        style={inputStyle}
                      />
                    </div>
                  </div>
                )}

                {/* Company: name field spans remaining 2 cols */}
                {subjectType === "company" && (
                  <div
                    className="eal-company-field"
                    style={{ gridColumn: "span 2" }}
                  >
                    <label style={labelStyle}>Company *</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Example Inc."
                      required
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {/* Optional company field for individual type */}
              {subjectType === "individual" && (
                <div>
                  <label style={labelStyle}>Company (optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Example Inc."
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Country */}
              <div>
                <label style={labelStyle}>Country *</label>
                <MultiSelectPicker
                  options={countryOptions}
                  selected={countries}
                  onChange={setCountries}
                  placeholder="Add a country"
                  required
                />
              </div>

              {/* Email + Phone */}
              <div className="lead-name-grid">
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "0.875rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "#94a3b8",
                        display: "flex",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john.doe@example.com"
                      style={{ ...inputStyle, paddingLeft: "2.25rem" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "0.875rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "#94a3b8",
                        display: "flex",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 555 123 0000 (optional)"
                      style={{ ...inputStyle, paddingLeft: "2.25rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* Background */}
              <div>
                <label style={labelStyle}>Background &amp; Context *</label>
                <textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Provide relevant context, roles, or known affiliations…"
                  rows={4}
                  required
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    lineHeight: 1.6,
                    minHeight: "6rem",
                  }}
                />
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    textAlign: "right",
                  }}
                >
                  {description.length} / 2000
                </p>
              </div>

              {/* Number of Keywords */}
              <div>
                <label style={labelStyle}>Number of Keywords</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {keywordsCapOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setKeywordsCap(n)}
                      style={pillBtn(keywordsCap === n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Recommended 5–10 for a balanced and comprehensive scan.
                </p>
              </div>

              {/* Keyword Length */}
              <div>
                <label style={labelStyle}>Keyword Length</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {keywordLengthOptions.map(({ value, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setKeywordLength(value)}
                      style={pillBtn(keywordLength === value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Word count each generated keyword should contain.
                </p>
              </div>

              {/* Keywords Language — multi-select dropdown */}
              <div>
                <label style={labelStyle}>Keywords Language</label>
                <MultiSelectPicker
                  options={keywordLanguageOptions}
                  selected={keywordLanguages}
                  onChange={setKeywordLanguages}
                  placeholder="Add a language"
                  maxSelected={MAX_KEYWORD_LANGUAGES}
                />
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Keywords are generated per selected language (e.g. 5 keywords
                  × 3 languages = 15). Leave empty to auto-detect from report
                  language / country.
                </p>
              </div>

              {/* Keyword Focus */}
              <div>
                <label style={labelStyle}>Keyword Focus</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {keywordFocusOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleFocusChange(value)}
                      style={pillBtn(keywordFocus === value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Focus determines the lens of analysis.
                </p>
              </div>

              {/* Report Language — dropdown */}
              <div>
                <label style={labelStyle}>Report Language</label>
                <SingleSelectPicker
                  options={reportLanguageOptions}
                  value={reportLanguage}
                  onChange={setReportLanguage}
                  placeholder="Select a language"
                />
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Language for the final report.
                </p>
              </div>

              {/* Scan Mode */}
              <div>
                <label style={labelStyle}>Scan Mode</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {(["standard", "advanced"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setScanTier(tier)}
                      style={{
                        ...pillBtn(scanTier === tier),
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      {tier === "standard" ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
                        </svg>
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      )}
                      {tier === "standard" ? "Standard" : "Advanced"}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "0.375rem 0 0",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                  }}
                >
                  Advanced enables deeper scanning and classification.
                </p>
              </div>

              {error && (
                <p
                  style={{ margin: 0, fontSize: "0.875rem", color: "#ef4444" }}
                >
                  {error}
                </p>
              )}

              {/* Primary actions — hidden once Step 2 is active */}
              {!preAnalysisDone ? (
                <>
                  <button
                    type="submit"
                    disabled={preAnalysisLoading}
                    className="glow-button"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontWeight: 700,
                      borderRadius: "999px",
                      opacity: preAnalysisLoading ? 0.5 : 1,
                      cursor: "pointer",
                    }}
                  >
                    {preAnalysisLoading ? (
                      <>
                        <Spinner />
                        Researching…
                      </>
                    ) : (
                      "Research"
                    )}
                  </button>

                  {preAnalysisLoading && (
                    <div
                      style={{
                        padding: "0.625rem 0.875rem",
                        borderRadius: "0.625rem",
                        backgroundColor: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.35)",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: "#d97706",
                        }}
                      >
                        Do not navigate away — all research data will be lost.
                      </p>
                    </div>
                  )}

                  {!preAnalysisLoading && (
                    <button
                      type="submit"
                      name="skip"
                      style={{
                        cursor: "pointer",
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: "#4479da",
                        background: "rgba(68,121,218,0.07)",
                        border: "1.5px solid rgba(68,121,218,0.25)",
                        borderRadius: "999px",
                        padding: "0.55rem 1.5rem",
                        alignSelf: "center",
                      }}
                    >
                      Skip to Scan →
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="submit"
                  className="glow-button"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "999px",
                    cursor: "pointer",
                  }}
                >
                  Re-Research
                </button>
              )}
            </>

            {/* ── STEP 2 — visible when research is done ── */}
            {preAnalysisDone && (
              <>
                <div style={{ borderTop: "2px solid #e2e8f0" }} />

                {/* Research Summary */}
                {preAnalysisSummary && preAnalysisProfile ? (
                  <div
                    style={{
                      borderRadius: "0.875rem",
                      border: "1px solid #d1d9e0",
                      backgroundColor: "#f8fafc",
                      padding: "1.25rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        marginBottom: "0.875rem",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9375rem",
                            fontWeight: 700,
                            color: "#1e293b",
                          }}
                        >
                          Research Summary
                        </p>
                        <p
                          style={{
                            margin: "0.2rem 0 0",
                            fontSize: "0.8125rem",
                            color: "#64748b",
                          }}
                        >
                          Pre-search intelligence overview
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          onClick={onExportReportMaster}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.3rem 0.65rem",
                            borderRadius: "999px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "transparent",
                            color: "#64748b",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <svg
                            width="11"
                            height="11"
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
                        <button
                          type="button"
                          onClick={handleExpandCollapseAll}
                          style={{
                            padding: "0.3rem 0.75rem",
                            borderRadius: "999px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "transparent",
                            color: "#64748b",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {allExpanded ? "Collapse all" : "Expand all"}
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {profileFieldEntries.map(([label, text]) => (
                        <ProfileCollapse
                          key={label}
                          label={label}
                          text={text}
                          open={openProfileFields.includes(label)}
                          onToggle={() => toggleProfileField(label)}
                        />
                      ))}
                    </div>
                  </div>
                ) : preAnalysisSummary ? (
                  <div
                    style={{
                      borderRadius: "0.875rem",
                      border: "1px solid #d1d9e0",
                      backgroundColor: "#f8fafc",
                      padding: "1.25rem",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8125rem",
                        color: "#64748b",
                        lineHeight: 1.65,
                      }}
                    >
                      {preAnalysisSummary}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: "0.875rem",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8125rem",
                        color: "#94a3b8",
                        fontStyle: "italic",
                      }}
                    >
                      Pre-analysis was skipped — no research summary available.
                    </p>
                  </div>
                )}

                {/* Estimated Negative Links */}
                {preAnalysisDone &&
                  preAnalysisSummary &&
                  preAnalysisProfile?.estimated_negative_links &&
                  (() => {
                    const { low, high, reasoning } =
                      preAnalysisProfile.estimated_negative_links;
                    return (
                      <div
                        style={{
                          borderRadius: "0.875rem",
                          border: "1.5px solid rgba(255,107,74,0.45)",
                          backgroundColor: "#fff8f5",
                          padding: "1.25rem 1.5rem",
                          display: "flex",
                          gap: "1rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "0.5rem",
                            backgroundColor: "rgba(255,107,74,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FF6B4A"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>
                        <div>
                          <p
                            style={{
                              margin: "0 0 0.25rem",
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              color: "#FF6B4A",
                              textTransform: "uppercase",
                            }}
                          >
                            Estimated Negative Links
                          </p>
                          <p
                            style={{
                              margin: "0 0 0.375rem",
                              fontSize: "2.25rem",
                              fontWeight: 800,
                              color: "#c0392b",
                              lineHeight: 1,
                            }}
                          >
                            {low.toLocaleString()}–{high.toLocaleString()}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.8rem",
                              color: "#64748b",
                              lineHeight: 1.6,
                            }}
                          >
                            {reasoning}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                {keywordsReady && (
                  <>
                    {/* Use Keywords toggle */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        padding: "0.875rem 1.125rem",
                        borderRadius: "0.875rem",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: "0 0 0.2rem",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "#1e293b",
                          }}
                        >
                          Use Keywords?
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8125rem",
                            color: "#64748b",
                          }}
                        >
                          Include custom keywords in the scan
                        </p>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "2.5rem",
                            height: "1.375rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={useKeywords}
                            onChange={(e) => setUseKeywords(e.target.checked)}
                            style={{
                              position: "absolute",
                              opacity: 0,
                              width: 0,
                              height: 0,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: "999px",
                              backgroundColor: useKeywords
                                ? "#4479DA"
                                : "#cbd5e1",
                              transition: "background-color 0.2s",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "0.1875rem",
                                left: useKeywords ? "1.1875rem" : "0.1875rem",
                                width: "1rem",
                                height: "1rem",
                                borderRadius: "50%",
                                backgroundColor: "white",
                                transition: "left 0.2s",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: useKeywords ? "#4479DA" : "#94a3b8",
                            minWidth: "1.75rem",
                          }}
                        >
                          {useKeywords ? "Yes" : "No"}
                        </span>
                      </label>
                    </div>

                    {/* Keywords editor */}
                    <div
                      style={{
                        opacity: useKeywords ? 1 : 0.4,
                        pointerEvents: useKeywords ? "auto" : "none",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <label style={labelStyle}>
                        Keywords — Add or edit keywords to guide the scan
                      </label>
                      <KeywordsEditor
                        keywords={editableKeywords}
                        setKeywords={setEditableKeywords}
                      />
                    </div>

                    {/* Scan Focus + Search Depth */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1.25rem",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Scan Focus</label>
                        <p
                          style={{
                            margin: "0 0 0.5rem",
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                          }}
                        >
                          Define the primary focus of the scan
                        </p>
                        <div style={{ position: "relative" }}>
                          <select
                            value={scanFocus}
                            onChange={(e) =>
                              setScanFocus(e.target.value as KeywordFocus)
                            }
                            style={{
                              ...inputStyle,
                              cursor: "pointer",
                              paddingRight: "2.5rem",
                              appearance: "none",
                            }}
                          >
                            {keywordFocusOptions
                              .filter(({ value }) => value !== "neutral")
                              .map(({ value, label }) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                          </select>
                          <svg
                            style={{
                              position: "absolute",
                              right: "0.875rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                            }}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>Search Depth</label>
                        <p
                          style={{
                            margin: "0 0 0.5rem",
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                          }}
                        >
                          How deep should we go?
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.35rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {pagesCapOptions.map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setPagesCap(page)}
                              style={{
                                padding: "0.35rem 0.6rem",
                                borderRadius: "0.5rem",
                                fontSize: "0.8125rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                                border: "1.5px solid",
                                borderColor:
                                  pagesCap === page ? "#4479DA" : "#e2e8f0",
                                backgroundColor:
                                  pagesCap === page ? "#4479DA" : "#ffffff",
                                color: pagesCap === page ? "#fff" : "#64748b",
                              }}
                            >
                              {page === 50 ? "MAX" : page}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {error && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.875rem",
                          color: "#ef4444",
                        }}
                      >
                        {error}
                      </p>
                    )}

                    {/* Launch Scan button */}
                    <button
                      type="button"
                      disabled={
                        loading ||
                        (useKeywords && editableKeywords.length === 0)
                      }
                      onClick={handleRunScan}
                      className="glow-button"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        fontWeight: 700,
                        border: "none",
                        cursor:
                          loading ||
                          (useKeywords && editableKeywords.length === 0)
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          loading ||
                          (useKeywords && editableKeywords.length === 0)
                            ? 0.5
                            : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          Scanning…
                        </>
                      ) : (
                        "Launch Scan"
                      )}
                    </button>

                    {loading && (
                      <div
                        style={{
                          padding: "0.625rem 0.875rem",
                          borderRadius: "0.625rem",
                          backgroundColor: "rgba(68,121,218,0.08)",
                          border: "1px solid rgba(68,121,218,0.25)",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "#4479DA",
                          }}
                        >
                          You can go back to the client page and track scan
                          progress from there.
                        </p>
                      </div>
                    )}

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        textAlign: "center",
                      }}
                    >
                      By launching the scan, you agree to our Terms of Use and
                      Privacy Policy.
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {pipeline}
        </form>
      </div>
    </>
  );
}
