"use client";

import { COUNTRY_NAMES } from "@/lib/countries";
import { leads } from "@/lib/api";
import { useRef, useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface WebLink {
  url: string;
  title: string;
  snippet: string;
  sentiment: "negative" | "positive" | "neutral";
  risk: "high" | "medium" | "low" | "none";
  source: string;
  type: string;
}

interface MeetingSummary {
  headline: string;
  issues: string[];
  talkingPoints: string[];
}

interface ScanResult {
  links: WebLink[];
  negative: WebLink[];
  positive: WebLink[];
  neutral: WebLink[];
  summary?: MeetingSummary;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const RESULTS_CAP_OPTIONS = [10, 20, 30, 40, 50];
const KEYWORDS_CAP_OPTIONS = [3, 4, 5, 6, 7, 8];

type RiskLevel = "Negative" | "Poor" | "Mediocre" | "Good";

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
  "Scanning the web for mentions…",
  "Analyzing tone and context across sources…",
  "Weighing the impact of each result…",
  "Almost done — building the ReputScore…",
];

const DID_YOU_KNOW = [
  "Your online reputation influences hiring decisions, business partnerships, and financial opportunities.",
  "83% of people search someone's name online before a first meeting.",
  "A single negative article on page one of Google can cost you clients, deals, and trust.",
  "Most people have no idea what the internet says about them.",
  "ReputScore is calculated across hundreds of sources — news, blogs, public records, and more.",
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
  borderRadius: "0.625rem",
  border: "1px solid var(--color-border, #e2e8f0)",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--color-muted, #64748b)",
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
            borderRadius: "0.625rem",
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
}: {
  keywords: string[];
  setKeywords: (kws: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = (val: string) => {
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
        borderRadius: "0.625rem",
        border: "1px solid var(--color-border, #e2e8f0)",
        backgroundColor: "#ffffff",
        minHeight: "3rem",
        alignItems: "center",
        cursor: "text",
      }}
      onClick={() =>
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
            borderRadius: "0.5rem",
            backgroundColor: "#4479DA",
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {kw}
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
        </span>
      ))}
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
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LeadPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [resultsCap, setResultsCap] = useState(20);
  const [keywordsCap, setKeywordsCap] = useState(5);

  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [keywordsReady, setKeywordsReady] = useState(false);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);

  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);

  const [preAnalysisLoading, setPreAnalysisLoading] = useState(false);
  const [preAnalysisDone, setPreAnalysisDone] = useState(false);
  const [preAnalysisSummary, setPreAnalysisSummary] = useState("");

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
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setEmployeeName(u.name || u.email || "");
        setEmployeeEmail(u.email || "");
      }
    } catch {}
  }, []);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleExportSummaryPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const sourcesHtml = "";
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Research Summary — ${fullName}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #1e293b; line-height: 1.7; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
  h2 { font-size: 1rem; font-weight: 700; margin: 2rem 0 0.5rem; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
  p { margin: 0 0 1rem; font-size: 0.975rem; }
  ul { padding-left: 1.25rem; margin: 0; }
  li { margin-bottom: 0.75rem; font-size: 0.9rem; }
  a { color: #4479da; text-decoration: none; }
  .url { color: #94a3b8; font-size: 0.8rem; }
  .footer { margin-top: 3rem; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 0.75rem; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Research Summary</h1>
<p class="meta">${fullName}${company ? ` · ${company}` : ""}${country ? ` · ${country}` : ""}</p>
<h2>Summary</h2>
<p>${preAnalysisSummary}</p>
${sourcesHtml}
<div class="footer">Generated by Ealuminate · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
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
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Research failed. Please try again.");
        return;
      }
      setPreAnalysisSummary(data.summary ?? "");
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
          keywords_suggested: data.keywords ?? [],
        });
        if (ld.id) setLeadId(ld.id);
      } catch { /* non-fatal */ }
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
      const allLinks = scanResult.links;
      const negCount = allLinks.filter(
        (l) =>
          l.sentiment === "negative" ||
          l.risk === "high" ||
          l.risk === "medium",
      ).length;
      const posCount = allLinks.filter(
        (l) =>
          l.sentiment === "positive" ||
          l.sentiment === "neutral" ||
          l.risk === "low" ||
          l.risk === "none",
      ).length;
      const finalScore = deriveScore(negCount, posCount);
      setScore(finalScore);
      setResult(scanResult);

      // Append scan results to the lead entry
      if (leadId) {
        try {
          await leads.update(leadId, {
            links: scanResult.links as unknown[],
            summary: scanResult.summary ?? undefined,
            score: finalScore,
          });
        } catch { /* non-fatal */ }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      stopCycles();
    }
  };

  const allLinks = result?.links ?? [];

  return (
    <div
      style={{
        width: "100%",
        padding: "clamp(1rem, 4vw, 2rem)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes repu-blob-morph {
          0%   { border-radius: 44% 56% 53% 47% / 50% 46% 54% 50%; transform: rotate(0deg); }
          20%  { border-radius: 57% 43% 44% 56% / 55% 53% 47% 45%; transform: rotate(72deg); }
          40%  { border-radius: 46% 54% 60% 40% / 42% 58% 46% 54%; transform: rotate(144deg); }
          60%  { border-radius: 60% 40% 46% 54% / 54% 44% 56% 46%; transform: rotate(216deg); }
          80%  { border-radius: 50% 50% 55% 45% / 48% 52% 44% 56%; transform: rotate(288deg); }
          100% { border-radius: 44% 56% 53% 47% / 50% 46% 54% 50%; transform: rotate(360deg); }
        }
        @keyframes reput-aura-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.12); }
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
        @media (max-width: 480px) {
          .lead-name-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        {/* ── Form card ── */}
        <div
          className="glass glow-border"
          style={{
            borderRadius: "0.875rem",
            padding: "clamp(1.25rem, 4vw, 2rem)",
            marginBottom: "2rem",
          }}
        >
          <h1
            style={{
              margin: "0 0 0.375rem",
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
            }}
          >
            Reputation Scan
          </h1>
          <p
            style={{
              margin: "0 0 1.75rem",
              fontSize: "0.9375rem",
              color: "var(--color-muted, #64748b)",
            }}
          >
            Enter the prospect&apos;s details to generate a reputation report.
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* First / Last Name */}
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

            {/* Company */}
            <div>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp (optional)"
                style={inputStyle}
              />
            </div>

            {/* Country */}
            <div>
              <label style={labelStyle}>Country *</label>
              <CountryPicker value={country} onChange={setCountry} required />
            </div>

            {/* Description */}
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

            {/* Number of Keywords */}
            <div>
              <label style={labelStyle}>Number of Keywords</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {KEYWORDS_CAP_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setKeywordsCap(n)}
                    style={{
                      padding: "0.4rem 1rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      border: "1.5px solid",
                      borderColor:
                        keywordsCap === n
                          ? "#4479DA"
                          : "var(--color-border, #e2e8f0)",
                      backgroundColor:
                        keywordsCap === n ? "#eef3ff" : "#ffffff",
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

            {error && (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#ef4444" }}>
                {error}
              </p>
            )}

            {/* Research button */}
            <button
              type="button"
              disabled={preAnalysisLoading}
              onClick={handleResearch}
              className="glow-button"
              style={{
                width: "100%",
                padding: "0.75rem",
                fontWeight: 700,
                borderRadius: "0.625rem",
                opacity: preAnalysisLoading ? 0.8 : 1,
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

            {/* Pre-analysis summary card */}
            {preAnalysisDone && (
              <div
                className="glass glow-border"
                style={{
                  borderRadius: "0.875rem",
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
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
                  onClick={handleExportSummaryPdf}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#48D4B8",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export PDF
                </button>
                </div>
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
              </div>
            )}

            {/* Keyword editor + Results Cap + Run Scan */}
            {keywordsReady && (
              <>
                <div>
                  <label style={labelStyle}>
                    Keywords — edit or add your own
                  </label>
                  <KeywordsEditor
                    keywords={editableKeywords}
                    setKeywords={setEditableKeywords}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Results Cap</label>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    {RESULTS_CAP_OPTIONS.map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setResultsCap(cap)}
                        style={{
                          padding: "0.4rem 1rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          border: "1.5px solid",
                          borderColor:
                            resultsCap === cap
                              ? "#4479DA"
                              : "var(--color-border, #e2e8f0)",
                          backgroundColor:
                            resultsCap === cap ? "#eef3ff" : "#ffffff",
                          color:
                            resultsCap === cap
                              ? "#4479DA"
                              : "var(--color-muted, #64748b)",
                        }}
                      >
                        {cap}
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
                  disabled={loading || editableKeywords.length === 0}
                  onClick={handleRunScan}
                  className="glow-button"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "0.625rem",
                    opacity: loading || editableKeywords.length === 0 ? 0.8 : 1,
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
        </div>

        {/* ── Results ── */}
        <div
          className={`animate-scale-in${loading || result ? " glass glow-border" : ""}`}
          style={{
            borderRadius: "0.875rem",
            padding: "2.5rem 2rem",
            textAlign: "center",
            minHeight: loading || result ? "24rem" : 0,
            display: loading || result ? "flex" : "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          {/* Loading */}
          {loading && (
            <div
              className="animate-fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2rem",
                width: "100%",
                maxWidth: "22rem",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "160px",
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "160px",
                    height: "160px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(ellipse at center, rgba(68,121,218,0.28) 0%, rgba(72,212,184,0.14) 45%, transparent 70%)",
                    filter: "blur(22px)",
                    animation: "reput-aura-breathe 3.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "44% 56% 53% 47% / 50% 46% 54% 50%",
                    background:
                      "linear-gradient(135deg, #48D4B8 0%, #4479DA 100%)",
                    boxShadow:
                      "0 0 40px rgba(68,121,218,0.5), 0 0 80px rgba(72,212,184,0.25), inset 0 0 30px rgba(72,212,184,0.2)",
                    animation: "repu-blob-morph 3s linear infinite",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "14%",
                      left: "18%",
                      width: "32%",
                      height: "22%",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)",
                      filter: "blur(5px)",
                    }}
                  />
                </div>
              </div>

              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: "var(--color-muted)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  animation: "reput-label-breathe 3s ease-in-out infinite",
                }}
              >
                We&apos;re calculating the ReputScore
              </p>

              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 400,
                  color: "#9ca3af",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: statusVisible ? 1 : 0,
                  transition: "opacity 0.5s ease",
                  minHeight: "1.2em",
                  textAlign: "center",
                  margin: 0,
                  willChange: "opacity",
                }}
              >
                {STATUS_MESSAGES[statusIdx]}
              </p>

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#6b7280",
                    marginBottom: "0.5rem",
                  }}
                >
                  💡 DID YOU KNOW?
                </div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "#374151",
                    lineHeight: 1.6,
                    margin: 0,
                    opacity: tipVisible ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    minHeight: "3em",
                    willChange: "opacity",
                  }}
                >
                  {DID_YOU_KNOW[tipIdx]}
                </p>
              </div>
            </div>
          )}

          {/* Loaded */}
          {!loading && result && (
            <div
              className="animate-fade-up"
              style={{ width: "100%", textAlign: "center" }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--color-foreground)",
                  letterSpacing: "0.08em",
                  marginBottom: "2rem",
                  textTransform: "uppercase",
                }}
              >
                {fullName}
              </h2>

              <RepuGauge score={score} />

              <div
                style={{
                  display: "inline-block",
                  marginTop: "-3.25rem",
                  position: "relative",
                  zIndex: 1,
                  padding: "0.625rem 2rem",
                  borderRadius: "0.625rem",
                  backgroundColor: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
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

              {usedKeywords.length > 0 && (
                <div style={{ marginTop: "1.25rem", textAlign: "left" }}>
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
                    Keywords Used
                  </p>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                  >
                    {usedKeywords.map((kw) => (
                      <span
                        key={kw}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.5rem",
                          backgroundColor: "rgba(68,121,218,0.08)",
                          border: "1px solid rgba(68,121,218,0.2)",
                          color: "#4479DA",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.summary && (
                <div
                  style={{
                    marginTop: "1.25rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    textAlign: "left",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
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
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <p
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        margin: "0 0 0.875rem",
                      }}
                    >
                      {result.summary.headline}
                    </p>
                    <div style={{ marginBottom: "0.875rem" }}>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Key Points
                      </p>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "1.1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        {result.summary.issues.map((issue, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: "0.8125rem",
                              color: "#475569",
                              lineHeight: 1.5,
                            }}
                          >
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Meeting Angles
                      </p>
                      <ol
                        style={{
                          margin: 0,
                          paddingLeft: "1.1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        {result.summary.talkingPoints.map((point, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: "0.8125rem",
                              color: "#475569",
                              lineHeight: 1.5,
                            }}
                          >
                            {point}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {allLinks.length === 0 && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
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
                    const risk = RISK_COLORS[uiRisk];
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
                        style={{
                          display: "flex",
                          borderRadius: "0.75rem",
                          overflow: "hidden",
                          border: `1px solid ${risk.border}`,
                          background: `linear-gradient(135deg, ${risk.bg} 0%, rgba(255,255,255,0) 60%)`,
                          boxShadow: `inset 0 0 0 0.5px ${risk.border}, 0 1px 4px rgba(0,0,0,0.06)`,
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedLinkIndex(isExpanded ? null : String(i))
                        }
                      >
                        <div
                          style={{
                            width: "2px",
                            flexShrink: 0,
                            background: `linear-gradient(180deg, ${risk.color} 0%, transparent 100%)`,
                          }}
                        />
                        <div
                          style={{
                            flex: 1,
                            padding: "0.9rem 1rem 0.85rem",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.4rem",
                              marginBottom: "0.45rem",
                              flexWrap: "wrap",
                              rowGap: "0.3rem",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "ui-monospace,'SF Mono',monospace",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                color: "var(--color-muted)",
                                background: "rgba(0,0,0,0.04)",
                                padding: "0.1rem 0.45rem",
                                borderRadius: "4px",
                                border: "1px solid var(--color-border)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                                maxWidth: "60%",
                              }}
                            >
                              {domain}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily:
                                    "ui-monospace,'SF Mono',monospace",
                                  fontSize: "0.6rem",
                                  fontWeight: 800,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "4px",
                                  backgroundColor: risk.bg,
                                  color: risk.color,
                                  border: `1px solid ${risk.border}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ▲ {uiRisk}
                              </span>
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
                                  color: "var(--color-muted)",
                                  transform: isExpanded
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 0.2s ease",
                                  flexShrink: 0,
                                }}
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "var(--color-foreground)",
                                lineHeight: 1.35,
                                margin: 0,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {item.title}
                            </p>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                flexShrink: 0,
                                color: "var(--color-muted)",
                                marginTop: "0.1rem",
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
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          </div>
                          {isExpanded && (
                            <>
                              <div
                                style={{
                                  height: "1px",
                                  background: `linear-gradient(90deg, ${risk.border} 0%, transparent 80%)`,
                                  margin: "0.5rem 0 0.4rem",
                                }}
                              />
                              <p
                                style={{
                                  fontSize: "0.775rem",
                                  color: "var(--color-muted)",
                                  lineHeight: 1.6,
                                  margin: 0,
                                }}
                              >
                                {item.snippet}
                              </p>
                            </>
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
      </div>
    </div>
  );
}
