"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { Toast, useToast } from "@/components/common/Toast";
import ScheduleMeetingCTA, {
  CalModalButton,
} from "@/components/dashboard/ScheduleMeetingCTA";
import {
  auth,
  feedback,
  isAuthed,
  reputation,
  users,
  type ReputationScan,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const STATUS_MESSAGES = [
  "Scanning the web for mentions of you…",
  "Analyzing tone and context across sources…",
  "Weighing the impact of each result…",
  "Almost done — building your ReputScore…",
];

const DID_YOU_KNOW = [
  "Your online reputation influences hiring decisions, business partnerships, and financial opportunities.",
  "83% of people search someone's name online before a first meeting.",
  "A single negative article on page one of Google can cost you clients, deals, and trust.",
  "Most people have no idea what the internet says about them. You're already ahead.",
  "Your ReputScore is calculated across hundreds of sources — news, blogs, public records, and more.",
];

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

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [upgradingPro, setUpgradingPro] = useState(false);
  const [scanName, setScanName] = useState("");
  const [scanKeywords, setScanKeywords] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("");
  const [score, setScore] = useState(0);
  const [scanData, setScanData] = useState<ReputationScan | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [statusIdx, setStatusIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);
  const [tipVisible, setTipVisible] = useState(true);
  const [scanError, setScanError] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [expandedLinkIndex, setExpandedLinkIndex] = useState<number | null>(
    null,
  );

  const infoMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tipSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        setUserEmail(user.email);
        if (user.name) setScanName(user.name.toUpperCase());
        if (user.profile?.avatar_url) setAvatar(user.profile.avatar_url);
        setIsPro(
          user.plan === "pro" &&
            !!user.pro_trial_expires_at &&
            new Date(user.pro_trial_expires_at) > new Date(),
        );
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

          const searchFailed =
            linksRes.status === "rejected" ||
            !linksData ||
            "error" in (linksData as object) ||
            linksData.links == null;

          if (searchFailed) {
            setScanError(true);
            return;
          }

          const allLinks: LinkItem[] = linksData.links;

          if (scanResult) {
            const negCount = allLinks.filter((l) => {
              const text = `${l.title} ${l.snippet}`.toLowerCase();

              const keywordMatch =
                text.includes("indagato") ||
                text.includes("investigation") ||
                text.includes("incidente") ||
                text.includes("accident") ||
                text.includes("fraud") ||
                text.includes("lawsuit") ||
                text.includes("charged") ||
                text.includes("arrested");

              return (
                l.sentiment === "negative" ||
                l.risk === "high" ||
                l.risk === "medium" ||
                keywordMatch
              );
            }).length;
            const posCount = allLinks.filter(
              (l) => l.sentiment === "positive",
            ).length;
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
                high_risk: allLinks.filter((l) => l.risk === "high").length,
                medium_risk: allLinks.filter((l) => l.risk === "medium").length,
                low_risk: allLinks.filter((l) => l.risk === "low").length,
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
        setScanError(true);
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

  useEffect(() => {
    if (!scoreLoading) return;
    const id = setInterval(() => {
      setStatusVisible(false);
      if (statusSwapTimeoutRef.current) clearTimeout(statusSwapTimeoutRef.current);
      statusSwapTimeoutRef.current = setTimeout(() => {
        setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
        requestAnimationFrame(() => setStatusVisible(true));
      }, 500);
    }, 3000);
    return () => {
      clearInterval(id);
      if (statusSwapTimeoutRef.current) clearTimeout(statusSwapTimeoutRef.current);
    };
  }, [scoreLoading]);

  useEffect(() => {
    if (!scoreLoading) return;
    const id = setInterval(() => {
      setTipVisible(false);
      if (tipSwapTimeoutRef.current) clearTimeout(tipSwapTimeoutRef.current);
      tipSwapTimeoutRef.current = setTimeout(() => {
        setTipIdx((i) => (i + 1) % DID_YOU_KNOW.length);
        requestAnimationFrame(() => setTipVisible(true));
      }, 500);
    }, 5000);
    return () => {
      clearInterval(id);
      if (tipSwapTimeoutRef.current) clearTimeout(tipSwapTimeoutRef.current);
    };
  }, [scoreLoading]);

  if (!authed) return null;

  async function handleRecalculate() {
    sessionStorage.removeItem("reput_scan");
    localStorage.removeItem("reput_last_scan_name");
    localStorage.removeItem("reput_last_scan_keywords");
    try {
      const user = await auth.me();
      const currentKeywords: string[] = user.profile?.keywords ?? [];
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
      const linksData = linksRes.status === "fulfilled" ? linksRes.value : null;

      const searchFailed =
        linksRes.status === "rejected" ||
        !linksData ||
        "error" in (linksData as object) ||
        linksData.links == null;

      if (searchFailed) {
        setScanError(true);
        toast.show("Scan failed. Please try again.");
        return;
      }

      const allLinks: LinkItem[] = linksData.links;
      if (scanResult) {
        const negCount = allLinks.filter((l) => {
          const text = `${l.title} ${l.snippet}`.toLowerCase();
          return (
            l.sentiment === "negative" ||
            l.risk === "high" ||
            l.risk === "medium" ||
            [
              "indagato",
              "investigation",
              "incidente",
              "accident",
              "fraud",
              "lawsuit",
              "charged",
              "arrested",
            ].some((w) => text.includes(w))
          );
        }).length;
        const posCount = allLinks.filter(
          (l) => l.sentiment === "positive",
        ).length;
        const derivedScore = deriveScore(negCount, posCount);
        const merged = {
          ...scanResult,
          score: derivedScore,
          risk_level:
            derivedScore >= 86 ? "low" : derivedScore >= 61 ? "medium" : "high",
          results: allLinks.map((l) => ({ ...l, risk: l.risk as string })),
          summary: {
            total_results: allLinks.length,
            high_risk: allLinks.filter((l) => l.risk === "high").length,
            medium_risk: allLinks.filter((l) => l.risk === "medium").length,
            low_risk: allLinks.filter((l) => l.risk === "low").length,
          },
        };
        setScanData(merged);
        setScore(merged.score);
        setScanError(false);
        sessionStorage.setItem("reput_scan", JSON.stringify(merged));
        localStorage.setItem(
          "reput_last_scan_keywords",
          [...currentKeywords].sort().join(","),
        );
        localStorage.setItem("reput_last_scan_name", user.name ?? "");
      }
    } catch {
      setScanError(true);
      toast.show("Scan failed. Please try again.");
    }
  }

  async function handleUpgradePro() {
    setUpgradingPro(true);
    try {
      await users.startTrial();
    } catch {
      // 400 = already has a trial or already pro — treat as success
    } finally {
      setIsPro(true);
      setUpgradingPro(false);
    }
  }

  const negativeResults = scanData?.results ?? [];
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

      <main style={{ flex: 1, paddingTop: "4.5rem", paddingBottom: "2rem" }}>
        <div
          style={{
            maxWidth: "52rem",
            margin: "0 auto",
            padding: "1.5rem clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <div>
            <div
              className={`animate-scale-in${!scoreLoading ? "" : " glass glow-border"}`}
              style={{
                borderRadius: "0.875rem",
                padding: "2.5rem 2rem",
                textAlign: "center",
                minHeight: "24rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: !scoreLoading ? "center" : "flex-start",
              }}
            >
              {scanError && !scoreLoading ? (
                /* ── Error state ── */
                <div
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1.25rem",
                    padding: "2rem 1rem",
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#FF6B4A" strokeWidth="1.5" />
                    <path d="M12 7v5" stroke="#FF6B4A" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1" fill="#FF6B4A" />
                  </svg>
                  <p style={{ fontSize: "0.95rem", color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
                    Scan failed — we couldn&apos;t reach the search service.
                  </p>
                  <button
                    onClick={() => { setScanError(false); void handleRecalculate(); }}
                    style={{
                      padding: "0.45rem 1.25rem",
                      borderRadius: "0.625rem",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-muted)",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : scoreLoading ? (
                /* ── Loading state ── */
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
                  <style>{`
                    @keyframes reput-blob-morph {
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
                  `}</style>

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
                    {/* Wide diffuse aura */}
                    <div
                      style={{
                        position: "absolute",
                        width: "160px",
                        height: "160px",
                        borderRadius: "50%",
                        background:
                          "radial-gradient(ellipse at center, rgba(68,121,218,0.28) 0%, rgba(72,212,184,0.14) 45%, transparent 70%)",
                        filter: "blur(22px)",
                        animation:
                          "reput-aura-breathe 3.5s ease-in-out infinite",
                      }}
                    />

                    {/* Main morphing blob */}
                    <div
                      style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "44% 56% 53% 47% / 50% 46% 54% 50%",
                        background:
                          "linear-gradient(135deg, #48D4B8 0%, #4479DA 100%)",
                        boxShadow:
                          "0 0 40px rgba(68,121,218,0.5), 0 0 80px rgba(72,212,184,0.25), inset 0 0 30px rgba(72,212,184,0.2)",
                        animation: "reput-blob-morph 3s linear infinite",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {/* Specular highlight */}
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
                    We're calculating your ReputScore
                  </p>

                  {/* Rotating status message */}
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
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    {STATUS_MESSAGES[statusIdx]}
                  </p>

                  {/* Did you know tip box */}
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
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    >
                      {DID_YOU_KNOW[tipIdx]}
                    </p>
                  </div>
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
                      {(showAllKeywords
                        ? scanKeywords
                        : scanKeywords.slice(0, 3)
                      ).map((kw) => (
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
                      {scanKeywords.length > 3 && (
                        <button
                          onClick={() => setShowAllKeywords((v) => !v)}
                          style={{
                            padding: "0.4rem 0.9rem",
                            borderRadius: "0.625rem",
                            backgroundColor: "rgba(68,121,218,0.08)",
                            border: "1px solid rgba(68,121,218,0.22)",
                            color: "#4479DA",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            letterSpacing: "0.01em",
                            transition: "background 0.15s",
                          }}
                        >
                          {showAllKeywords ? (
                            <>
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
                                <path d="M18 15l-6-6-6 6" />
                              </svg>
                              Show less
                            </>
                          ) : (
                            <>
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
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                              {scanKeywords.length - 3} more
                            </>
                          )}
                        </button>
                      )}
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
                          const domain = (() => {
                            try {
                              return new URL(result.url).hostname.replace(
                                "www.",
                                "",
                              );
                            } catch {
                              return result.source ?? "";
                            }
                          })();
                          const idx = String(i + 1).padStart(2, "0");
                          const isExpanded = expandedLinkIndex === i;
                          return (
                            <div
                              key={i}
                              className="link-card"
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
                                setExpandedLinkIndex(isExpanded ? null : i)
                              }
                            >
                              {/* Left accent */}
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
                                {/* Meta row */}
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
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                      minWidth: 0,
                                      flex: 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily:
                                          "ui-monospace, 'SF Mono', monospace",
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.08em",
                                        color: risk.color,
                                        opacity: 0.7,
                                        flexShrink: 0,
                                      }}
                                    >
                                      #{idx}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily:
                                          "ui-monospace, 'SF Mono', monospace",
                                        fontSize: "0.65rem",
                                        fontWeight: 600,
                                        color: "var(--color-muted)",
                                        background: "rgba(0,0,0,0.04)",
                                        padding: "0.1rem 0.45rem",
                                        borderRadius: "4px",
                                        border: "1px solid var(--color-border)",
                                        letterSpacing: "0.02em",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        minWidth: 0,
                                      }}
                                    >
                                      {domain}
                                    </span>
                                  </div>
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
                                          "ui-monospace, 'SF Mono', monospace",
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

                                {/* Title + open link */}
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
                                    {result.title}
                                  </p>
                                  <a
                                    href={result.url}
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

                                {/* Snippet — accordion */}
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
                                      {result.snippet}
                                    </p>
                                  </>
                                )}
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
                              filter: "blur(4px)",
                              userSelect: "none",
                              pointerEvents: "none",
                              maxHeight: "11rem",
                              overflow: "hidden",
                            }}
                          >
                            {blurredNegativeLinks
                              .slice(0, 2)
                              .map((result, i) => {
                                const uiRisk = apiRiskToUi(result.risk);
                                const risk = RISK_COLORS[uiRisk];
                                const domain = (() => {
                                  try {
                                    return new URL(result.url).hostname.replace(
                                      "www.",
                                      "",
                                    );
                                  } catch {
                                    return result.source ?? "";
                                  }
                                })();
                                const idx = String(
                                  visibleNegativeLinks.length + i + 1,
                                ).padStart(2, "0");
                                return (
                                  <div
                                    key={i}
                                    style={{
                                      display: "flex",
                                      borderRadius: "0.75rem",
                                      overflow: "hidden",
                                      border: `1px solid ${risk.border}`,
                                      background: `linear-gradient(135deg, ${risk.bg} 0%, rgba(255,255,255,0) 60%)`,
                                    }}
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
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                            minWidth: 0,
                                            flex: 1,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontFamily:
                                                "ui-monospace, 'SF Mono', monospace",
                                              fontSize: "0.6rem",
                                              fontWeight: 700,
                                              color: risk.color,
                                              opacity: 0.7,
                                              flexShrink: 0,
                                            }}
                                          >
                                            #{idx}
                                          </span>
                                          <span
                                            style={{
                                              fontFamily:
                                                "ui-monospace, 'SF Mono', monospace",
                                              fontSize: "0.65rem",
                                              fontWeight: 600,
                                              color: "var(--color-muted)",
                                              background: "rgba(0,0,0,0.04)",
                                              padding: "0.1rem 0.45rem",
                                              borderRadius: "4px",
                                              border:
                                                "1px solid var(--color-border)",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              minWidth: 0,
                                            }}
                                          >
                                            {domain}
                                          </span>
                                        </div>
                                        <span
                                          style={{
                                            flexShrink: 0,
                                            fontFamily:
                                              "ui-monospace, 'SF Mono', monospace",
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
                                      </div>
                                      <p
                                        style={{
                                          fontSize: "0.875rem",
                                          fontWeight: 700,
                                          color: "var(--color-foreground)",
                                          lineHeight: 1.35,
                                          margin: "0 0 0.4rem",
                                          letterSpacing: "-0.01em",
                                        }}
                                      >
                                        {result.title}
                                      </p>
                                      <div
                                        style={{
                                          height: "1px",
                                          background: `linear-gradient(90deg, ${risk.border} 0%, transparent 80%)`,
                                          marginBottom: "0.4rem",
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
                                        {result.snippet}
                                      </p>
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

                  {/* CTA after congratulations */}
                  {negativeResults.length !== 0 &&
                    !scoreLoading &&
                    scanKeywords.length > 0 &&
                    scanData && (
                      <ScheduleMeetingCTA
                        score={score}
                        totalLinks={scanData.summary.total_results}
                        hasNegative={false}
                      />
                    )}

                  {/* ── Ealixir Services — shown only when ReputScore is Good (86+) ── */}
                  {score >= 86 && !scoreLoading && scanKeywords.length > 0 && (
                    <div style={{ marginTop: "2rem", textAlign: "left" }}>
                      <div style={{ marginBottom: "1rem" }}>
                        <p
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--color-muted)",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Elevate further
                        </p>
                        <h2
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: 800,
                            color: "var(--color-foreground)",
                            letterSpacing: "-0.02em",
                            margin: 0,
                          }}
                        >
                          Recommended for you
                        </h2>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {/* ── Ealixir Story ── */}
                        <div
                          style={{
                            borderRadius: "1.25rem",
                            overflow: "hidden",
                            background:
                              "linear-gradient(135deg, #4a8fd4 0%, #3aafc4 50%, #2fb8b0 100%)",
                            padding: "1.5rem",
                            color: "#fff",
                            boxShadow: "0 4px 24px rgba(74,143,212,0.25)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              marginBottom: "1rem",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: 800,
                                margin: 0,
                                color: "#fff",
                              }}
                            >
                              <span style={{ opacity: 0.9 }}>
                                Ealixir Story
                              </span>
                            </p>
                            <div
                              style={{
                                width: "2.75rem",
                                height: "2.75rem",
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                width="18"
                                height="18"
                                fill="none"
                                stroke="#fff"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                                />
                              </svg>
                            </div>
                          </div>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "rgba(255,255,255,0.88)",
                              lineHeight: 1.7,
                              margin: "0 0 1.25rem",
                            }}
                          >
                            Shape how you appear across media and search. We
                            create and place tailored content across selected
                            publications to build a consistent, credible
                            narrative around your name.
                          </p>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <CalModalButton
                              calLink={
                                process.env.NEXT_PUBLIC_CAL_STORY_LINK ?? ""
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "#3a9fb8",
                                cursor: "pointer",
                                padding: "0.6rem 1.25rem",
                                borderRadius: "9999px",
                                border: "none",
                                background: "#fff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                              }}
                            >
                              Schedule a meeting
                            </CalModalButton>
                          </div>
                        </div>

                        {/* ── Ealixir Editions ── */}
                        <div
                          style={{
                            borderRadius: "1.25rem",
                            overflow: "hidden",
                            background:
                              "linear-gradient(135deg, #4a8fd4 0%, #3aafc4 50%, #2fb8b0 100%)",
                            padding: "1.5rem",
                            color: "#fff",
                            boxShadow: "0 4px 24px rgba(74,143,212,0.25)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              marginBottom: "1rem",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: 800,
                                margin: 0,
                                color: "#fff",
                              }}
                            >
                              <span style={{ opacity: 0.9 }}>
                                Ealixir Editions
                              </span>
                            </p>
                            <div
                              style={{
                                width: "2.75rem",
                                height: "2.75rem",
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                width="18"
                                height="18"
                                fill="none"
                                stroke="#fff"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                              </svg>
                            </div>
                          </div>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "rgba(255,255,255,0.88)",
                              lineHeight: 1.7,
                              margin: "0 0 1.25rem",
                            }}
                          >
                            Turn your narrative into a lasting asset. We create
                            and publish high-quality books designed to elevate
                            your positioning, strengthen credibility and
                            establish long-term authority.
                          </p>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <CalModalButton
                              calLink={
                                process.env.NEXT_PUBLIC_CAL_EDITION_LINK ?? ""
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "#3a9fb8",
                                cursor: "pointer",
                                padding: "0.6rem 1.25rem",
                                borderRadius: "9999px",
                                border: "none",
                                background: "#fff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                              }}
                            >
                              Schedule a meeting
                            </CalModalButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ── Feedback form ─────────────────────────────────────────────────── */}
                  {!scoreLoading && scanKeywords.length > 0 && (
                    <div
                      style={{
                        margin: "0 auto",
                        marginTop: "2rem",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: "1rem",
                          overflow: "hidden",
                          border: "1px solid var(--color-border)",
                          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                        }}
                      >
                        {/* Card header */}
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg, #4479DA 0%, #48D4B8 100%)",
                            padding: "1.25rem 1.5rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: "2rem",
                              height: "2rem",
                              borderRadius: "50%",
                              backgroundColor: "rgba(255,255,255,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="#fff"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.75)",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                marginBottom: "0.1rem",
                              }}
                            >
                              Feedback
                            </p>
                            <p
                              style={{
                                fontSize: "0.9375rem",
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              We&apos;d love to hear your thoughts
                            </p>
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="glass" style={{ padding: "1.5rem" }}>
                          {feedbackSubmitted ? (
                            <div
                              style={{ textAlign: "center", padding: "1rem 0" }}
                            >
                              <div
                                style={{
                                  width: "2.75rem",
                                  height: "2.75rem",
                                  borderRadius: "50%",
                                  backgroundColor: "rgba(72,212,184,0.12)",
                                  border: "1px solid rgba(72,212,184,0.3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto 0.875rem",
                                }}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  fill="none"
                                  stroke="#48D4B8"
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
                              <p
                                style={{
                                  fontSize: "0.9375rem",
                                  fontWeight: 600,
                                  color: "var(--color-foreground)",
                                }}
                              >
                                Thank you for your feedback!
                              </p>
                              <p
                                style={{
                                  fontSize: "0.8125rem",
                                  color: "var(--color-muted)",
                                  marginTop: "0.25rem",
                                }}
                              >
                                We appreciate you taking the time.
                              </p>
                            </div>
                          ) : (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setFeedbackSubmitting(true);
                                try {
                                  await feedback.submit(
                                    feedbackText.trim(),
                                    userEmail || undefined,
                                  );
                                  setFeedbackSubmitted(true);
                                  setFeedbackText("");
                                  setTimeout(
                                    () => setFeedbackSubmitted(false),
                                    5000,
                                  );
                                } catch {
                                  toast.show(
                                    "Something went wrong. Please try again.",
                                  );
                                } finally {
                                  setFeedbackSubmitting(false);
                                }
                              }}
                            >
                              <textarea
                                required
                                value={feedbackText}
                                onChange={(e) =>
                                  setFeedbackText(e.target.value)
                                }
                                placeholder="Share your experience, suggestions, or anything on your mind..."
                                rows={4}
                                style={{
                                  width: "100%",
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "0.625rem",
                                  padding: "0.75rem 1rem",
                                  color: "var(--color-foreground)",
                                  fontSize: "0.875rem",
                                  lineHeight: 1.6,
                                  resize: "vertical",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                              <button
                                type="submit"
                                disabled={feedbackSubmitting}
                                className="glow-button"
                                style={{
                                  marginTop: "0.875rem",
                                  width: "100%",
                                  padding: "0.75rem",
                                  borderRadius: "0.625rem",
                                  border: "none",
                                  fontSize: "0.875rem",
                                  fontWeight: 700,
                                  cursor: feedbackSubmitting
                                    ? "default"
                                    : "pointer",
                                  opacity: feedbackSubmitting ? 0.7 : 1,
                                  transition: "opacity 0.2s",
                                }}
                              >
                                {feedbackSubmitting
                                  ? "Sending…"
                                  : "Send Feedback"}
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Floating bottom navigation — hidden (only one tab remains) ──── */}

      <Footer />
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
