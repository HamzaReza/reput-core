"use client";

import { clientsApi, leads, WebLink } from "@/lib/api";
import { COUNTRY_NAMES } from "@/lib/countries";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { EaluminateFormPanel } from "./_components/EaluminateFormPanel";
import { EaluminatePipelinePanel } from "./_components/EaluminatePipelinePanel";
import { EaluminateResultsPanel } from "./_components/EaluminateResultsPanel";
import type { KeywordFocus, PreAnalysisProfile, RiskLevel, ScanResult } from "./_components/types";
import { exportReportMasterPdf, exportSummaryPdf } from "./_utils/pdfExports";

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
      seedMockScan: () => void;
      resetUi: () => void;
    };
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────
const RESULTS_CAP_OPTIONS = [10, 20, 30, 40, 50];
const KEYWORDS_CAP_OPTIONS = [3, 4, 5, 6, 7, 8];

const KEYWORD_FOCUS_OPTIONS = [
  { value: "all",      label: "All Coverage" },
  { value: "negative", label: "Negative" },
  { value: "neutral",  label: "Neutral" },
  { value: "positive", label: "Positive" },
] as const;

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "Profile research",
    desc: "Identity, background, and context discovery",
  },
  {
    n: "02",
    title: "Keyword preparation",
    desc: "Search intent and query terms finalized",
  },
  {
    n: "03",
    title: "Scan and classification",
    desc: "Sources fetched and reputation signals scored",
  },
  {
    n: "04",
    title: "Brief ready",
    desc: "Meeting summary and talking points generated",
  },
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

