"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import MeetingsTab from "@/components/dashboard/MeetingsTab";
import ScheduleMeetingCTA from "@/components/dashboard/ScheduleMeetingCTA";
import {
  auth,
  contracts,
  isAuthed,
  reputation,
  users,
  type Contract,
  type ContractLink,
  type ReputationScan,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tab = "score" | "contract" | "meetings";
type RiskLevel = "Negative" | "Poor" | "Mediocre" | "Good";

function apiRiskToUi(risk: string): RiskLevel {
  if (risk === "high") return "Negative";
  if (risk === "medium") return "Poor";
  if (risk === "low") return "Mediocre";
  return "Good";
}

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

// Score bands (from image):
// Green  → 10+ positive, 0 negative  → score 86–100
// Yellow → 1–5 negative              → score 61–85
// Orange → 6–10 negative             → score 26–60
// Red    → 11+ negative              → score 0–25
function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 86) return { label: "Good", color: "#4CAF50" };
  if (score >= 61) return { label: "Mediocre", color: "#FFD600" };
  if (score >= 26) return { label: "Poor", color: "#FF8C00" };
  return { label: "Negative", color: "#FF6B4A" };
}

/**
 * Derive a 0–100 reputation score based on the image rubric:
 *   Green  (86–100): 10+ positive results AND 0 negative
 *   Yellow (61–85):  1–5 negative results
 *   Orange (26–60):  6–10 negative results
 *   Red    (0–25):   11+ negative results
 *
 * Within each band the score is further fine-tuned by the positive count.
 */
