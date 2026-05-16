"use client";

import type {
  CSSProperties,
  ComponentType,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import { useState } from "react";
import type { KeywordFocus, PreAnalysisProfile } from "./types";

interface CountryPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

interface KeywordsEditorProps {
  keywords: string[];
  setKeywords: Dispatch<SetStateAction<string[]>>;
  readOnly?: boolean;
}

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
  description: string;
  keywordsCap: number;
  setKeywordsCap: (value: number) => void;
  keywordFocus: KeywordFocus;
  handleDescriptionChange: (value: string) => void;
  handleFocusChange: (value: KeywordFocus) => void;
  handleResearch: () => void;
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
  CountryPicker: ComponentType<CountryPickerProps>;
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
  useKeywords: boolean;
  setUseKeywords: (value: boolean) => void;
  scanFocus: KeywordFocus;
  setScanFocus: (value: KeywordFocus) => void;
  pipeline: ReactNode;
}

function CountryMultiPicker({
  countries,
  setCountries,
  CountryPicker,
  labelStyle,
}: {
  countries: string[];
  setCountries: (v: string[]) => void;
  CountryPicker: ComponentType<{ value: string; onChange: (v: string) => void; required?: boolean }>;
  labelStyle: CSSProperties;
}) {
  const [pickerValue, setPickerValue] = useState("");

  const addCountry = (v: string) => {
    if (!v || countries.includes(v)) return;
    setCountries([...countries, v]);
    setPickerValue("");
  };

  const removeCountry = (v: string) => setCountries(countries.filter((c) => c !== v));

  return (
    <div>
      <label style={labelStyle}>Country *</label>
      <CountryPicker
        value={pickerValue}
        onChange={(v) => { setPickerValue(v); addCountry(v); }}
      />
      {countries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
          {countries.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                backgroundColor: "#4479DA",
                color: "#fff",
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              {c}
              <button
                type="button"
                onClick={() => removeCountry(c)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label={`Remove ${c}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {countries.length === 0 && (
        <input
          aria-hidden="true"
          value=""
          onChange={() => {}}
          required
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
      )}
    </div>
  );
}

export function EaluminateFormPanel(props: EaluminateFormPanelProps) {
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
    CountryPicker,
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
    useKeywords,
    setUseKeywords,
    scanFocus,
    setScanFocus,
    pipeline,
  } = props;

  return (
    <div
      style={{
        borderRadius: "0.875rem",
        border: "1px solid #d1d9e0",
        backgroundColor: "#ffffff",
        padding: "clamp(1.25rem, 4vw, 2rem)",
        marginBottom: "2rem",
      }}
    >
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <h1
          style={{
            margin: "0 0 0.375rem",
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
          }}
        >
          EALUMINATE
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "0.9375rem",
            color: "var(--color-muted, #64748b)",
          }}
        >
          Enter the prospect&apos;s details to generate a reputation report.
        </p>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: scanComplete
              ? "#4CAF50"
              : preAnalysisDone
                ? "#48D4B8"
                : "#f59e0b",
          }}
        />
      </div>

      <form
        className="eal-card-body"
        onSubmit={(e) => {
          e.preventDefault();
          handleResearch();
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
          <div>
            <label style={labelStyle}>Subject Type</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["individual", "company"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSubjectType(type)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: "1.5px solid",
                    borderColor: subjectType === type ? "#4479DA" : "var(--color-border, #e2e8f0)",
                    backgroundColor: subjectType === type ? "#eef3ff" : "#ffffff",
                    color: subjectType === type ? "#4479DA" : "var(--color-muted, #64748b)",
                    textTransform: "capitalize",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {subjectType === "individual" && (
            <div className="lead-name-grid">
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
                  placeholder="e.g. Smith"
                  required
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>
              Company{subjectType === "individual" ? " (optional)" : " *"}
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={subjectType === "company" ? "e.g. Acme Corp" : "e.g. Acme Corp (optional)"}
              required={subjectType === "company"}
              style={inputStyle}
            />
          </div>

          <CountryMultiPicker
            countries={countries}
            setCountries={setCountries}
            CountryPicker={CountryPicker}
            labelStyle={labelStyle}
          />

          <div>
            <label style={labelStyle}>Background &amp; Context *</label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Describe the subject's background, industry, role, known controversies, associations, or any context that may be relevant to the scan…"
              rows={4}
              required
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
                minHeight: "6rem",
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Number of Keywords</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {keywordsCapOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setKeywordsCap(n)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: "1.5px solid",
                    borderColor:
                      keywordsCap === n
                        ? "#4479DA"
                        : "var(--color-border, #e2e8f0)",
                    backgroundColor: keywordsCap === n ? "#eef3ff" : "#ffffff",
                    color:
                      keywordsCap === n
                        ? "#4479DA"
                        : "var(--color-muted, #64748b)",
                  }}
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
              Number of keywords EALUMINATE generates from the description
            </p>
          </div>

          <div>
            <label style={labelStyle}>Keyword Focus</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {keywordFocusOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleFocusChange(value)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: "1.5px solid",
                    borderColor:
                      keywordFocus === value
                        ? "#4479DA"
                        : "var(--color-border, #e2e8f0)",
                    backgroundColor:
                      keywordFocus === value ? "#eef3ff" : "#ffffff",
                    color:
                      keywordFocus === value
                        ? "#4479DA"
                        : "var(--color-muted, #64748b)",
                  }}
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
              Focus applied to AI keyword generation
            </p>
          </div>

          <div>
            <label style={labelStyle}>Report Language</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {reportLanguageOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReportLanguage(opt.value)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: "1.5px solid",
                    borderColor: reportLanguage === opt.value ? "#4479DA" : "var(--color-border, #e2e8f0)",
                    backgroundColor: reportLanguage === opt.value ? "#eef3ff" : "#ffffff",
                    color: reportLanguage === opt.value ? "#4479DA" : "var(--color-muted, #64748b)",
                  }}
                >
                  {opt.label}
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
              Language used for all AI-generated report text
            </p>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#ef4444" }}>
              {error}
            </p>
          )}

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
            ) : preAnalysisDone ? (
              "Re-Research"
            ) : (
              "Research"
            )}
          </button>

          {preAnalysisDone && (
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
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.625rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--color-foreground, #1e293b)",
                  }}
                >
                  Research Summary
                </p>
                <button
                  type="button"
                  onClick={onExportReportMaster}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.4rem",
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
              {preAnalysisProfile ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {(
                    [
                      ["Identity", preAnalysisProfile.identity],
                      ["Background", preAnalysisProfile.background],
                      preAnalysisProfile.associations ? ["Associations", preAnalysisProfile.associations] : null,
                      preAnalysisProfile.recent_news ? ["Recent News", preAnalysisProfile.recent_news] : null,
                      ["Negative Findings", preAnalysisProfile.negative_findings],
                      ["Positive Presence", preAnalysisProfile.positive_presence],
                      ["Reputation Notes", preAnalysisProfile.reputation_notes],
                    ].filter(Boolean) as [string, string][]
                  ).map(([label, text]) => (
                    <div key={label}>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          margin: "0 0 0.125rem",
                          color: "var(--color-foreground, #1e293b)",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--color-muted, #64748b)",
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-muted, #64748b)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {preAnalysisSummary}
                </p>
              )}
            </div>
          )}

          {keywordsReady && (
            <>
              <div>
                <label style={labelStyle}>Use Keywords</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {([
                    { value: true,  label: "Yes" },
                    { value: false, label: "No"  },
                  ] as const).map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setUseKeywords(opt.value)}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "999px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: "1.5px solid",
                        borderColor: useKeywords === opt.value ? "#4479DA" : "var(--color-border, #e2e8f0)",
                        backgroundColor: useKeywords === opt.value ? "#eef3ff" : "#ffffff",
                        color: useKeywords === opt.value ? "#4479DA" : "var(--color-muted, #64748b)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  {useKeywords
                    ? "Searches using keyword-based queries"
                    : "Searches by name/company only — no keywords"}
                </p>
              </div>
              <div>
                <label style={labelStyle}>Scan Focus</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {keywordFocusOptions.filter(({ value }) => value !== "neutral").map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScanFocus(value)}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "999px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: "1.5px solid",
                        borderColor: scanFocus === value ? "#4479DA" : "var(--color-border, #e2e8f0)",
                        backgroundColor: scanFocus === value ? "#eef3ff" : "#ffffff",
                        color: scanFocus === value ? "#4479DA" : "var(--color-muted, #64748b)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  Filter scan results by sentiment type
                </p>
              </div>
              <div style={{ opacity: useKeywords ? 1 : 0.4, pointerEvents: useKeywords ? "auto" : "none", transition: "opacity 0.15s" }}>
                <label style={labelStyle}>
                  Keywords — edit or add your own
                </label>
                <KeywordsEditor
                  keywords={editableKeywords}
                  setKeywords={setEditableKeywords}
                />
              </div>
              <div>
                <label style={labelStyle}>Pages per Keyword</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {pagesCapOptions.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setPagesCap(page)}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "999px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: "1.5px solid",
                        borderColor:
                          pagesCap === page
                            ? "#4479DA"
                            : "var(--color-border, #e2e8f0)",
                        backgroundColor:
                          pagesCap === page ? "#eef3ff" : "#ffffff",
                        color:
                          pagesCap === page
                            ? "#4479DA"
                            : "var(--color-muted, #64748b)",
                      }}
                    >
                      {page}
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
                  Results fetched and analysed per keyword
                </p>
              </div>
              <button
                type="button"
                disabled={loading || (useKeywords && editableKeywords.length === 0)}
                onClick={handleRunScan}
                className="glow-button"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontWeight: 700,
                  borderRadius: "999px",
                  opacity: loading || (useKeywords && editableKeywords.length === 0) ? 0.5 : 1,
                  cursor: "pointer",
                }}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Scanning…
                  </>
                ) : (
                  "Run Scan"
                )}
              </button>
            </>
          )}
        </div>
        {pipeline}
      </form>
    </div>
  );
}