const DID_YOU_KNOW = [
  "Researching a prospect before a pitch significantly increases your conversion rate.",
  "Understanding a prospect's public reputation helps you anticipate objections before the meeting.",
  "A thorough background scan lets you tailor your approach to the right angle.",
  "EALUMINATE scans hundreds of public sources to build a complete prospect profile.",
  "Knowing a prospect's risk profile helps you decide how to position your offering.",
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
  borderRadius: "0.25rem",
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

// ── CountryPicker ──────────────────────────────────────────────────────────────
function CountryPicker({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? COUNTRY_NAMES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 80)
    : COUNTRY_NAMES;

  const handleSelect = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };
  const onBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }} onBlur={onBlur}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={open ? query : value}
          placeholder="Select a country"
          autoComplete="off"
          required={required && !value}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          style={{
            ...inputStyle,
            paddingRight: "2.5rem",
            color: value && !open ? "#1e293b" : open ? "#1e293b" : "#94a3b8",
          }}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(100,116,139,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: "1rem",
            top: "50%",
            transform: open
              ? "translateY(-50%) rotate(180deg)"
              : "translateY(-50%)",
            pointerEvents: "none",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: "0.25rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: "min(14rem, 40vh)",
            overflowY: "auto",
            zIndex: 200,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "0.75rem 1rem",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              No results
            </div>
          ) : (
            filtered.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(name);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.625rem 1rem",
                  border: "none",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: name === value ? "#eef3ff" : "transparent",
                  color: "#1e293b",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  fontWeight: name === value ? 500 : 400,
                }}
              >
                {name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
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
  const remove = (kw: string) => setKeywords(keywords.filter((k) => k !== kw));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.5rem",
        borderRadius: "0.25rem",
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
            borderRadius: "0.25rem",
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [resultsCap, setResultsCap] = useState(20);
  const [keywordsCap, setKeywordsCap] = useState(5);
  const [keywordFocus, setKeywordFocus] = useState<KeywordFocus>("all");

  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [keywordsReady, setKeywordsReady] = useState(false);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);

  const [scanComplete, setScanComplete] = useState(false);

  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const [preAnalysisLoading, setPreAnalysisLoading] = useState(false);
  const [preAnalysisDone, setPreAnalysisDone] = useState(false);
  const [preAnalysisSummary, setPreAnalysisSummary] = useState("");
  const [preAnalysisProfile, setPreAnalysisProfile] =
    useState<PreAnalysisProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const [expandedLinkIndex, setExpandedLinkIndex] = useState<string | null>(
    null,
  );

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

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
      seedMockScan: () => {
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

        setLoading(false);
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
      },
      resetUi: () => {
        setLoading(false);
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
      delete window.__EALU_DEBUG__;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setOperatorName(u.name || u.email || "");
        setOperatorEmail(u.email || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = searchParams.get("lead");
    if (!id) return;
    leads
      .get(id)
      .then(async (lead) => {
        const parts = (lead.name ?? "").trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setCompany(lead.company ?? "");
        setCountry(lead.country ?? "");
        setDescription(lead.background ?? "");
        setLeadId(lead.id);

        // Resolve the corresponding client so scan events can be appended
        try {
          const clients = await clientsApi.list(200);
          const match = clients.find(
            (c) =>
              c.name === (lead.name ?? "").trim() &&
              c.country === (lead.country ?? ""),
          );
          if (match) setClientId(match.id);
        } catch {
          /* non-fatal */
        }

        if (lead.keywords_suggested.length > 0 || lead.pre_analysis_summary) {
          setEditableKeywords(lead.keywords_suggested);
          const raw = lead.pre_analysis_summary ?? "";
          setPreAnalysisSummary(raw);
          try {
            const p = JSON.parse(raw) as PreAnalysisProfile;
            if (p?.identity) setPreAnalysisProfile(p);
          } catch {
            /* legacy plain-text summary — profile stays null */
          }
          setKeywordsReady(lead.keywords_suggested.length > 0);
          setPreAnalysisDone(true);
        }

        if (lead.links && lead.links.length > 0) {
          const links = lead.links as WebLink[];
          const negative = links.filter(
            (l) =>
              l.sentiment === "negative" ||
              l.risk === "high" ||
              l.risk === "medium",
          );
          const positive = links.filter(
            (l) =>
              l.sentiment === "positive" ||
              l.risk === "low" ||
              l.risk === "none",
          );
          const neutral = links.filter((l) => l.sentiment === "neutral");
          setResult({
            links,
            negative,
            positive,
            neutral,
            summary: lead.summary ?? undefined,
          });
          setUsedKeywords(lead.keywords_suggested);
        }

        if (lead.score !== null) {
          setScore(lead.score);
          setScanComplete(true);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleExportSummaryPdf = () => {
    exportSummaryPdf({
      fullName,
      company,
      country,
      operatorName,
      score,
      result,
    });
  };

  const handleExportReportMaster = () => {
    exportReportMasterPdf({
      fullName,
      company,
      country,
      operatorName,
      preAnalysisProfile,
      preAnalysisSummary,
      editableKeywords,
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

  const handleResearch = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !country ||
      !description.trim()
    ) {
      setError("First name, last name, country and description are required.");
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
    try {
      const res = await fetch("/api/pre-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          country,
          description: description.trim(),
          keywordsCap,
          keywordFocus,
        }),
      });
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
        });
        if (ld.id) setLeadId(ld.id);

        const cl = await clientsApi.upsert({
          name: fullName,
          country,
          company: company.trim() || undefined,
          event_type: "research",
          event_data: {
            profile: profile ?? {},
            keywords: data.keywords ?? [],
            background: description.trim(),
            lead_id: ld.id,
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
    if (!editableKeywords.length) {
      setError("Add at least one keyword.");
      return;
    }
    setError("");
    setResult(null);
    setScore(0);
    setExpandedLinkIndex(null);
    setUsedKeywords([...editableKeywords]);
    setLoading(true);
    startCycles();

    try {
      const res = await fetch("/api/generate-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          country,
          description: description.trim(),
          keywords: editableKeywords,
          resultsCap,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Scan failed. Please try again.");
        return;
      }

      const scanResult = data as ScanResult;
      const finalScore =
        typeof data.score === "number"
          ? data.score
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
      setScanComplete(true);

      // Append scan results to the lead entry
      if (leadId) {
        try {
          await leads.update(leadId, {
            links: scanResult.links as unknown[],
            summary: scanResult.summary
              ? ({ ...scanResult.summary } as Record<string, unknown>)
              : undefined,
            score: finalScore,
            keywords_suggested: editableKeywords,
          });
        } catch {
          /* non-fatal */
        }
      }

      // Append scan event to the client timeline
      if (clientId) {
        try {
          await clientsApi.addEvent(clientId, {
            event_type: "scan",
            event_data: {
              score: finalScore,
              summary: scanResult.summary ?? null,
              links_count: scanResult.links.length,
              negative_count: scanResult.negative.length,
              keywords: editableKeywords,
            },
          });
        } catch {
          /* non-fatal */
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
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
        @keyframes repu-logo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes repu-ring-pulse {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(2.8);  opacity: 0; }
        }
        @keyframes reput-label-breathe {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.85; }
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
        @media (max-width: 480px) {
          .lead-name-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .eal-card-body { flex-direction: column; }
          .eal-pipeline { width: 100% !important; }
        }
      `}</style>

      <div style={{ maxWidth: "100rem", margin: "0 auto" }}>
        <EaluminateFormPanel
          scanComplete={scanComplete}
          preAnalysisDone={preAnalysisDone}
          preAnalysisLoading={preAnalysisLoading}
          error={error}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          company={company}
          setCompany={setCompany}
          country={country}
          setCountry={setCountry}
          description={description}
          keywordsCap={keywordsCap}
          setKeywordsCap={setKeywordsCap}
          keywordFocus={keywordFocus}
          handleDescriptionChange={handleDescriptionChange}
          handleFocusChange={handleFocusChange}
          handleResearch={handleResearch}
          preAnalysisProfile={preAnalysisProfile}
          preAnalysisSummary={preAnalysisSummary}
          onExportReportMaster={handleExportReportMaster}
          keywordsReady={keywordsReady}
          editableKeywords={editableKeywords}
          setEditableKeywords={setEditableKeywords}
          resultsCap={resultsCap}
          setResultsCap={setResultsCap}
          handleRunScan={handleRunScan}
          loading={loading}
          CountryPicker={CountryPicker}
          KeywordsEditor={KeywordsEditor}
          Spinner={Spinner}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          keywordsCapOptions={KEYWORDS_CAP_OPTIONS}
          keywordFocusOptions={KEYWORD_FOCUS_OPTIONS}
          resultsCapOptions={RESULTS_CAP_OPTIONS}
          pipeline={
            <EaluminatePipelinePanel
              pipelineStep={pipelineStep}
              steps={PIPELINE_STEPS}
            />
          }
        />

        <EaluminateResultsPanel
          loading={loading}
          result={result}
          fullName={fullName}
          score={score}
          scoreLabel={scoreLabel}
          usedKeywords={usedKeywords}
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
        />
      </div>
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
