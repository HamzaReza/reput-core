"use client";

import { clientsApi, getToken, leads, WebLink } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import countryList from "react-select-country-list";
import { EaluminateFormPanel } from "./_components/EaluminateFormPanel";
import { EaluminatePipelinePanel } from "./_components/EaluminatePipelinePanel";
import { EaluminateResultsPanel } from "./_components/EaluminateResultsPanel";
import { ScanLogPanel } from "./_components/ScanLogPanel";
import ExportFieldsModal from "./_components/ExportFieldsModal";
import type {
  KeywordFocus,
  MeetingSummary,
  PreAnalysisProfile,
  RiskLevel,
  ScanTier,
  ScanLog,
  ScanResult,
} from "./_components/types";
import { exportReportMasterPdf, exportSummaryPdf } from "./_utils/pdfExports";

const RESEARCH_SUMMARY_FIELDS = [
  { key: "identity", label: "Identity", color: "#4479DA" },
  { key: "background", label: "Background", color: "#6366f1" },
  { key: "associations", label: "Associations", color: "#f59e0b" },
  { key: "recent_news", label: "Recent News", color: "#48D4B8" },
  { key: "negative_findings", label: "Negative Findings", color: "#ef4444" },
  { key: "positive_presence", label: "Positive Presence", color: "#4CAF50" },
  {
    key: "estimated_negative_links",
    label: "Estimated Negative Links",
    color: "#FF6B4A",
  },
  { key: "reputation_notes", label: "Reputation Notes", color: "#94a3b8" },
];

const BRIEF_FIELDS = [
  { key: "key_points", label: "Key Points", color: "#4479DA" },
  { key: "meeting_angles", label: "Meeting Angles", color: "#6366f1" },
  { key: "risk_indicators", label: "Risk Indicators", color: "#ef4444" },
  { key: "objection_handlers", label: "Objection Handlers", color: "#48D4B8" },
];

type MockLoadingOptions = {
  msPerStage?: number;
  finishWithMock?: boolean;
};

declare global {
  interface Window {
    __EALU_DEBUG__?: {
      setLoading: (value: boolean) => void;
      setResult: (value: ScanResult | null) => void;
      setScore: (value: number) => void;
      setScanComplete: (value: boolean) => void;
      setKeywordsReady: (value: boolean) => void;
      setPreAnalysisDone: (value: boolean) => void;
      setPreAnalysisSummary: (value: string) => void;
      setEditableKeywords: (value: string[]) => void;
      setError: (value: string) => void;
      setCurrentStep: (value: string | null) => void;
      setPreAnalysisLoading: (value: boolean) => void;
      loadingSteps: readonly string[];
      seedMockScan: () => void;
      mockLoadingStage: (step: string) => void;
      mockLoadingStages: (opts?: MockLoadingOptions) => void;
      mockPipelineLoading: (opts?: MockLoadingOptions) => void;
      stopMockLoading: () => void;
      resetUi: () => void;
    };
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGES_CAP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50];
const JOB_STORAGE_KEY = "ealuminate_job_id";
const KEYWORDS_CAP_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const SCAN_TIER_VALUES: readonly ScanTier[] = [
  "basic",
  "standard",
  "advanced",
];

const KEYWORD_FOCUS_OPTIONS = [
  { value: "all", label: "All Coverage" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
  { value: "positive", label: "Positive" },
] as const;

const KEYWORD_LENGTH_OPTIONS = [
  { value: null, label: "Any" },
  { value: 1, label: "1 word" },
  { value: 2, label: "2 words" },
  { value: 3, label: "3 words" },
] as const;
type KeywordLength = null | 1 | 2 | 3;

const REPORT_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "it", label: "Italian" },
  { value: "es", label: "Spanish" },
] as const;
type ReportLanguage = (typeof REPORT_LANGUAGE_OPTIONS)[number]["value"];

// Languages selectable for keyword generation — mirrors repute-api LANGUAGE_CODE_TO_NAME
// (derived from the scan pipeline's country→language coverage in generate_lead.py).
// Sorted alphabetically by label.
const KEYWORD_LANGUAGE_OPTIONS = [
  { value: "af", label: "Afrikaans" },
  { value: "sq", label: "Albanian" },
  { value: "am", label: "Amharic" },
  { value: "ar", label: "Arabic" },
  { value: "hy", label: "Armenian" },
  { value: "az", label: "Azerbaijani" },
  { value: "be", label: "Belarusian" },
  { value: "bn", label: "Bengali" },
  { value: "bs", label: "Bosnian" },
  { value: "bg", label: "Bulgarian" },
  { value: "my", label: "Burmese" },
  { value: "ca", label: "Catalan" },
  { value: "ny", label: "Chichewa" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "hr", label: "Croatian" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "dv", label: "Dhivehi" },
  { value: "nl", label: "Dutch" },
  { value: "dz", label: "Dzongkha" },
  { value: "en", label: "English" },
  { value: "et", label: "Estonian" },
  { value: "tl", label: "Filipino" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "ka", label: "Georgian" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "ht", label: "Haitian Creole" },
  { value: "he", label: "Hebrew" },
  { value: "hi", label: "Hindi" },
  { value: "hu", label: "Hungarian" },
  { value: "is", label: "Icelandic" },
  { value: "id", label: "Indonesian" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "kk", label: "Kazakh" },
  { value: "km", label: "Khmer" },
  { value: "rw", label: "Kinyarwanda" },
  { value: "ko", label: "Korean" },
  { value: "ky", label: "Kyrgyz" },
  { value: "lo", label: "Lao" },
  { value: "lv", label: "Latvian" },
  { value: "lt", label: "Lithuanian" },
  { value: "mk", label: "Macedonian" },
  { value: "mg", label: "Malagasy" },
  { value: "ms", label: "Malay" },
  { value: "mt", label: "Maltese" },
  { value: "mn", label: "Mongolian" },
  { value: "ne", label: "Nepali" },
  { value: "no", label: "Norwegian" },
  { value: "ps", label: "Pashto" },
  { value: "fa", label: "Persian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ro", label: "Romanian" },
  { value: "ru", label: "Russian" },
  { value: "sm", label: "Samoan" },
  { value: "sr", label: "Serbian" },
  { value: "st", label: "Sesotho" },
  { value: "si", label: "Sinhala" },
  { value: "sk", label: "Slovak" },
  { value: "sl", label: "Slovenian" },
  { value: "so", label: "Somali" },
  { value: "es", label: "Spanish" },
  { value: "sw", label: "Swahili" },
  { value: "sv", label: "Swedish" },
  { value: "tg", label: "Tajik" },
  { value: "th", label: "Thai" },
  { value: "ti", label: "Tigrinya" },
  { value: "to", label: "Tongan" },
  { value: "tr", label: "Turkish" },
  { value: "tk", label: "Turkmen" },
  { value: "uk", label: "Ukrainian" },
  { value: "ur", label: "Urdu" },
  { value: "uz", label: "Uzbek" },
  { value: "vi", label: "Vietnamese" },
] as const;