function deriveScore(negCount: number, posCount: number): number {
  if (negCount === 0) {
    // No negatives — perfect score.
    return 100;
  }
  if (negCount <= 5) {
    // Yellow band (61–85). Fewer negatives & more positives → higher end.
    const base = 85 - (negCount - 1) * 4; // 85, 81, 77, 73, 69
    const posBonus = Math.min(posCount, 10);
    return Math.min(85, Math.max(61, base + Math.round((posBonus / 10) * 5)));
  }
  if (negCount <= 10) {
    // Orange band (26–60).
    const base = 60 - (negCount - 6) * 7; // 60, 53, 46, 39, 32
    const posBonus = Math.min(posCount, 10);
    return Math.min(60, Math.max(26, base + Math.round((posBonus / 10) * 5)));
  }
  // Red band (0–25): 11+ negatives.
  const base = Math.max(0, 25 - (negCount - 11) * 2);
  return base;
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────────
function RepuGauge({
  score,
  avatar,
}: {
  score: number;
  avatar: string;
  initials: string;
}) {
  const cx = 140,
    cy = 140;
  const r = 112;
  const arcStroke = 22;
  const avatarR = 62;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, radius: number) => ({
    x: cx + radius * Math.cos(toRad(deg)),
    y: cy - radius * Math.sin(toRad(deg)),
  });

  const s = pt(210, r);
  const e = pt(330, r);

  // Final needle angle (math convention, CCW from east)
  const finalAngle = 210 - (score / 100) * 240;
  // Start angle is always 210° (0% position)
  const startAngle = 210;
  // SVG rotation: from startAngle to finalAngle, both converted to SVG rotation degrees
  // SVG rotates CW, math angles go CCW → SVG angle = -mathAngle
  const svgStartRot = -startAngle; // = -210
  const svgFinalRot = -finalAngle;

  const tipLen = r - arcStroke / 2 - 4;
  const baseLen = avatarR + 1;
  const hw = 14;

  // Dart at 0° position (pointing right from cx,cy) — rotation handles direction
  const tx0 = cx + tipLen;
  const ty0 = cy;
  const bx0 = cx + baseLen;
  const by0 = cy;
  const p1_0 = { x: bx0, y: by0 + hw };
  const p2_0 = { x: bx0, y: by0 - hw };

  const pad = arcStroke / 2 + 10;
  const vb = `${cx - r - pad} ${cy - r - pad} ${(r + pad) * 2} ${(r + pad) * 2}`;

  // Unique id per instance to avoid gradient conflicts
  const gradId = "gaugeGrad";
  const clipId = "avatarClip";

  return (
    <svg
      viewBox={vb}
      width="100%"
      style={{ maxWidth: "21rem", display: "block", margin: "0 auto" }}
    >
      <defs>
        {/* Inverted gradient: left=red (negative), right=green (positive) */}
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={s.x}
          y1={cy}
          x2={e.x}
          y2={cy}
        >
          <stop offset="0%" stopColor="#FF3D00" />
          <stop offset="25%" stopColor="#FF8C00" />
          <stop offset="45%" stopColor="#FFD600" />
          <stop offset="70%" stopColor="#C8D600" />
          <stop offset="100%" stopColor="#4CAF50" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={avatarR} />
        </clipPath>
        <style>{`
          @keyframes gauge-needle {
            from { transform: rotate(${svgStartRot}deg); }
            to   { transform: rotate(${svgFinalRot}deg); }
          }
          .gauge-needle-g {
            transform-origin: ${cx}px ${cy}px;
            transform: rotate(${svgStartRot}deg);
            animation: gauge-needle ${(0.6 + (score / 100) * 2.4).toFixed(2)}s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            animation-delay: 0.3s;
          }
        `}</style>
      </defs>

      {/* Grey background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(148,163,184,0.3)"
        strokeWidth={arcStroke}
      />

      {/* Colored arc */}
      <path
        d={`M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={arcStroke}
        strokeLinecap="round"
      />

      {/* Avatar background disc */}
      <circle cx={cx} cy={cy} r={avatarR + 4} fill="#ffffff" />

      {/* Avatar */}
      {avatar ? (
        <image
          href={avatar}
          x={cx - avatarR}
          y={cy - avatarR}
          width={avatarR * 2}
          height={avatarR * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
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
        </>
      )}

      {/* Avatar rim */}
      <circle
        cx={cx}
        cy={cy}
        r={avatarR}
        fill="none"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth={2}
      />

      {/* Dart — rotates from start to final angle */}
      <g className="gauge-needle-g">
        <path
          d={[
            `M ${tx0} ${ty0}`,
            `L ${p1_0.x} ${p1_0.y}`,
            `A ${hw} ${hw} 0 0 1 ${p2_0.x} ${p2_0.y}`,
            `Z`,
          ].join(" ")}
          fill="#4A6FA5"
        />
      </g>
    </svg>
  );
}

// ── Status badge colors for contracts ─────────────────────────────────────────
const CONTRACT_STATUS_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  pending: {
    bg: "rgba(255,214,0,0.1)",
    color: "#FFD600",
    border: "rgba(255,214,0,0.3)",
  },
  in_progress: {
    bg: "rgba(68,121,218,0.1)",
    color: "var(--color-primary)",
    border: "rgba(68,121,218,0.3)",
  },
  completed: {
    bg: "rgba(76,175,80,0.1)",
    color: "#4CAF50",
    border: "rgba(76,175,80,0.3)",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [upgradingPro, setUpgradingPro] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [scanName, setScanName] = useState("");
  const [scanKeywords, setScanKeywords] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("");
  const [score, setScore] = useState(0);
  const [scanData, setScanData] = useState<ReputationScan | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  // Contract state
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [contractNotes, setContractNotes] = useState("");
  const [contractSubmitting, setContractSubmitting] = useState(false);
  const [contractSuccess, setContractSuccess] = useState(false);

  const infoMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/auth");
      return;
    }
    setAuthed(true);

    const loadData = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      try {
        // Load cached scan from sessionStorage — avoids re-fetching on tab navigation
        const cached = sessionStorage.getItem("reput_scan");
        if (cached) {
          const parsed: ReputationScan = JSON.parse(cached);
          setScanData(parsed);
          setScore(parsed.score);
        }

        const user = await auth.me();
        if (!user.profile_complete) {
          router.replace("/auth?step=3");
          return;
        }
        if (user.name) setScanName(user.name.toUpperCase());
        if (user.profile?.avatar_url) setAvatar(user.profile.avatar_url);
        const trialActive =
          user.plan === "pro" &&
          !!user.pro_trial_expires_at &&
          new Date(user.pro_trial_expires_at) > new Date();
        setIsPro(trialActive);

        const currentKeywords: string[] = user.profile?.keywords ?? [];
        if (currentKeywords.length) setScanKeywords(currentKeywords);

        const currentName = user.name ?? "";
        const prevName = localStorage.getItem("reput_last_scan_name") ?? "";
        const nameChanged = prevName !== currentName;

        const keywordsKey = [...currentKeywords].sort().join(",");
        const prevKeywordsKey =
          localStorage.getItem("reput_last_scan_keywords") ?? "";
        const keywordsChanged = prevKeywordsKey !== keywordsKey;

        // Trigger scan on first visit, or when name or keywords changed
        if (!cached || nameChanged || keywordsChanged) {
          type LinkItem = {
            url: string;
            title: string;
            snippet: string;
            sentiment?: string;
            risk: string;
            source: string;
            type: string;
          };
          type LinksResponse = {
            links: LinkItem[];
            negative: LinkItem[];
            positive: LinkItem[];
            neutral: LinkItem[];
          };

          const [scan, linksRes] = await Promise.allSettled([
            reputation.triggerScan(),
            fetch("/api/negative-links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: user.name ?? "",
                keywords: currentKeywords,
                nationality: user.nationality ?? "",
              }),
            }).then((r) => r.json() as Promise<LinksResponse>),
          ]);

          const scanResult = scan.status === "fulfilled" ? scan.value : null;
          const linksData =
            linksRes.status === "fulfilled" ? linksRes.value : null;
          const allLinks: LinkItem[] = linksData?.links ?? [];
          const negLinks =
            linksData?.negative ??
            allLinks.filter(
              (l) =>
                l.sentiment === "negative" ||
                (!l.sentiment && l.risk !== "none" && l.risk !== "low"),
            );
          const posLinks =
            linksData?.positive ??
            allLinks.filter((l) => l.sentiment === "positive");

          if (scanResult) {
            const negCount = negLinks.length;
            const posCount = posLinks.length;
            const derivedScore = deriveScore(negCount, posCount);

            const merged = {
              ...scanResult,
              score: derivedScore,
              risk_level:
                derivedScore >= 86
                  ? "low"
                  : derivedScore >= 61
                    ? "medium"
                    : "high",
              results: allLinks.map((l) => ({ ...l, risk: l.risk as string })),
              summary: {
                total_results: allLinks.length,
                high_risk: negLinks.filter((l) => l.risk === "high").length,
                medium_risk: negLinks.filter((l) => l.risk === "medium").length,
                low_risk: negLinks.filter((l) => l.risk === "low").length,
              },
            };
            setScanData(merged);
            setScore(merged.score);
            sessionStorage.setItem("reput_scan", JSON.stringify(merged));
          }
          localStorage.setItem("reput_last_scan_keywords", keywordsKey);
          localStorage.setItem("reput_last_scan_name", currentName);
        }
      } catch {
        // Fallback — keep defaults
      } finally {
        setScoreLoading(false);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    return () => {
      if (infoMoreTimeoutRef.current) clearTimeout(infoMoreTimeoutRef.current);
    };
  }, []);

  const contractsFetchedRef = useRef(false);

  // Load contracts when switching to the contract tab — fetch once only
  useEffect(() => {
    if (activeTab === "contract" && !contractsFetchedRef.current) {
      contractsFetchedRef.current = true;
      setContractsLoading(true);
      contracts
        .getMy()
        .then(setMyContracts)
        .catch(() => {})
        .finally(() => setContractsLoading(false));
    }
  }, [activeTab]);

  const handleToggleLink = (url: string) => {
    setSelectedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleSubmitContract = async () => {
    if (selectedLinks.size === 0 || contractSubmitting) return;
    setContractSubmitting(true);
    setContractSuccess(false);
    try {
      const links: ContractLink[] = (scanData?.results ?? [])
        .filter((r) => selectedLinks.has(r.url))
        .map((r) => ({ url: r.url, title: r.title }));
      const newContract = await contracts.create({
        links,
        notes: contractNotes.trim() || undefined,
      });
      setMyContracts((prev) => [newContract, ...prev]);
      setSelectedLinks(new Set());
      setContractNotes("");
      setContractSuccess(true);
      // Re-enable future fetches so a manual refresh would work
      contractsFetchedRef.current = true;
    } catch {
      // keep submitting false
    } finally {
      setContractSubmitting(false);
    }
  };

  async function handleUpgradePro() {
    setUpgradingPro(true);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await users.startTrial();
    } catch {
      // ignore — still set pro locally for the day
    }
    setIsPro(true);
    setUpgradingPro(false);
  }

  if (!authed) return null;

  const negativeResults = scanData?.results ?? [];

  // URLs already used in existing contracts — excluded from the contract form
  const contractedUrls = new Set(
    myContracts.flatMap((c) => c.links.map((l) => l.url)),
  );
  const availableForContract = negativeResults.filter(
    (r) => !contractedUrls.has(r.url),
  );
  const visibleNegativeLinks = isPro
    ? negativeResults
    : negativeResults.slice(0, 3);
  const blurredNegativeLinks = isPro ? [] : negativeResults.slice(3);

  return (
    <div
      className="grid-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--color-background)",
      }}
    >
      <Header />
      <main style={{ flex: 1, paddingTop: "4.5rem", paddingBottom: "6rem" }}>
        <div
          style={{
            maxWidth: "52rem",
            margin: "0 auto",
            padding: "1.5rem clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          {/* ── Tab: Score ─────────────────────────────────────────────────── */}
          <div style={{ display: activeTab === "score" ? undefined : "none" }}>
            <div
              className="glass glow-border animate-scale-in"
              style={{
                borderRadius: "0.875rem",
                padding: "2.5rem 2rem",
                textAlign: "center",
                minHeight: "24rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: scoreLoading ? "center" : "flex-start",
              }}
            >
              {scoreLoading ? (
                /* ── Loading state ── */
                <div
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      border: "3px solid var(--color-border)",
                      borderTopColor: "var(--color-primary)",
                      animation: "reput-spin 0.9s linear infinite",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--color-foreground)",
                    }}
                  >
                    Your ReputScore is being calculated…
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    Scanning the web for mentions of your name
                  </p>
                </div>
              ) : (
                /* ── Loaded state ── */
                <div
                  className="animate-fade-up"
                  style={{ width: "100%", textAlign: "center" }}
                >
                  {/* Name */}
                  <h1
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--color-foreground)",
                      letterSpacing: "0.08em",
                      marginBottom: "2rem",
                      textTransform: "uppercase",
                    }}
                  >
                    {scanName}
                  </h1>

                  {/* Gauge — only shown when keywords exist */}
                  {scanKeywords.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "2rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px dashed var(--color-border)",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        fill="none"
                        stroke="var(--color-muted)"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="11" cy="11" r="8" strokeWidth="2" />
                        <path
                          strokeLinecap="round"
                          strokeWidth="2"
                          d="M21 21l-4.35-4.35"
                        />
                      </svg>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "var(--color-foreground)",
                        }}
                      >
                        No keywords added yet
                      </p>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--color-muted)",
                          maxWidth: "22rem",
                        }}
                      >
                        Add keywords in{" "}
                        <a
                          href="/settings"
                          style={{
                            color: "var(--color-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Settings
                        </a>{" "}
                        so we can calculate your ReputScore.
                      </p>
                    </div>
                  ) : (
                    <>
                      <RepuGauge
                        score={score}
                        avatar={avatar}
                        initials={scanName
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      />

                      {/* Score label — number 0-100, no % */}
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: "-3.25rem",
                          position: "relative",
                          zIndex: 1,
                          padding: "0.625rem 2rem",
                          borderRadius: "0.625rem",
                          backgroundColor: "var(--color-surface)",
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
                    </>
                  )}

                  {/* Schedule Meeting CTA */}
                  {scanData && (
                    <ScheduleMeetingCTA
                      score={score}
                      totalLinks={negativeResults.length}
                      hasNegative={negativeResults.some(
                        (l) => l.risk === "high" || l.risk === "medium",
                      )}
                    />
                  )}

                  {/* Keywords */}
                  <div
                    className="glass"
                    style={{
                      borderRadius: "0.75rem",
                      padding: "1.5rem",
                      marginTop: "1.25rem",
                      border: "1px solid var(--color-border)",
                      textAlign: "left",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-muted)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      Keywords
                    </h2>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.8125rem",
                        marginBottom: "1rem",
                      }}
                    >
                      The keywords you inserted are the following:
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.625rem",
                      }}
                    >
                      {scanKeywords.map((kw) => (
                        <span
                          key={kw}
                          style={{
                            padding: "0.5rem 1.25rem",
                            borderRadius: "0.625rem",
                            backgroundColor: "rgba(68,121,218,0.08)",
                            border: "1px solid rgba(68,121,218,0.2)",
                            color: "var(--color-foreground)",
                            fontSize: "0.9375rem",
                            fontWeight: 500,
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ── Conditional: negative score → show links ── */}
                  {negativeResults.length > 0 && (
                    <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
                      <h2
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--color-muted)",
                          marginBottom: "0.875rem",
                        }}
                      >
                        Flagged Links
                      </h2>

                      {/* First 3 — visible */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {visibleNegativeLinks.map((result, i) => {
                          const uiRisk = apiRiskToUi(result.risk);
                          const risk = RISK_COLORS[uiRisk];
                          return (
                            <div
                              key={i}
                              className="glass"
                              style={{
                                borderRadius: "0.625rem",
                                padding: "1rem 1.25rem",
                                border: "1px solid var(--color-border)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p
                                    style={{
                                      fontSize: "0.9375rem",
                                      fontWeight: 600,
                                      color: "var(--color-foreground)",
                                      marginBottom: "0.2rem",
                                    }}
                                  >
                                    {result.title}
                                  </p>
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "block",
                                      fontSize: "0.75rem",
                                      color: "var(--color-primary)",
                                      marginBottom: "0.4rem",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {result.url}
                                  </a>
                                  <p
                                    style={{
                                      fontSize: "0.8125rem",
                                      color: "var(--color-muted)",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {result.snippet}
                                  </p>
                                </div>
                                <span
                                  style={{
                                    flexShrink: 0,
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "9999px",
                                    backgroundColor: risk.bg,
                                    color: risk.color,
                                    border: `1px solid ${risk.border}`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {uiRisk}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Remaining — blurred (premium) */}
                      {blurredNegativeLinks.length > 0 && !isPro && (
                        <div
                          style={{ position: "relative", marginTop: "0.75rem" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              filter: isPro ? "none" : "blur(4px)",
                              userSelect: isPro ? "auto" : "none",
                              pointerEvents: isPro ? "auto" : "none",
                            }}
                          >
                            {blurredNegativeLinks.map((result, i) => {
                              const uiRisk = apiRiskToUi(result.risk);
                              const risk = RISK_COLORS[uiRisk];
                              return (
                                <div
                                  key={i}
                                  className="glass"
                                  style={{
                                    borderRadius: "0.625rem",
                                    padding: "1rem 1.25rem",
                                    border: "1px solid var(--color-border)",
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
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p
                                        style={{
                                          fontSize: "0.9375rem",
                                          fontWeight: 600,
                                          color: "var(--color-foreground)",
                                          marginBottom: "0.2rem",
                                        }}
                                      >
                                        {result.title}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "var(--color-primary)",
                                          marginBottom: "0.4rem",
                                        }}
                                      >
                                        {result.url}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: "0.8125rem",
                                          color: "var(--color-muted)",
                                        }}
                                      >
                                        {result.snippet}
                                      </p>
                                    </div>
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        padding: "0.25rem 0.75rem",
                                        borderRadius: "9999px",
                                        backgroundColor: risk.bg,
                                        color: risk.color,
                                        border: `1px solid ${risk.border}`,
                                      }}
                                    >
                                      {uiRisk}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Premium overlay */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              paddingTop: "1.25rem",
                              gap: "0.75rem",
                              borderRadius: "0.625rem",
                              backgroundColor: "rgba(0,0,0,0.35)",
                            }}
                          >
                            <svg
                              width="28"
                              height="28"
                              fill="none"
                              stroke="#fff"
                              viewBox="0 0 24 24"
                            >
                              <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                                strokeWidth={2}
                              />
                              <path
                                strokeLinecap="round"
                                strokeWidth={2}
                                d="M7 11V7a5 5 0 0110 0v4"
                              />
                            </svg>
                            <p
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.9375rem",
                              }}
                            >
                              {blurredNegativeLinks.length} more link
                              {blurredNegativeLinks.length > 1 ? "s" : ""} —
                              Premium only
                            </p>
                            <button
                              onClick={handleUpgradePro}
                              disabled={upgradingPro}
                              className="glow-button"
                              style={{
                                fontWeight: 700,
                                padding: "0.5rem 1.5rem",
                                borderRadius: "0.625rem",
                                fontSize: "0.875rem",
                                cursor: upgradingPro
                                  ? "not-allowed"
                                  : "pointer",
                                opacity: upgradingPro ? 0.7 : 1,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              {upgradingPro ? (
                                <>
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                      animation: "spin 1s linear infinite",
                                    }}
                                  >
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                  </svg>
                                  Upgrading…
                                </>
                              ) : (
                                "Upgrade to Premium"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Conditional: positive score → congratulations ── */}
                  {negativeResults.length === 0 &&
                    !scoreLoading &&
                    scanKeywords.length > 0 && (
                      <div
                        className="glass"
                        style={{
                          borderRadius: "0.75rem",
                          padding: "1.5rem",
                          marginTop: "1.25rem",
                          border: "1px solid rgba(76,175,80,0.3)",
                          textAlign: "center",
                          backgroundColor: "rgba(76,175,80,0.05)",
                        }}
                      >
                        <div
                          style={{
                            width: "3rem",
                            height: "3rem",
                            borderRadius: "50%",
                            backgroundColor: "rgba(76,175,80,0.12)",
                            border: "1px solid rgba(76,175,80,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 1rem",
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="#4CAF50"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <h3
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            color: "#4CAF50",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Congratulations!
                        </h3>
                        <p
                          style={{
                            fontSize: "0.9375rem",
                            color: "var(--color-muted)",
                            lineHeight: 1.65,
                          }}
                        >
                          Your online reputation looks great. We found no
                          significant negative content associated with your
                          name. Keep up the good work!
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* ── Tab: Contract ─────────────────────────────────────────────── */}
          <div
            style={{ display: activeTab === "contract" ? undefined : "none" }}
          >
            <div
              className="glass glow-border"
              style={{
                borderRadius: "0.875rem",
                padding: "2rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "0.375rem",
                }}
              >
                Removal Contracts
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-muted)",
                  marginBottom: "1.75rem",
                  lineHeight: 1.6,
                }}
              >
                Select one or more negative links from your scan results and
                submit a removal contract. Our team will file takedown requests
                on your behalf.
              </p>

              {/* Create contract form */}
              {availableForContract.length > 0 ? (
                <div
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--color-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    Select Links to Remove
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.625rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {(isPro
                      ? availableForContract
                      : availableForContract.slice(0, 3)
                    ).map((result, i) => {
                      const uiRisk = apiRiskToUi(result.risk);
                      const risk = RISK_COLORS[uiRisk];
                      const checked = selectedLinks.has(result.url);
                      return (
                        <label
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.875rem 1rem",
                            borderRadius: "0.5rem",
                            border: `1px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
                            backgroundColor: checked
                              ? "rgba(68,121,218,0.06)"
                              : "transparent",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleLink(result.url)}
                            style={{
                              marginTop: "0.2rem",
                              accentColor: "var(--color-primary)",
                              width: "1rem",
                              height: "1rem",
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                                marginBottom: "0.2rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.9375rem",
                                  fontWeight: 600,
                                  color: "var(--color-foreground)",
                                }}
                              >
                                {result.title}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  padding: "0.15rem 0.6rem",
                                  borderRadius: "9999px",
                                  backgroundColor: risk.bg,
                                  color: risk.color,
                                  border: `1px solid ${risk.border}`,
                                }}
                              >
                                {uiRisk}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                              }}
                            >
                              {result.url}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Blurred premium links */}
                  {availableForContract.length > 3 && !isPro && (
                    <div style={{ position: "relative", marginBottom: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.625rem",
                          filter: isPro ? "none" : "blur(4px)",
                          userSelect: isPro ? "auto" : "none",
                          pointerEvents: isPro ? "auto" : "none",
                        }}
                      >
                        {availableForContract.slice(3).map((result, i) => {
                          const uiRisk = apiRiskToUi(result.risk);
                          const risk = RISK_COLORS[uiRisk];
                          return (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.75rem",
                                padding: "0.875rem 1rem",
                                borderRadius: "0.5rem",
                                border: "1px solid var(--color-border)",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.2rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.9375rem",
                                      fontWeight: 600,
                                      color: "var(--color-foreground)",
                                    }}
                                  >
                                    {result.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "0.15rem 0.6rem",
                                      borderRadius: "9999px",
                                      backgroundColor: risk.bg,
                                      color: risk.color,
                                      border: `1px solid ${risk.border}`,
                                    }}
                                  >
                                    {uiRisk}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-primary)",
                                  }}
                                >
                                  {result.url}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          paddingTop: "1rem",
                          gap: "0.5rem",
                          borderRadius: "0.5rem",
                          backgroundColor: "rgba(10,10,20,0.55)",
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          stroke="var(--color-muted)"
                          viewBox="0 0 24 24"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            strokeWidth="2"
                          />
                          <path
                            d="M7 11V7a5 5 0 0110 0v4"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            color: "var(--color-foreground)",
                          }}
                        >
                          Premium — {availableForContract.length - 3} more link
                          {availableForContract.length - 3 !== 1 ? "s" : ""}{" "}
                          hidden
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <textarea
                    value={contractNotes}
                    onChange={(e) => setContractNotes(e.target.value)}
                    placeholder="Optional notes for our removal team…"
                    rows={3}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-foreground)",
                      fontSize: "0.875rem",
                      padding: "0.75rem 1rem",
                      resize: "vertical",
                      marginBottom: "1rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />

                  {contractSuccess && (
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#4CAF50",
                        marginBottom: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Contract submitted successfully!
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmitContract}
                    disabled={selectedLinks.size === 0 || contractSubmitting}
                    className={
                      selectedLinks.size > 0 && !contractSubmitting
                        ? "glow-button"
                        : ""
                    }
                    style={{
                      padding: "0.75rem 2rem",
                      borderRadius: "0.625rem",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      border:
                        selectedLinks.size === 0
                          ? "1px solid var(--color-border)"
                          : "none",
                      backgroundColor:
                        selectedLinks.size === 0
                          ? "var(--color-surface)"
                          : undefined,
                      color:
                        selectedLinks.size === 0
                          ? "var(--color-muted)"
                          : undefined,
                      cursor:
                        selectedLinks.size === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {contractSubmitting
                      ? "Submitting…"
                      : `Submit Contract (${selectedLinks.size} link${selectedLinks.size !== 1 ? "s" : ""})`}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "0.75rem",
                    marginBottom: "2rem",
                    color: "var(--color-muted)",
                    fontSize: "0.9375rem",
                  }}
                >
                  {negativeResults.length > 0
                    ? "All flagged links have already been submitted for removal."
                    : "No negative links found in your latest scan."}
                </div>
              )}

              {/* Existing contracts list */}
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "1rem",
                }}
              >
                Your Contracts
              </h3>

              {contractsLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "2rem",
                  }}
                >
                  <div
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      border: "2px solid var(--color-border)",
                      borderTopColor: "var(--color-primary)",
                      animation: "reput-spin 0.9s linear infinite",
                    }}
                  />
                </div>
              ) : myContracts.length === 0 ? (
                <p
                  style={{
                    color: "var(--color-muted)",
                    fontSize: "0.9375rem",
                    textAlign: "center",
                    padding: "1.5rem",
                  }}
                >
                  No contracts yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.875rem",
                  }}
                >
                  {myContracts.map((c) => {
                    const sc =
                      CONTRACT_STATUS_COLORS[c.status] ??
                      CONTRACT_STATUS_COLORS["pending"];
                    return (
                      <div
                        key={c.id}
                        className="glass"
                        style={{
                          borderRadius: "0.625rem",
                          padding: "1.25rem 1.5rem",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {new Date(c.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.25rem 0.75rem",
                              borderRadius: "9999px",
                              backgroundColor: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                              textTransform: "capitalize",
                            }}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.375rem",
                          }}
                        >
                          {c.links.map((link, li) => (
                            <div
                              key={li}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.1rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 600,
                                  color: "var(--color-foreground)",
                                }}
                              >
                                {link.title}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--color-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {link.url}
                              </span>
                            </div>
                          ))}
                        </div>
                        {c.notes && (
                          <p
                            style={{
                              marginTop: "0.625rem",
                              fontSize: "0.8125rem",
                              color: "var(--color-muted)",
                              fontStyle: "italic",
                            }}
                          >
                            {c.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* ── Tab: Meetings ──────────────────────────────────────────────────── */}
          <div style={{ display: activeTab === "meetings" ? undefined : "none" }}>
            <MeetingsTab active={activeTab === "meetings"} />
          </div>
        </div>
      </main>

      {/* ── Floating bottom navigation ─────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "0.625rem",
          zIndex: 50,
          padding: "0.375rem",
          borderRadius: "9999px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        }}
      >
        {(
          [
            { key: "score", label: "ReputScore" },
            // { key: "contract", label: "Contract" }, // hidden — code preserved below
            { key: "meetings", label: "Meetings" },
          ] as { key: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.875rem",
              transition: "all 0.2s",
              backgroundColor:
                activeTab === tab.key ? "var(--color-button)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "var(--color-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Footer />
    </div>
  );
}
