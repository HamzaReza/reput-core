"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { isAuthed, reputation, auth, type ReputationScan } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tab = "score" | "links" | "contract";
type RiskLevel = "Negative" | "Poor" | "Mediocre" | "Good";

interface ScanResult {
  site: string;
  url: string;
  title: string;
  snippet: string;
  risk: RiskLevel;
}

function apiRiskToUi(risk: string): RiskLevel {
  if (risk === "high") return "Negative";
  if (risk === "medium") return "Poor";
  if (risk === "low") return "Good";
  return "Mediocre";
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

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Negative", color: "#FF6B4A" };
  if (score >= 50) return { label: "Poor", color: "#FF8C00" };
  if (score >= 25) return { label: "Mediocre", color: "#FFD600" };
  return { label: "Good", color: "#4CAF50" };
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
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={s.x}
          y1={cy}
          x2={e.x}
          y2={cy}
        >
          <stop offset="0%" stopColor="#4CAF50" />
          <stop offset="30%" stopColor="#C8D600" />
          <stop offset="55%" stopColor="#FFD600" />
          <stop offset="75%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#FF3D00" />
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

      {/* Colored arc — animates drawing in */}
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
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [scanName, setScanName] = useState("");
  const [scanKeywords, setScanKeywords] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("");
  const [score, setScore] = useState(0);
  const [scanData, setScanData] = useState<ReputationScan | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);

  const [listRequested, setListRequested] = useState(false);
  const [linkListPending, setLinkListPending] = useState(false);
  const [linkListHasNegatives, setLinkListHasNegatives] = useState<
    boolean | null
  >(null);
  const [infoPending, setInfoPending] = useState(false);
  const linkListTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/auth");
      return;
    }
    setAuthed(true);

    // Load cached user info
    try {
      const n = localStorage.getItem("reput_name");
      const k = localStorage.getItem("reput_keywords");
      const a = localStorage.getItem("reput_avatar");
      if (n) setScanName(n.toUpperCase());
      if (k) setScanKeywords(k.split(",").map((s) => s.trim()).filter(Boolean));
      if (a) setAvatar(a);

    } catch {}

    // Fetch user + latest scan from API
    const loadData = async () => {
      try {
        const [user, latestScan] = await Promise.all([
          auth.me(),
          reputation.getLatest(),
        ]);
        if (user.name) setScanName(user.name.toUpperCase());
        if (user.profile?.keywords?.length) setScanKeywords(user.profile.keywords);
        if (user.profile?.avatar_url) setAvatar(user.profile.avatar_url);

        if (latestScan) {
          setScanData(latestScan);
          setScore(latestScan.score);
        } else {
          // No scan yet — trigger the first one
          const newScan = await reputation.triggerScan();
          setScanData(newScan);
          setScore(newScan.score);
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
      if (linkListTimeoutRef.current) clearTimeout(linkListTimeoutRef.current);
      if (infoMoreTimeoutRef.current) clearTimeout(infoMoreTimeoutRef.current);
    };
  }, []);

  const requestLinkList = async () => {
    if (linkListPending) return;
    setLinkListPending(true);
    try {
      const newScan = await reputation.triggerScan();
      setScanData(newScan);
      setScore(newScan.score);
      const hasNegatives = newScan.summary.high_risk > 0 || newScan.summary.medium_risk > 0;
      setLinkListHasNegatives(hasNegatives);
      setListRequested(true);
    } catch {
      setLinkListHasNegatives(true);
      setListRequested(true);
    } finally {
      setLinkListPending(false);
    }
  };

  const requestMoreInfo = async () => {
    if (infoPending) return;
    setInfoPending(true);
    try {
      const newScan = await reputation.triggerScan();
      setScanData(newScan);
      setScore(newScan.score);
      setLinkListHasNegatives(newScan.summary.high_risk > 0 || newScan.summary.medium_risk > 0);
    } catch {
      setLinkListHasNegatives(true);
    } finally {
      setInfoPending(false);
    }
  };

  if (!authed) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "score", label: "ReputScore" },
    { key: "links", label: "Link List" },
    { key: "contract", label: "Contract" },
  ];

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
      <main style={{ flex: 1, paddingTop: "4.5rem" }}>
        <div
          style={{
            maxWidth: "52rem",
            margin: "0 auto",
            padding: "1.5rem clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          {/* Tab bar */}
          <div
            className="glass"
            style={{
              display: "flex",
              borderRadius: "0.625rem",
              padding: "0.25rem",
              marginBottom: "2rem",
              border: "1px solid var(--color-border)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  transition: "all 0.2s",
                  backgroundColor:
                    activeTab === tab.key
                      ? "var(--color-button)"
                      : "transparent",
                  color: activeTab === tab.key ? "#fff" : "var(--color-muted)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: ReputScore ─────────────────────────────────────────── */}
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
                  {/* Spinner */}
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
                      <svg width="40" height="40" fill="none" stroke="var(--color-muted)" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" strokeWidth="2" />
                        <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
                      </svg>
                      <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-foreground)" }}>
                        No keywords added yet
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", maxWidth: "22rem" }}>
                        Add keywords in{" "}
                        <a href="/settings" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
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

                      {/* Score label — pulled up to overlap the arc gap */}
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
                          {score}%
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
                </div>
              )}
            </div>
          </div>

          {/* ── Tab: Link List ─────────────────────────────── */}
          <div style={{ display: activeTab === "links" ? undefined : "none" }}>
            {(() => {
              const disabledBtn: React.CSSProperties = {
                width: "100%",
                padding: "0.75rem 2rem",
                borderRadius: "0.625rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.05em",
                border: "1px solid var(--color-border)",
                backgroundColor: "#f1f5f9",
                color: "var(--color-muted)",
                cursor: "not-allowed",
              };
              const activeBtn: React.CSSProperties = {
                width: "100%",
                padding: "0.75rem 2rem",
                borderRadius: "0.625rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
              };

              /* ── Scenario 1: list not yet requested ── */
              if (!listRequested)
                return (
                  <div
                    className="glass glow-border"
                    style={{
                      borderRadius: "0.875rem",
                      padding: "2.5rem 2rem",
                      textAlign: "center",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--color-foreground)",
                        marginBottom: "1.25rem",
                      }}
                    >
                      Link List
                    </h2>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "0.75rem",
                      }}
                    >
                      If you are interested in accessing a comprehensive list of
                      all the{" "}
                      <strong style={{ color: "var(--color-foreground)" }}>
                        negative articles
                      </strong>{" "}
                      and mentions{" "}
                      <strong style={{ color: "var(--color-foreground)" }}>
                        related to your name or brand
                      </strong>
                      , we can provide it to you.
                    </p>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "0.75rem",
                      }}
                    >
                      Simply click the button below to{" "}
                      <strong style={{ color: "var(--color-foreground)" }}>
                        request the link list
                      </strong>
                      . Please allow us a few days to provide you with a
                      comprehensive negative link list.
                    </p>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "2rem",
                      }}
                    >
                      This will allow you to stay informed about any negative
                      publicity or mentions concerning your name or your
                      company.
                    </p>
                    <button
                      type="button"
                      onClick={requestLinkList}
                      disabled={linkListPending}
                      className={linkListPending ? "" : "glow-button"}
                      style={linkListPending ? disabledBtn : activeBtn}
                    >
                      {linkListPending ? "Please wait…" : "Request Link List"}
                    </button>
                  </div>
                );

              /* ── Scenario 2: list returned, 0 negatives ── */
              if (linkListHasNegatives === false)
                return (
                  <div
                    className="glass glow-border"
                    style={{
                      borderRadius: "0.875rem",
                      padding: "2.5rem 2rem",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "3.5rem",
                        height: "3.5rem",
                        borderRadius: "50%",
                        backgroundColor: "rgba(68,121,218,0.08)",
                        border: "1px solid rgba(68,121,218,0.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem",
                      }}
                    >
                      <svg
                        width="22"
                        height="22"
                        fill="none"
                        stroke="var(--color-primary)"
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
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--color-foreground)",
                        marginBottom: "1.25rem",
                      }}
                    >
                      Congratulations!
                    </h2>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "0.75rem",
                      }}
                    >
                      We did not find any negative links or articles regarding
                      you.
                    </p>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "0.75rem",
                      }}
                    >
                      Although if there is no information about you online it
                      may still be a problem.
                    </p>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        marginBottom: "2rem",
                      }}
                    >
                      It&apos;s important to be visible online. If interested,
                      click the button below and we will contact you via email.
                    </p>
                    <button
                      type="button"
                      onClick={requestMoreInfo}
                      disabled={infoPending}
                      className={infoPending ? "" : "glow-button"}
                      style={infoPending ? disabledBtn : activeBtn}
                    >
                      {infoPending ? "Requested" : "Request More Information"}
                    </button>
                  </div>
                );

              /* ── Scenario 3: list returned, negatives found ── */
              if (linkListHasNegatives === true)
                return (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      {[
                        {
                          label: "Total Found",
                          value: scanData?.summary?.total_results ?? 0,
                          color: "var(--color-primary)",
                        },
                        {
                          label: "Negative",
                          value: scanData?.summary?.high_risk ?? 0,
                          color: "#FF6B4A",
                        },
                        {
                          label: "Poor",
                          value: scanData?.summary?.medium_risk ?? 0,
                          color: "#FF8C00",
                        },
                        {
                          label: "Good",
                          value: scanData?.summary?.low_risk ?? 0,
                          color: "#4CAF50",
                        },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className="glass glow-border"
                          style={{
                            borderRadius: "0.75rem",
                            padding: "1rem 1.25rem",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "1.75rem",
                              fontWeight: 700,
                              color,
                              lineHeight: 1,
                            }}
                          >
                            {value}
                          </p>
                          <p
                            style={{
                              color: "var(--color-muted)",
                              fontSize: "0.75rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.875rem",
                      }}
                    >
                      {(scanData?.results ?? []).map((result, i) => {
                        const uiRisk = apiRiskToUi(result.risk);
                        const risk = RISK_COLORS[uiRisk];
                        return (
                          <div
                            key={i}
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
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: "1rem",
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
                                    marginBottom: "0.5rem",
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
                  </>
                );

              return null;
            })()}
          </div>

          {/* ── Tab: Contract ────────────────────────────────────────────── */}
          <div style={{ display: activeTab === "contract" ? undefined : "none" }}>
            <div
              className="glass glow-border"
              style={{
                borderRadius: "0.875rem",
                padding: "2.5rem 2rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(68,121,218,0.08)",
                  border: "1px solid rgba(68,121,218,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  stroke="var(--color-primary)"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <h2
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "0.75rem",
                }}
              >
                Ready to remove the damage?
              </h2>
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.65,
                  marginBottom: "2rem",
                  maxWidth: "28rem",
                  margin: "0 auto 2rem",
                }}
              >
                Your scan found{" "}
                <strong style={{ color: "#FF6B4A" }}>6 negative links</strong> —
                including 2 Critical results. Our removal team can file takedown
                requests and suppress harmful content within days.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
                  gap: "1rem",
                  marginBottom: "2rem",
                  textAlign: "left",
                }}
              >
                {[
                  {
                    label: "Links to remove",
                    value: "6",
                    color: "var(--color-primary)",
                  },
                  {
                    label: "Avg. removal time",
                    value: "3–7 days",
                    color: "var(--color-primary)",
                  },
                  {
                    label: "Google de-indexing",
                    value: "Included",
                    color: "#00E676",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: "0.625rem",
                      padding: "1rem 1.25rem",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {value}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-muted)",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/quote/request"
                className="glow-button"
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  fontWeight: 700,
                  padding: "0.875rem 2.5rem",
                  borderRadius: "0.625rem",
                  fontSize: "1rem",
                }}
              >
                Request Removal Service →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