// Country options for the multi-select picker — values are country names,
// matching what the API expects in `countries`.
const COUNTRY_OPTIONS = (() => {
  const base = countryList().getData() as { value: string; label: string }[];
  const hasKosovo = base.some(
    (item) =>
      item.value.toUpperCase() === "XK" ||
      item.label.toLowerCase() === "kosovo",
  );
  const all = hasKosovo ? base : [...base, { value: "XK", label: "Kosovo" }];
  return all
    .map((item) => ({ value: item.label, label: item.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "Profile research",
    desc: "Identity, employment, and context discovery.",
  },
  {
    n: "02",
    title: "Keyword preparation",
    desc: "Build a relevant set of keywords and filters.",
  },
  {
    n: "03",
    title: "Scan and classification",
    desc: "Sources scanned and signals are categorized.",
  },
  {
    n: "04",
    title: "Brief ready",
    desc: "Findings summarized into an executive-ready report.",
  },
] as const;

const SCAN_LOADING_STEPS = [
  "building_queries",
  "serper_search",
  "firecrawl_scrape",
  "llm_classification",
  "generating_brief",
] as const;

const RISK_COLORS: Record<
  RiskLevel,
  { bg: string; color: string; border: string }
> = {
  Negative: {
    bg: "rgba(255,61,0,0.12)",
    color: "#FF6B4A",
    border: "rgba(255,61,0,0.3)",
  },
  Poor: {
    bg: "rgba(255,140,0,0.1)",
    color: "#FF8C00",
    border: "rgba(255,140,0,0.3)",
  },
  Mediocre: {
    bg: "rgba(255,214,0,0.1)",
    color: "#FFD600",
    border: "rgba(255,214,0,0.3)",
  },
  Good: {
    bg: "rgba(76,175,80,0.1)",
    color: "#4CAF50",
    border: "rgba(76,175,80,0.3)",
  },
};

const STATUS_MESSAGES = [
  "Gathering intelligence on this prospect…",
  "Scanning public records and web presence…",
  "Assessing reputation signals across sources…",
  "Compiling the prospect report for your review…",
];

function isScanTier(value: unknown): value is ScanTier {
  return (
    typeof value === "string" &&
    SCAN_TIER_VALUES.includes(value as ScanTier)
  );
}

const DID_YOU_KNOW = [
  "Ealuminate is mapping public signals across the digital landscape.",
  "Ealuminate is connecting sources, entities, and reputation patterns.",
  "Ealuminate is processing online signals to identify relevant insights.",
  "Ealuminate is scanning the open web for reputation intelligence.",
  "Ealuminate is building a real-time view of the digital footprint.",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function apiRiskToUi(risk: string): RiskLevel {
  if (risk === "high") return "Negative";
  if (risk === "medium") return "Poor";
  if (risk === "low") return "Mediocre";
  return "Good";
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 86) return { label: "Good", color: "#4CAF50" };
  if (score >= 61) return { label: "Mediocre", color: "#FFD600" };
  if (score >= 26) return { label: "Poor", color: "#FF8C00" };
  return { label: "Negative", color: "#FF6B4A" };
}

function deriveScore(negCount: number, posCount: number): number {
  if (negCount === 0) {
    if (posCount >= 10) return 100;
    return 86 + Math.round((posCount / 9) * 13);
  }
  if (negCount <= 5) {
    const base = 85 - (negCount - 1) * 4;
    const posBonus = Math.min(posCount, 10);
    return Math.min(85, Math.max(61, base + Math.round((posBonus / 10) * 5)));
  }
  if (negCount <= 10) {
    const base = 60 - (negCount - 6) * 7;
    const posBonus = Math.min(posCount, 10);
    return Math.min(60, Math.max(26, base + Math.round((posBonus / 10) * 5)));
  }
  return Math.max(0, 25 - (negCount - 11) * 2);
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.875rem",
  border: "1px solid #d1d9e0",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: "0.5rem",
};

// ── RepuGauge ──────────────────────────────────────────────────────────────────
function RepuGauge({ score }: { score: number }) {
  const cx = 140,
    cy = 140,
    r = 112,
    arcStroke = 22,
    avatarR = 50;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy - r * Math.sin(toRad(deg)),
  });

  const bandAngles = [210, 148, 65, 6, -30];
  const bandColors = ["#FF3D00", "#FF8C00", "#FFD600", "#4CAF50"];
  const blendPairs: [string, string, number][] = [
    ["#FF3D00", "#FF8C00", 148],
    ["#FF8C00", "#FFD600", 65],
    ["#FFD600", "#4CAF50", 6],
  ];
  const blendSpan = 9;

  const arcPath = (startDeg: number, endDeg: number) => {
    const s = pt(startDeg),
      e = pt(endDeg);
    const span = startDeg - endDeg;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const finalAngle = 210 - (score / 100) * 240;
  const svgStartRot = -210;
  const svgFinalRot = -finalAngle;
  const needleLen = r - arcStroke / 2 - 4;
  const hw = 16;
  const pad = arcStroke / 2 + 10;
  const vb = `${cx - r - pad} ${cy - r - pad} ${(r + pad) * 2} ${(r + pad) * 2}`;

  return (
    <svg
      viewBox={vb}
      width="100%"
      style={{ maxWidth: "21rem", display: "block", margin: "0 auto" }}
    >
      <defs>
        <clipPath id="leadAvatarClip">
          <circle cx={cx} cy={cy} r={avatarR} />
        </clipPath>
        {blendPairs.map(([c1, c2, angle], i) => {
          const s = pt(angle + blendSpan),
            e = pt(angle - blendSpan);
          return (
            <linearGradient
              key={i}
              id={`leadBlend${i}`}
              gradientUnits="userSpaceOnUse"
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
            >
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
          );
        })}
        <style>{`
          @keyframes lead-needle {
            from { transform: rotate(${svgStartRot}deg); }
            to   { transform: rotate(${svgFinalRot}deg); }
          }
          .lead-needle-g {
            transform-origin: ${cx}px ${cy}px;
            transform: rotate(${svgStartRot}deg);
            animation: lead-needle ${(0.6 + (score / 100) * 2.4).toFixed(2)}s cubic-bezier(0.25,0.1,0.25,1) forwards;
            animation-delay: 0.3s;
          }
        `}</style>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(148,163,184,0.25)"
        strokeWidth={arcStroke}
      />
      {bandColors.map((color, i) => (
        <path
          key={i}
          d={arcPath(bandAngles[i], bandAngles[i + 1])}
          fill="none"
          stroke={color}
          strokeWidth={arcStroke}
          strokeLinecap="butt"
        />
      ))}
      {blendPairs.map(([, , angle], i) => (
        <path
          key={i}
          d={arcPath(angle + blendSpan, angle - blendSpan)}
          fill="none"
          stroke={`url(#leadBlend${i})`}
          strokeWidth={arcStroke}
          strokeLinecap="butt"
        />
      ))}
      <circle cx={pt(210).x} cy={pt(210).y} r={arcStroke / 2} fill="#FF3D00" />
      <circle cx={pt(-30).x} cy={pt(-30).y} r={arcStroke / 2} fill="#4CAF50" />
      <circle cx={cx} cy={cy} r={avatarR + 4} fill="#ffffff" />
      <circle cx={cx} cy={cy} r={avatarR} fill="rgba(150,175,210,0.1)" />
      <circle
        cx={cx}
        cy={cy - avatarR * 0.25}
        r={avatarR * 0.29}
        fill="rgba(150,175,210,0.38)"
      />
      <ellipse
        cx={cx}
        cy={cy + avatarR * 0.58}
        rx={avatarR * 0.52}
        ry={avatarR * 0.37}
        fill="rgba(150,175,210,0.38)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={avatarR}
        fill="none"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth={2}
      />
      <g className="lead-needle-g">
        <path
          d={`M ${cx + needleLen} ${cy} L ${cx + avatarR + 2} ${cy + hw} A ${hw} ${hw} 0 0 1 ${cx + avatarR + 2} ${cy - hw} Z`}
          fill="#48D4B8"
        />
      </g>
    </svg>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{
        animation: "reput-spin 0.75s linear infinite",
        display: "inline-block",
        verticalAlign: "middle",
        marginRight: "0.5rem",
      }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── KeywordsEditor ─────────────────────────────────────────────────────────────
function KeywordsEditor({
  keywords,
  setKeywords,
  readOnly,
}: {
  keywords: string[];
  setKeywords: (kws: string[]) => void;
  readOnly?: boolean;
}) {
  const [input, setInput] = useState("");

  const add = (val: string) => {
    if (readOnly) return;
    const trimmed = val.replace(/,/g, "").trim();
    if (trimmed && !keywords.includes(trimmed))
      setKeywords([...keywords, trimmed]);
    setInput("");
  };
  // Pasted lists: split on commas/newlines, trim each, drop empties and dupes
  const addMany = (vals: string[]) => {
    if (readOnly) return;
    const next = [...keywords];
    for (const v of vals) {
      const trimmed = v.trim();
      if (trimmed && !next.includes(trimmed)) next.push(trimmed);
    }
    setKeywords(next);
    setInput("");
  };
  const remove = (kw: string) => setKeywords(keywords.filter((k) => k !== kw));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.5rem",
        borderRadius: "0.875rem",
        border: "1px solid var(--color-border, #e2e8f0)",
        backgroundColor: readOnly ? "#f8fafc" : "#ffffff",
        minHeight: "3rem",
        alignItems: "center",
        cursor: readOnly ? "default" : "text",
      }}
      onClick={() =>
        !readOnly &&
        (
          document.getElementById("lead-kw-input") as HTMLInputElement | null
        )?.focus()
      }
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            backgroundColor: readOnly ? "#94a3b8" : "#4479DA",
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {kw}
          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(kw);
              }}
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
              aria-label={`Remove ${kw}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          id="lead-kw-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === "," || e.key === "Tab") &&
              input.trim()
            ) {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && keywords.length)
              setKeywords(keywords.slice(0, -1));
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/[,\n]/.test(text)) return; // single keyword — default paste
            e.preventDefault();
            addMany(`${input} ${text}`.split(/[,\n]/));
          }}
          onBlur={() => {
            if (input.trim()) add(input);
          }}
          placeholder={
            keywords.length === 0 ? "Type a keyword and press Enter…" : ""
          }
          style={{
            flex: 1,
            minWidth: "10rem",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "0.9375rem",
            color: "#1e293b",
            padding: "0.25rem 0.5rem",
          }}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function EaluminatePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subjectType, setSubjectType] = useState<"individual" | "company">(
    "individual",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [pagesCap, setPagesCap] = useState(2);
  const [keywordsCap, setKeywordsCap] = useState(5);
  const [keywordFocus, setKeywordFocus] = useState<KeywordFocus>("all");
  const [keywordLength, setKeywordLength] = useState<KeywordLength>(null);
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>("en");
  const [keywordLanguages, setKeywordLanguages] = useState<string[]>([]);
  const [useKeywords, setUseKeywords] = useState(true);
  const [scanFocus, setScanFocus] = useState<KeywordFocus>("all");
  const [scanTier, setScanTier] = useState<ScanTier>("standard");

  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [keywordsReady, setKeywordsReady] = useState(false);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);

  const [scanComplete, setScanComplete] = useState(false);

  const [webAnalystName, setWebAnalystName] = useState("");
  const [webAnalystEmail, setWebAnalystEmail] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const [preAnalysisLoading, setPreAnalysisLoading] = useState(false);
  const [preAnalysisDone, setPreAnalysisDone] = useState(false);
  const [preAnalysisSummary, setPreAnalysisSummary] = useState("");
  const [preAnalysisProfile, setPreAnalysisProfile] =
    useState<PreAnalysisProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [scanDuration, setScanDuration] = useState<number | null>(null);
  const scanStartRef = useRef<number | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultsTab, setResultsTab] = useState<"results" | "scanlog">("results");
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const [expandedLinkIndex, setExpandedLinkIndex] = useState<string | null>(
    null,
  );

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isResuming, setIsResuming] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const persistContextRef = useRef({
    leadId,
    clientId,
    fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    company,
    country: countries[0] ?? "",
    description,
    preAnalysisSummary,
    editableKeywords,
    useKeywords,
    scanFocus,
    scanTier,
    countries,
    keywordsCap,
    pagesCap,
  });

  const stopCycles = () => {
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    if (statusSwapRef.current) clearTimeout(statusSwapRef.current);
    if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    if (tipSwapRef.current) clearTimeout(tipSwapRef.current);
  };

  const startCycles = () => {
    setStatusIdx(0);
    setStatusVisible(true);
    setTipIdx(0);
    setTipVisible(true);

    statusIntervalRef.current = setInterval(() => {
      setStatusVisible(false);
      statusSwapRef.current = setTimeout(() => {
        setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
        requestAnimationFrame(() => setStatusVisible(true));
      }, 500);
    }, 3000);

    tipIntervalRef.current = setInterval(() => {
      setTipVisible(false);
      tipSwapRef.current = setTimeout(() => {
        setTipIdx((i) => (i + 1) % DID_YOU_KNOW.length);
        requestAnimationFrame(() => setTipVisible(true));
      }, 500);
    }, 5000);
  };

  const scanApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const startPolling = (job_id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let consecutiveFailures = 0;
    const MAX_FAILURES = 5;

    const checkJob = async () => {
      try {
        const poll = await fetch(`${scanApiUrl}/generate-lead/${job_id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (poll.status === 401) {
          clearInterval(pollIntervalRef.current!);
          localStorage.removeItem(JOB_STORAGE_KEY);
          router.replace("/login?reason=session_expired");
          return;
        }
        const pollData = await poll.json();
        consecutiveFailures = 0;

        if (pollData.current_step) {
          setCurrentStep(pollData.current_step);
        }

        if (pollData.status === "done") {
          clearInterval(pollIntervalRef.current!);
          localStorage.removeItem(JOB_STORAGE_KEY);
          stopCycles();
          setCurrentStep(null);

          const scanResult = pollData.result as ScanResult;
          const finalScore =
            typeof pollData.result?.score === "number"
              ? pollData.result.score
              : deriveScore(
                  scanResult.links.filter(
                    (l) =>
                      l.sentiment === "negative" ||
                      l.risk === "high" ||
                      l.risk === "medium",
                  ).length,
                  scanResult.links.filter(
                    (l) =>
                      l.sentiment === "positive" ||
                      l.sentiment === "neutral" ||
                      l.risk === "low" ||
                      l.risk === "none",
                  ).length,
                );
          setScore(finalScore);
          setResult(scanResult);
          setResultsTab("results");
          setScanComplete(true);
          setIsResuming(false);
          if (scanStartRef.current !== null) {
            setScanDuration(
              Math.round((Date.now() - scanStartRef.current) / 1000),
            );
            scanStartRef.current = null;
          }
          setLoading(false);

          // Post-scan persistence — read from ref so values are always fresh (not stale closures)
          const ctx = persistContextRef.current;
          let currentLeadId: string | null = ctx.leadId;
          if (!currentLeadId) {
            try {
              const ld = await leads.create({
                name: ctx.fullName || undefined,
                company: ctx.company.trim() || undefined,
                country: ctx.country,
                background: ctx.description.trim(),
                pre_analysis_summary: ctx.preAnalysisSummary || undefined,
                keywords_suggested: ctx.editableKeywords,
                force_new: true,
              });
              if (ld.id) {
                currentLeadId = ld.id;
                setLeadId(ld.id);
              }
            } catch {
              /* non-fatal */
            }
          }
          if (currentLeadId) {
            try {
              await leads.update(currentLeadId, {
                links: scanResult.links as unknown[],
                summary: scanResult.summary
                  ? ({ ...scanResult.summary } as Record<string, unknown>)
                  : undefined,
                score: finalScore,
                keywords_suggested: ctx.editableKeywords,
              });
            } catch {
              /* non-fatal */
            }
          }
          if (ctx.clientId) {
            const writtenKey = `ealuminate_scan_written_${job_id}`;
            if (!localStorage.getItem(writtenKey)) {
              localStorage.setItem(writtenKey, "1");
              setTimeout(() => localStorage.removeItem(writtenKey), 30000);
              try {
                await clientsApi.addEvent(ctx.clientId, {
                  event_type: "scan",
                  event_data: {
                    score: finalScore,
                    summary: scanResult.summary ?? null,
                    links_count: scanResult.links.length,
                    negative_count: scanResult.negative.length,
                    keywords: ctx.editableKeywords,
                    lead_id: currentLeadId ?? undefined,
                    job_id,
                    links: scanResult.links,
                    useKeywords: ctx.useKeywords,
                    scanFocus:
                      ctx.scanFocus !== "all" ? ctx.scanFocus : undefined,
                    countries: ctx.countries,
                    keywordsCap: ctx.keywordsCap,
                    pagesCap: ctx.pagesCap,
                    scanTier: ctx.scanTier,
                  },
                });
              } catch {
                /* non-fatal */
              }
            }
          }
        } else if (pollData.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          localStorage.removeItem(JOB_STORAGE_KEY);
          stopCycles();
          setCurrentStep(null);
          setResult(null);
          setScanComplete(false);
          setScore(0);
          setError(pollData.error ?? "Scan failed. Please try again.");
          setIsResuming(false);
          setLoading(false);
        }
        // "pending" | "running" → keep polling
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures < MAX_FAILURES) return;
        clearInterval(pollIntervalRef.current!);
        localStorage.removeItem(JOB_STORAGE_KEY);
        stopCycles();
        setCurrentStep(null);
        setError("Network error while polling.");
        setIsResuming(false);
        setLoading(false);
      }
    };

    checkJob(); // immediate first check — no delay on resume
    pollIntervalRef.current = setInterval(checkJob, 5000);
  };

  // Keep persistContextRef in sync with latest state so checkJob always reads fresh values
  useEffect(() => {
    persistContextRef.current = {
      leadId,
      clientId,
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      company,
      country: countries[0] ?? "",
      description,
      preAnalysisSummary,
      editableKeywords,
      useKeywords,
      scanFocus,
      scanTier,
      countries,
      keywordsCap,
      pagesCap,
    };
  }, [
    leadId,
    clientId,
    firstName,
    lastName,
    company,
    countries,
    description,
    preAnalysisSummary,
    editableKeywords,
    useKeywords,
    scanFocus,
    scanTier,
    keywordsCap,
    pagesCap,
  ]);

  // Resume an in-progress job if one was saved before navigating away
  useEffect(() => {
    const cleanup = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
    const raw = localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) return cleanup;

    let stored: {
      job_id: string;
      leadId: string | null;
      clientId?: string | null;
      useKeywords?: boolean;
      pagesCap?: number;
      scanFocus?: string;
      scanTier?: ScanTier;
      keywords?: string[];
      keywordsReady?: boolean;
      preAnalysisDone?: boolean;
    } | null = null;
    try {
      stored = JSON.parse(raw);
    } catch {
      localStorage.removeItem(JOB_STORAGE_KEY);
      return cleanup;
    }
    if (!stored) return cleanup;

    const eventParam = new URLSearchParams(window.location.search).get("event");
    if (eventParam) return cleanup;

    const currentLeadParam = new URLSearchParams(window.location.search).get(
      "lead",
    );
    if (stored.leadId !== currentLeadParam) {
      localStorage.removeItem(JOB_STORAGE_KEY); // stale job from a different client
      return cleanup;
    }

    if (stored.useKeywords !== undefined) setUseKeywords(stored.useKeywords);
    if (stored.pagesCap !== undefined) setPagesCap(stored.pagesCap);
    if (stored.scanFocus !== undefined)
      setScanFocus(stored.scanFocus as KeywordFocus);
    if (stored.scanTier !== undefined) setScanTier(stored.scanTier);
    if (stored.keywords?.length) setEditableKeywords(stored.keywords);
    if (stored.keywordsReady) setKeywordsReady(true);
    if (stored.preAnalysisDone) setPreAnalysisDone(true);

    setIsResuming(true);
    setLoading(true);
    startCycles();
    setJobId(stored.job_id);
    startPolling(stored.job_id);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const stopMockLoadingTimers = () => {
      if (mockLoadingTimerRef.current) {
        clearTimeout(mockLoadingTimerRef.current);
        mockLoadingTimerRef.current = null;
      }
    };

    const scheduleMockStage = (fn: () => void, ms: number) => {
      mockLoadingTimerRef.current = setTimeout(fn, ms);
    };

    const prepareScanLoadingUi = () => {
      setError("");
      setResult(null);
      setScore(0);
      setScanComplete(false);
      setPreAnalysisDone(true);
      setPreAnalysisSummary("Mock pre-analysis for UI testing.");
      setEditableKeywords(["reputation", "news coverage", "public profile"]);
      setKeywordsReady(true);
      setPreAnalysisLoading(false);
      setLoading(true);
      startCycles();
    };

    const seedMockScan = () => {
      const mockLinks: WebLink[] = [
        {
          url: "https://example.com/news/john-doe-profile",
          title: "Public profile and industry mentions",
          snippet:
            "Overview of public mentions and reputation-related context.",
          sentiment: "neutral",
          risk: "low",
          source: "Example News",
          type: "news",
        },
        {
          url: "https://example.com/blog/interview",
          title: "Interview coverage",
          snippet:
            "Interview article with generally positive coverage and quotes.",
          sentiment: "positive",
          risk: "none",
          source: "Example Blog",
          type: "blog",
        },
        {
          url: "https://example.com/forum/thread",
          title: "Forum thread discussion",
          snippet:
            "A thread containing mixed and partially critical opinions.",
          sentiment: "negative",
          risk: "medium",
          source: "Example Forum",
          type: "forum",
        },
      ];

      const negative = mockLinks.filter(
        (l) =>
          l.sentiment === "negative" ||
          l.risk === "high" ||
          l.risk === "medium",
      );
      const positive = mockLinks.filter(
        (l) =>
          l.sentiment === "positive" ||
          l.sentiment === "neutral" ||
          l.risk === "low" ||
          l.risk === "none",
      );
      const neutral = mockLinks.filter((l) => l.sentiment === "neutral");
      const seededResult: ScanResult = {
        links: mockLinks,
        negative,
        positive,
        neutral,
        summary: {
          headline: "Mixed public footprint with manageable risk indicators.",
          issues: [
            "Negative forum discussion around a prior business decision.",
          ],
          talkingPoints: [
            "Emphasize documented wins and transparent communication.",
          ],
        },
      };

      stopMockLoadingTimers();
      stopCycles();
      setLoading(false);
      setCurrentStep(null);
      setError("");
      setPreAnalysisDone(true);
      setPreAnalysisSummary(
        "Seeded dev summary for UI testing without API requests.",
      );
      setEditableKeywords(["reputation", "news coverage", "public profile"]);
      setKeywordsReady(true);
      setResult(seededResult);
      setScore(deriveScore(negative.length, positive.length));
      setScanComplete(true);
    };

    const mockLoadingStage = (step: string) => {
      stopMockLoadingTimers();
      prepareScanLoadingUi();
      setCurrentStep(step);
    };

    const mockLoadingStages = (opts?: MockLoadingOptions) => {
      const msPerStage = opts?.msPerStage ?? 2500;
      const finishWithMock = opts?.finishWithMock ?? true;

      stopMockLoadingTimers();
      prepareScanLoadingUi();

      let idx = 0;
      const advance = () => {
        if (idx >= SCAN_LOADING_STEPS.length) {
          if (finishWithMock) {
            seedMockScan();
          } else {
            stopCycles();
            setLoading(false);
            setCurrentStep(null);
          }
          return;
        }

        setCurrentStep(SCAN_LOADING_STEPS[idx]);
        idx += 1;
        scheduleMockStage(advance, msPerStage);
      };

      setCurrentStep(SCAN_LOADING_STEPS[0]);
      idx = 1;
      scheduleMockStage(advance, msPerStage);
    };

    const mockPipelineLoading = (opts?: MockLoadingOptions) => {
      const msPerStage = opts?.msPerStage ?? 2500;
      const finishWithMock = opts?.finishWithMock ?? true;

      stopMockLoadingTimers();
      stopCycles();
      setError("");
      setResult(null);
      setScore(0);
      setScanComplete(false);
      setKeywordsReady(false);
      setPreAnalysisDone(false);
      setPreAnalysisSummary("");
      setEditableKeywords([]);
      setLoading(false);
      setCurrentStep(null);
      setPreAnalysisLoading(true);

      scheduleMockStage(() => {
        setPreAnalysisLoading(false);
        setPreAnalysisDone(true);
        setPreAnalysisSummary("Mock profile research complete.");
        setEditableKeywords(["reputation", "news coverage", "public profile"]);
        setKeywordsReady(true);

        scheduleMockStage(() => {
          prepareScanLoadingUi();

          let idx = 0;
          const advanceScan = () => {
            if (idx >= SCAN_LOADING_STEPS.length) {
              if (finishWithMock) {
                seedMockScan();
              } else {
                stopCycles();
                setLoading(false);
                setCurrentStep(null);
              }
              return;
            }

            setCurrentStep(SCAN_LOADING_STEPS[idx]);
            idx += 1;
            scheduleMockStage(advanceScan, msPerStage);
          };

          setCurrentStep(SCAN_LOADING_STEPS[0]);
          idx = 1;
          scheduleMockStage(advanceScan, msPerStage);
        }, msPerStage);
      }, msPerStage);
    };

    window.__EALU_DEBUG__ = {
      setLoading,
      setResult,
      setScore,
      setScanComplete,
      setKeywordsReady,
      setPreAnalysisDone,
      setPreAnalysisSummary,
      setEditableKeywords,
      setError,
      setCurrentStep,
      setPreAnalysisLoading,
      loadingSteps: SCAN_LOADING_STEPS,
      seedMockScan,
      mockLoadingStage,
      mockLoadingStages,
      mockPipelineLoading,
      stopMockLoading: () => {
        stopMockLoadingTimers();
        stopCycles();
      },
      resetUi: () => {
        stopMockLoadingTimers();
        stopCycles();
        setLoading(false);
        setCurrentStep(null);
        setPreAnalysisLoading(false);
        setError("");
        setResult(null);
        setScore(0);
        setScanComplete(false);
        setKeywordsReady(false);
        setPreAnalysisDone(false);
        setPreAnalysisSummary("");
        setEditableKeywords([]);
      },
    };

    return () => {
      stopMockLoadingTimers();
      delete window.__EALU_DEBUG__;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setWebAnalystName(u.name || u.email || "");
        setWebAnalystEmail(u.email || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = searchParams.get("lead");
    if (!id) return;
    const eventId = searchParams.get("event");
    // Cancels the in-flight scanLog fetch if the lead/event params change,
    // so a slow response can't merge a stale log onto a different lead.
    const scanLogAbort = new AbortController();
    // Reset scan state so stale results from a previous lead don't bleed through
    setResult(null);
    setScore(0);
    setScanComplete(false);
    setPreAnalysisDone(false);
    setPreAnalysisSummary("");
    setPreAnalysisProfile(null);
    setEditableKeywords([]);
    setKeywordsReady(false);
    setLeadId(null);
    setClientId(null);
    leads
      .get(id)
      .then(async (lead) => {
        const parts = (lead.name ?? "").trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setCompany(lead.company ?? "");
        if (lead.country) setCountries([lead.country]);
        setDescription(lead.background ?? "");
        setLeadId(lead.id);

        // Resolve the corresponding client so scan events can be appended
        // and restore form settings saved in the matching research event
        let scanLinks: WebLink[] | undefined;
        let scanScore: number | undefined;
        let scanSummary: MeetingSummary | undefined;
        let scanJobId: string | undefined;
        try {
          const clients = await clientsApi.list(200);
          const inferredType = (lead.name ?? "").trim()
            ? "individual"
            : "company";
          const candidates = clients.filter((c) => {
            if ((c.subject_type ?? "individual") !== inferredType) return false;
            if (inferredType === "individual")
              return c.name === (lead.name ?? "").trim();
            return (c.company ?? "") === (lead.company ?? "").trim();
          });
          const match =
            candidates.length === 1
              ? candidates[0]
              : (candidates.find((c) =>
                  (c.countries ?? []).includes(lead.country ?? ""),
                ) ?? candidates[0]);
          console.log(
            "[ealuminate] lead.id:",
            lead.id,
            "eventId:",
            eventId,
            "match:",
            match?.id ?? null,
          );
          if (match) {
            setClientId(match.id);
            const clientDetail = await clientsApi.get(match.id);
            console.log(
              "[ealuminate] clientDetail.events count:",
              clientDetail.events.length,
            );
            console.log(
              "[ealuminate] all event ids:",
              clientDetail.events.map((e) => `${e.id} (${e.event_type})`),
            );
            const researchEvent = clientDetail.events
              .filter((e) => e.event_type === "research")
              .find((e) => (e.data?.lead_id as string | undefined) === lead.id);
            const hasActiveJob = !!localStorage.getItem(JOB_STORAGE_KEY);
            if (researchEvent?.data) {
              const d = researchEvent.data;
              if (d.subjectType === "individual" || d.subjectType === "company")
                setSubjectType(d.subjectType as "individual" | "company");
              if (typeof d.keywordsCap === "number")
                setKeywordsCap(d.keywordsCap);
              if (
                ["all", "negative", "neutral", "positive"].includes(
                  d.keywordFocus as string,
                )
              )
                setKeywordFocus(d.keywordFocus as KeywordFocus);
              if (!hasActiveJob && typeof d.pagesCap === "number")
                setPagesCap(d.pagesCap);
              if (["en", "it", "es"].includes(d.reportLanguage as string))
                setReportLanguage(d.reportLanguage as ReportLanguage);
              if (
                Array.isArray(d.countries) &&
                (d.countries as string[]).length > 0
              )
                setCountries(d.countries as string[]);
              else if (typeof d.country === "string" && d.country)
                setCountries([d.country as string]);
              if (isScanTier(d.scanTier)) setScanTier(d.scanTier);
              if (d.keywordLength === null || d.keywordLength === 1 || d.keywordLength === 2 || d.keywordLength === 3)
                setKeywordLength(d.keywordLength as KeywordLength);
              if (
                Array.isArray(d.keywordLanguages) &&
                (d.keywordLanguages as string[]).length > 0
              )
                setKeywordLanguages(d.keywordLanguages as string[]);
            }
            const scanEvents = clientDetail.events.filter(
              (e) =>
                e.event_type === "scan" &&
                (e.data?.lead_id as string | undefined) === lead.id,
            );
            console.log(
              "[ealuminate] scanEvents (lead_id filtered):",
              scanEvents.map((e) => e.id),
            );
            const scanEvent = eventId
              ? clientDetail.events.find((e) => e.id === eventId)
              : scanEvents.at(-1);
            console.log(
              "[ealuminate] resolved scanEvent id:",
              scanEvent?.id ?? null,
            );
            if (scanEvent?.data) {
              if (typeof scanEvent.data.job_id === "string")
                scanJobId = scanEvent.data.job_id;
              scanLinks = scanEvent.data.links as WebLink[] | undefined;
              scanScore = scanEvent.data.score as number | undefined;
              scanSummary = scanEvent.data.summary as
                | MeetingSummary
                | undefined;
              if (Array.isArray(scanEvent.data.keywords))
                setEditableKeywords(scanEvent.data.keywords as string[]);
            }
            if (
              !hasActiveJob &&
              typeof scanEvent?.data?.useKeywords === "boolean"
            )
              setUseKeywords(scanEvent.data.useKeywords as boolean);
            if (
              !hasActiveJob &&
              ["all", "negative", "positive", "neutral"].includes(
                scanEvent?.data?.scanFocus as string,
              )
            )
              setScanFocus(scanEvent?.data?.scanFocus as KeywordFocus);
            if (typeof scanEvent?.data?.keywordsCap === "number")
              setKeywordsCap(scanEvent.data.keywordsCap as number);
            if (!hasActiveJob && typeof scanEvent?.data?.pagesCap === "number")
              setPagesCap(scanEvent.data.pagesCap as number);
            if (isScanTier(scanEvent?.data?.scanTier))
              setScanTier(scanEvent.data.scanTier);
          }
        } catch {
          /* non-fatal */
        }

        if (lead.keywords_suggested.length > 0 || lead.pre_analysis_summary) {
          if (!eventId) setEditableKeywords(lead.keywords_suggested);
          const raw = lead.pre_analysis_summary ?? "";
          setPreAnalysisSummary(raw);
          try {
            const p = JSON.parse(raw) as PreAnalysisProfile;
            if (p?.identity) setPreAnalysisProfile(p);
          } catch {
            /* legacy plain-text summary — profile stays null */
          }
          setKeywordsReady(true);
          setPreAnalysisDone(true);
        }

        const linksToUse =
          (scanLinks && scanLinks.length > 0 ? scanLinks : null) ??
          (lead.links as WebLink[] | undefined);
        const scoreToUse = scanScore ?? lead.score ?? undefined;
        const summaryToUse = scanSummary ?? lead.summary ?? undefined;

        if (linksToUse && linksToUse.length > 0) {
          const negative = linksToUse.filter(
            (l) =>
              l.sentiment === "negative" ||
              l.risk === "high" ||
              l.risk === "medium",
          );
          const positive = linksToUse.filter(
            (l) =>
              l.sentiment === "positive" ||
              l.risk === "low" ||
              l.risk === "none",
          );
          const neutral = linksToUse.filter((l) => l.sentiment === "neutral");
          setResult({
            links: linksToUse,
            negative,
            positive,
            neutral,
            summary: summaryToUse,
          });
          setUsedKeywords(lead.keywords_suggested);

          // Re-attach the persistent scan log from the original job — the
          // event copy stores links/score only; the full log lives forever
          // on the generate_lead_jobs row.
          if (scanJobId) {
            try {
              const res = await fetch(
                `${scanApiUrl}/generate-lead/${scanJobId}`,
                {
                  headers: { Authorization: `Bearer ${getToken()}` },
                  signal: scanLogAbort.signal,
                },
              );
              if (res.ok) {
                const jd = await res.json();
                const slog = jd?.result?.scanLog as ScanLog | undefined;
                if (slog)
                  setResult((prev) =>
                    prev ? { ...prev, scanLog: slog } : prev,
                  );
              }
            } catch {
              /* non-fatal */
            }
          }
        }

        if (scoreToUse !== undefined && scoreToUse !== null) {
          setScore(scoreToUse);
          setScanComplete(true);
        }
      })
      .catch(() => {});
    return () => scanLogAbort.abort();
  }, [searchParams]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const country = countries[0] ?? "";

  const [exportSummaryModalOpen, setExportSummaryModalOpen] = useState(false);
  const [exportReportModalOpen, setExportReportModalOpen] = useState(false);

  const handleExportSummaryPdf = () => setExportSummaryModalOpen(true);
  const handleExportReportMaster = () => setExportReportModalOpen(true);

  const handleConfirmSummaryExport = (selectedFields: string[]) => {
    setExportSummaryModalOpen(false);
    exportSummaryPdf({
      fullName,
      company,
      country,
      webAnalystName,
      score,
      result,
      selectedFields,
    });
  };

  const handleConfirmReportExport = (selectedFields: string[]) => {
    setExportReportModalOpen(false);
    exportReportMasterPdf({
      fullName,
      company,
      country,
      webAnalystName,
      preAnalysisProfile,
      preAnalysisSummary,
      editableKeywords,
      selectedFields,
    });
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (keywordsReady || preAnalysisDone) {
      setKeywordsReady(false);
      setEditableKeywords([]);
      setPreAnalysisDone(false);
      setPreAnalysisSummary("");
      setLeadId(null);
    }
  };

  const handleFocusChange = (f: KeywordFocus) => {
    setKeywordFocus(f);
    if (keywordsReady || preAnalysisDone) {
      setKeywordsReady(false);
      setEditableKeywords([]);
      setPreAnalysisDone(false);
      setPreAnalysisSummary("");
      setLeadId(null);
    }
  };

  const handleSkipToScan = async () => {
    setError("");
    setResult(null);
    setScore(0);
    setPreAnalysisLoading(true);
    setPreAnalysisDone(false);
    setKeywordsReady(false);
    setEditableKeywords([]);
    setPreAnalysisSummary("");
    setPreAnalysisProfile(null);
    setLeadId(null);

    try {
      const ld = await leads.create({
        name: fullName || undefined,
        company: company.trim() || undefined,
        country,
        background: description.trim(),
        force_new: true,
      });
      if (ld.id) setLeadId(ld.id);

      const cl = await clientsApi.upsert({
        name: subjectType === "individual" ? fullName : "",
        country,
        subject_type: subjectType,
        countries: [...countries].sort(),
        company:
          subjectType === "company"
            ? company.trim()
            : company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        event_type: "research",
        event_data: {
          skipped: true,
          background: description.trim(),
          lead_id: ld.id,
          subjectType,
          keywordsCap,
          keywordFocus,
          keywordLength: keywordLength ?? undefined,
          keywordLanguages:
            keywordLanguages.length > 0 ? keywordLanguages : undefined,
          pagesCap,
          reportLanguage,
          countries,
        },
      });
      if (cl.id) setClientId(cl.id);
    } catch {
      /* non-fatal — scan can still proceed */
    }

    setKeywordsReady(true);
    setPreAnalysisDone(true);
    setPreAnalysisLoading(false);
  };

  const handleResearch = async () => {
    if (
      subjectType === "individual" &&
      (!firstName.trim() || !lastName.trim())
    ) {
      setError("First name and last name are required.");
      return;
    }
    if (subjectType === "company" && !company.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!countries.length || !description.trim()) {
      setError("At least one country and description are required.");
      return;
    }
    setError("");
    setResult(null);
    setScore(0);
    setExpandedLinkIndex(null);
    setPreAnalysisLoading(true);
    setPreAnalysisDone(false);
    setKeywordsReady(false);
    setEditableKeywords([]);
    setPreAnalysisSummary("");
    setLeadId(null);

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const canScanParams1 = new URLSearchParams({
      name: subjectType === "individual" ? fullName : "",
      company: subjectType === "company" ? company.trim() : "",
      country,
      subject_type: subjectType,
      countries: JSON.stringify([...countries].sort()),
    });
    const checkRes = await fetch(
      `${apiUrl}/clients/can-scan?${canScanParams1.toString()}`,
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    if (checkRes.status === 401) {
      router.replace("/login?reason=session_expired");
      return;
    }
    if (!checkRes.ok) {
      const checkData = await checkRes.json();
      const checkDetail = checkData.detail;
      setError(
        typeof checkDetail === "string"
          ? checkDetail
          : "Cannot scan this client.",
      );
      setPreAnalysisLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/pre-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          firstName:
            subjectType === "individual" ? firstName.trim() : undefined,
          lastName: subjectType === "individual" ? lastName.trim() : undefined,
          company: company.trim() || undefined,
          countries,
          description: description.trim(),
          keywordsCap,
          keywordFocus,
          keywordLength: keywordLength ?? undefined,
          keywordLanguages:
            keywordLanguages.length > 0 ? keywordLanguages : undefined,
          subjectType,
          reportLanguage,
          scanTier,
        }),
      });
      if (res.status === 401) {
        router.replace("/login?reason=session_expired");
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Research failed. Please try again.");
        return;
      }
      const profile = data.profile as PreAnalysisProfile | undefined;
      setPreAnalysisProfile(profile ?? null);
      setPreAnalysisSummary(profile ? JSON.stringify(profile) : "");
      setEditableKeywords(data.keywords ?? []);
      setKeywordsReady(true);
      setPreAnalysisDone(true);

      // Create lead entry in DB
      try {
        const ld = await leads.create({
          name: fullName || undefined,
          company: company.trim() || undefined,
          country,
          background: description.trim(),
          pre_analysis_summary: profile ? JSON.stringify(profile) : undefined,
          keywords_suggested: data.keywords ?? [],
          force_new: true,
        });
        if (ld.id) setLeadId(ld.id);

        const cl = await clientsApi.upsert({
          name: subjectType === "individual" ? fullName : "",
          country,
          subject_type: subjectType,
          countries: [...countries].sort(),
          company:
            subjectType === "company"
              ? company.trim()
              : company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          event_type: "research",
          event_data: {
            profile: profile ?? {},
            keywords: data.keywords ?? [],
            background: description.trim(),
            lead_id: ld.id,
            subjectType,
            keywordsCap,
            keywordFocus,
            keywordLength: keywordLength ?? undefined,
            keywordLanguages:
              keywordLanguages.length > 0 ? keywordLanguages : undefined,
            pagesCap,
            reportLanguage,
            countries,
            scanTier,
          },
        });
        if (cl.id) setClientId(cl.id);
      } catch {
        /* non-fatal */
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPreAnalysisLoading(false);
    }
  };

  const handleRunScan = async () => {
    if (useKeywords && !editableKeywords.length) {
      setError("Add at least one keyword.");
      return;
    }
    setError("");
    setResult(null);
    setScore(0);
    setScanDuration(null);
    setExpandedLinkIndex(null);
    setUsedKeywords([...editableKeywords]);
    scanStartRef.current = Date.now();
    setLoading(true);
    startCycles();

    const canScanParams2 = new URLSearchParams({
      name: subjectType === "individual" ? fullName : "",
      company: subjectType === "company" ? company.trim() : "",
      country,
      subject_type: subjectType,
      countries: JSON.stringify([...countries].sort()),
    });
    const scanCheckRes = await fetch(
      `${scanApiUrl}/clients/can-scan?${canScanParams2.toString()}`,
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    if (scanCheckRes.status === 401) {
      router.replace("/login?reason=session_expired");
      return;
    }
    if (!scanCheckRes.ok) {
      const scanCheckData = await scanCheckRes.json();
      const scanCheckDetail = scanCheckData.detail;
      setError(
        typeof scanCheckDetail === "string"
          ? scanCheckDetail
          : "Cannot scan this client.",
      );
      setLoading(false);
      return;
    }

    if (leadId) {
      try {
        await leads.update(leadId, { keywords_suggested: editableKeywords });
      } catch {
        /* non-fatal */
      }
    }

    try {
      const res = await fetch(`${scanApiUrl}/generate-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          firstName:
            subjectType === "individual" ? firstName.trim() : undefined,
          lastName: subjectType === "individual" ? lastName.trim() : undefined,
          company: company.trim() || undefined,
          countries,
          keywords: editableKeywords,
          pagesCap,
          subjectType,
          reportLanguage,
          useKeywords,
          scanFocus: scanFocus !== "all" ? scanFocus : undefined,
          scanTier,
        }),
      });
      if (res.status === 401) {
        router.replace("/login?reason=session_expired");
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Scan failed. Please try again.");
        setLoading(false);
        stopCycles();
        return;
      }
      localStorage.setItem(
        JOB_STORAGE_KEY,
        JSON.stringify({
          job_id: data.job_id,
          leadId: leadId || null,
          clientId: clientId || null,
          useKeywords,
          pagesCap,
          scanFocus: scanFocus !== "all" ? scanFocus : undefined,
          scanTier,
          keywords: editableKeywords,
          keywordsReady: true,
          preAnalysisDone: true,
        }),
      );
      setJobId(data.job_id);
      startPolling(data.job_id);
      // loading state stays active — startPolling clears it when done
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      stopCycles();
    }
  };

  const allLinks = result?.links ?? [];

  // 0=idle, 1=researching, 2=research done, 3=scan running, 4=scan complete
  const pipelineStep = result
    ? 4
    : loading
      ? 3
      : keywordsReady
        ? 2
        : preAnalysisLoading
          ? 1
          : 0;

  return (
    <div
      className="eal-page"
      style={{
        width: "100%",
        padding: "clamp(0.5rem, 1.5vw, 1rem)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes eal-dot-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.7; }
          50%      { transform: scale(1.4); opacity: 1;   }
        }
        @keyframes eal-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .lead-name-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .eal-card-body {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }
        .eal-page .glow-button {
          border-radius: 0.25rem !important;
        }
        .eal-pipeline {
          width: 18.5rem;
          flex-shrink: 0;
        }
        
        /* Mobile (max 480px) */
        @media (max-width: 480px) {
          .lead-name-grid { 
            grid-template-columns: 1fr; 
            gap: 0.75rem;
          }
          .eal-card-body { 
            flex-direction: column;
            gap: 1rem;
          }
          .eal-pipeline { 
            width: 100% !important;
            position: relative !important;
            top: auto !important;
          }
        }
        
        /* Tablet (481px - 768px) */
        @media (min-width: 481px) and (max-width: 768px) {
          .lead-name-grid { 
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .eal-card-body { 
            flex-direction: column;
            gap: 1.5rem;
          }
          .eal-pipeline { 
            width: 100% !important;
            position: relative !important;
            top: auto !important;
          }
        }
        
        /* Tablet landscape (769px - 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .eal-pipeline {
            width: 16rem;
          }
        }
        
        /* Large screens (1025px+) */
        @media (min-width: 1025px) {
          .eal-pipeline {
            width: 18.5rem;
          }
        }
      `}</style>

      <div style={{ maxWidth: "100rem", margin: "0 auto" }}>
        <EaluminateFormPanel
          scanComplete={scanComplete}
          preAnalysisDone={preAnalysisDone}
          preAnalysisLoading={preAnalysisLoading}
          error={error}
          subjectType={subjectType}
          setSubjectType={(t) => {
            setSubjectType(t);
            if (t === "company") {
              setFirstName("");
              setLastName("");
            }
            if (t === "individual") setCompany("");
          }}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          company={company}
          setCompany={setCompany}
          countries={countries}
          setCountries={setCountries}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          description={description}
          keywordsCap={keywordsCap}
          setKeywordsCap={setKeywordsCap}
          keywordFocus={keywordFocus}
          handleDescriptionChange={handleDescriptionChange}
          handleFocusChange={handleFocusChange}
          handleResearch={handleResearch}
          handleSkipToScan={handleSkipToScan}
          preAnalysisProfile={preAnalysisProfile}
          preAnalysisSummary={preAnalysisSummary}
          onExportReportMaster={handleExportReportMaster}
          keywordsReady={keywordsReady}
          editableKeywords={editableKeywords}
          setEditableKeywords={setEditableKeywords}
          pagesCap={pagesCap}
          setPagesCap={setPagesCap}
          handleRunScan={handleRunScan}
          loading={loading}
          countryOptions={COUNTRY_OPTIONS}
          KeywordsEditor={KeywordsEditor}
          Spinner={Spinner}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          keywordsCapOptions={KEYWORDS_CAP_OPTIONS}
          keywordFocusOptions={KEYWORD_FOCUS_OPTIONS}
          keywordLength={keywordLength}
          setKeywordLength={setKeywordLength}
          keywordLengthOptions={KEYWORD_LENGTH_OPTIONS}
          pagesCapOptions={PAGES_CAP_OPTIONS}
          reportLanguage={reportLanguage}
          setReportLanguage={(v) => setReportLanguage(v as ReportLanguage)}
          reportLanguageOptions={REPORT_LANGUAGE_OPTIONS}
          keywordLanguages={keywordLanguages}
          setKeywordLanguages={setKeywordLanguages}
          keywordLanguageOptions={KEYWORD_LANGUAGE_OPTIONS}
          useKeywords={useKeywords}
          setUseKeywords={setUseKeywords}
          scanFocus={scanFocus}
          setScanFocus={setScanFocus}
          scanTier={scanTier}
          setScanTier={setScanTier}
          pipeline={
            <EaluminatePipelinePanel
              pipelineStep={pipelineStep}
              steps={PIPELINE_STEPS}
            />
          }
        />

        {result?.scanLog && !loading && (
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {(
              [
                ["results", "Results"],
                ["scanlog", "Scan Log"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setResultsTab(key)}
                style={{
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "0.625rem 0.625rem 0 0",
                  border: "1px solid #e2e8f0",
                  borderBottom: "none",
                  cursor: "pointer",
                  background: resultsTab === key ? "#fff" : "#f1f5f9",
                  color: resultsTab === key ? "#4479DA" : "#64748b",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {resultsTab === "scanlog" && result?.scanLog && !loading ? (
          <ScanLogPanel scanLog={result.scanLog} />
        ) : (
        <EaluminateResultsPanel
          loading={loading}
          result={result}
          fullName={fullName}
          score={score}
          scoreLabel={scoreLabel}
          usedKeywords={usedKeywords}
          useKeywords={useKeywords}
          tipVisible={tipVisible}
          tipIdx={tipIdx}
          tips={DID_YOU_KNOW}
          allLinks={allLinks}
          expandedLinkIndex={expandedLinkIndex}
          setExpandedLinkIndex={setExpandedLinkIndex}
          apiRiskToUi={apiRiskToUi}
          riskColors={RISK_COLORS}
          onExportSummary={handleExportSummaryPdf}
          GaugeComponent={RepuGauge}
          isResuming={isResuming}
          scanDuration={scanDuration}
          currentStep={currentStep}
          jobId={jobId}
        />
        )}
      </div>
      {exportSummaryModalOpen && (
        <ExportFieldsModal
          title="Export Internal Brief"
          fields={BRIEF_FIELDS}
          onConfirm={handleConfirmSummaryExport}
          onClose={() => setExportSummaryModalOpen(false)}
        />
      )}
      {exportReportModalOpen && (
        <ExportFieldsModal
          title="Export Research Summary"
          fields={RESEARCH_SUMMARY_FIELDS}
          onConfirm={handleConfirmReportExport}
          onClose={() => setExportReportModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function LeadPage() {
  return (
    <Suspense>
      <EaluminatePageInner />
    </Suspense>
  );
}
