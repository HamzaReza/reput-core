"use client";

import Header from "@/components/common/Header";
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

const MOCK_RESULTS: ScanResult[] = [
  {
    site: "reddit.com",
    url: "reddit.com/r/complaints/comments/xk91a2",
    title: "Avoid doing business — multiple complaints filed",
    snippet:
      "Several users have reported fraudulent behaviour and unresolved disputes. Thread has 240 upvotes and 80+ comments...",
    risk: "Negative",
  },
  {
    site: "trustpilot.com",
    url: "trustpilot.com/review/example-profile",
    title: '1-star review: "Complete scam, lost money"',
    snippet:
      "Verified review from October 2024. Reviewer claims services were never delivered after payment was made...",
    risk: "Negative",
  },
  {
    site: "ripoffreport.com",
    url: "ripoffreport.com/reports/detail/112984",
    title: "Rip-off Report: Misleading claims and no refunds",
    snippet:
      "Filed report alleges intentional misrepresentation. Report has been indexed on Google for 14 months...",
    risk: "Poor",
  },
  {
    site: "twitter.com",
    url: "twitter.com/user/status/1749302918",
    title: 'Viral tweet: "Warning — do NOT hire this person"',
    snippet:
      "Tweet received 1.2K retweets and 3.4K likes. Contains name alongside fraud allegations and screenshots...",
    risk: "Poor",
  },
  {
    site: "glassdoor.com",
    url: "glassdoor.com/Reviews/company-review-12345",
    title: "Former employee review: toxic environment, false promises",
    snippet:
      "One-star Glassdoor review describing unethical management practices. Currently ranking page 1 on Google...",
    risk: "Mediocre",
  },
  {
    site: "quora.com",
    url: "quora.com/Is-this-company-a-scam",
    title: 'Quora thread: "Is this a scam?"',
    snippet:
      "Multiple answers confirm negative experiences. Thread has 4,800 views and appears in top 10 search results...",
    risk: "Good",
  },
];

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

const SCORE = Math.floor(Math.random() * 100);

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
  const r = 112; // arc radius
  const arcStroke = 22;
  const avatarR = 62; // avatar size

  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, radius: number) => ({
    x: cx + radius * Math.cos(toRad(deg)),
    y: cy - radius * Math.sin(toRad(deg)),
  });

  // 240° horseshoe: start at 210° (7-o'clock, green) → CW → 330° (5-o'clock, red)
  const s = pt(210, r);
  const e = pt(330, r);

  // Needle: 0% = 210°, 100% = 330° going clockwise (decreasing math angle)
  const needleAngle = 210 - (score / 100) * 240;
  const nRad = toRad(needleAngle);

  // Dart tip: near inner edge of arc, base: at avatar rim
  const tipLen = r - arcStroke / 2 - 4;
  const baseLen = avatarR + 1;
  const hw = 14; // half-width of dart base

  const tx = cx + tipLen * Math.cos(nRad);
  const ty = cy - tipLen * Math.sin(nRad);
  const bx = cx + baseLen * Math.cos(nRad);
  const by = cy - baseLen * Math.sin(nRad);

  // Perpendicular in SVG coords: rotate needle dir 90° CCW → (sin θ, cos θ)
  const p1 = { x: bx + hw * Math.sin(nRad), y: by + hw * Math.cos(nRad) };
  const p2 = { x: bx - hw * Math.sin(nRad), y: by - hw * Math.cos(nRad) };

  const pad = arcStroke / 2 + 10;
  const vb = `${cx - r - pad} ${cy - r - pad} ${(r + pad) * 2} ${(r + pad) * 2}`;

  return (
    <svg
      viewBox={vb}
      width="100%"
      style={{ maxWidth: "21rem", display: "block", margin: "0 auto" }}
    >
      <defs>
        {/* Gradient along the arc direction (left→right roughly) */}
        <linearGradient
          id="gaugeGrad"
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
        <clipPath id="avatarClip">
          <circle cx={cx} cy={cy} r={avatarR} />
        </clipPath>
      </defs>

      {/* Thin full grey ring behind everything */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(200,215,230,0.13)"
        strokeWidth={arcStroke}
      />

      {/* Colored 240° horseshoe arc (large-arc=1, sweep=1 = clockwise in SVG) */}
      <path
        d={`M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth={arcStroke}
        strokeLinecap="round"
      />

      {/* Avatar background disc */}
      <circle cx={cx} cy={cy} r={avatarR + 4} fill="#0A0E1A" />

      {/* Avatar content */}
      {avatar ? (
        <image
          href={avatar}
          x={cx - avatarR}
          y={cy - avatarR}
          width={avatarR * 2}
          height={avatarR * 2}
          clipPath="url(#avatarClip)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={avatarR} fill="rgba(150,175,210,0.1)" />
          {/* Silhouette head */}
          <circle
            cx={cx}
            cy={cy - avatarR * 0.25}
            r={avatarR * 0.29}
            fill="rgba(150,175,210,0.38)"
          />
          {/* Silhouette body */}
          <ellipse
            cx={cx}
            cy={cy + avatarR * 0.58}
            rx={avatarR * 0.52}
            ry={avatarR * 0.37}
            fill="rgba(150,175,210,0.38)"
          />
        </>
      )}

      {/* Avatar rim ring */}
      <circle
        cx={cx}
        cy={cy}
        r={avatarR}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={2}
      />

      {/* Dart arrow: straight sides, rounded base (arc away from tip, sweep=1) */}
      <path
        d={[
          `M ${tx.toFixed(2)} ${ty.toFixed(2)}`,
          `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
          `A ${hw} ${hw} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
          `Z`,
        ].join(" ")}
        fill="#4A6FA5"
      />
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
  const [listRequested, setListRequested] = useState(false);
  const [linkListPending, setLinkListPending] = useState(false);
  const [linkListHasNegatives, setLinkListHasNegatives] = useState<
    boolean | null
  >(null);
  const [infoPending, setInfoPending] = useState(false);
  const linkListTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("reput_authed") !== "true") {
        router.replace("/auth");
        return;
      }
      setAuthed(true);
      const n = localStorage.getItem("reput_name");
      const k = localStorage.getItem("reput_keywords");
      if (n) setScanName(n.toUpperCase());
      if (k)
        setScanKeywords(
          k
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      const a = localStorage.getItem("reput_avatar");
      if (a) setAvatar(a);
      if (localStorage.getItem("reput_list_requested") === "true") {
        setListRequested(true);
        const outcome = localStorage.getItem("reput_link_list_has_negatives");
        if (outcome === "true") setLinkListHasNegatives(true);
        else if (outcome === "false") setLinkListHasNegatives(false);
        else setLinkListHasNegatives(true);
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    return () => {
      if (linkListTimeoutRef.current) clearTimeout(linkListTimeoutRef.current);
      if (infoMoreTimeoutRef.current) clearTimeout(infoMoreTimeoutRef.current);
    };
  }, []);

  const requestLinkList = () => {
    if (linkListPending) return;
    setLinkListPending(true);
    if (linkListTimeoutRef.current) clearTimeout(linkListTimeoutRef.current);
    linkListTimeoutRef.current = setTimeout(() => {
      linkListTimeoutRef.current = null;
      const hasNegatives = Math.random() < 0.5;
      try {
        localStorage.setItem("reput_list_requested", "true");
        localStorage.setItem(
          "reput_link_list_has_negatives",
          hasNegatives ? "true" : "false",
        );
      } catch {}
      setLinkListHasNegatives(hasNegatives);
      setListRequested(true);
      setLinkListPending(false);
    }, 2500);
  };

  const requestMoreInfo = () => {
    if (infoPending) return;
    setInfoPending(true);
    if (infoMoreTimeoutRef.current) clearTimeout(infoMoreTimeoutRef.current);
    infoMoreTimeoutRef.current = setTimeout(() => {
      infoMoreTimeoutRef.current = null;
      const hasNegatives = Math.random() < 0.5;
      try {
        localStorage.setItem(
          "reput_link_list_has_negatives",
          hasNegatives ? "true" : "false",
        );
      } catch {}
      setLinkListHasNegatives(hasNegatives);
      setInfoPending(false);
    }, 2500);
  };

  if (!authed) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "score", label: "ReputScore" },
    { key: "links", label: "Reputation Content" },
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
            padding: "2rem 1.5rem",
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
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  borderRadius: "0.4rem",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  transition: "all 0.2s",
                  backgroundColor:
                    activeTab === tab.key ? "#4ECDC4" : "transparent",
                  color: activeTab === tab.key ? "#000" : "var(--color-muted)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: ReputScore ─────────────────────────────────────────── */}
          {activeTab === "score" && (
            <div
              className="glass glow-border"
              style={{
                borderRadius: "0.875rem",
                padding: "2.5rem 2rem",
                textAlign: "center",
              }}
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

              {/* Gauge */}
              <RepuGauge
                score={SCORE}
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
                  backgroundColor: "#12161f",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: scoreLabel(SCORE).color,
                    lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}
                >
                  {SCORE}%
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: scoreLabel(SCORE).color,
                    textTransform: "uppercase",
                  }}
                >
                  {scoreLabel(SCORE).label}
                </p>
              </div>

              {/* Keywords */}
              <div
                className="glass"
                style={{
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  marginTop: "1.25rem",
                  border: "1px solid rgba(255,255,255,0.07)",
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
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}
                >
                  {scanKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        padding: "0.5rem 1.25rem",
                        borderRadius: "0.5rem",
                        backgroundColor: "rgba(78,205,196,0.08)",
                        border: "1px solid rgba(78,205,196,0.2)",
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

          {/* ── Tab: Reputation Content ─────────────────────────────── */}
          {activeTab === "links" &&
            (() => {
              const disabledBtn: React.CSSProperties = {
                width: "100%",
                padding: "0.75rem 2rem",
                borderRadius: "0.5rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.05em",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "var(--color-muted)",
                cursor: "not-allowed",
              };
              const activeBtn: React.CSSProperties = {
                width: "100%",
                padding: "0.75rem 2rem",
                borderRadius: "0.5rem",
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
                      Reputation Content
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
                        backgroundColor: "rgba(78,205,196,0.1)",
                        border: "1px solid rgba(78,205,196,0.3)",
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
                        stroke="#4ECDC4"
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
                          "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      {[
                        {
                          label: "Total Found",
                          value: MOCK_RESULTS.length,
                          color: "#4ECDC4",
                        },
                        {
                          label: "Negative",
                          value: MOCK_RESULTS.filter(
                            (r) => r.risk === "Negative",
                          ).length,
                          color: "#FF6B4A",
                        },
                        {
                          label: "Poor",
                          value: MOCK_RESULTS.filter((r) => r.risk === "Poor")
                            .length,
                          color: "#FF8C00",
                        },
                        {
                          label: "Mediocre",
                          value: MOCK_RESULTS.filter(
                            (r) => r.risk === "Mediocre",
                          ).length,
                          color: "#FFD600",
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
                      {MOCK_RESULTS.map((result, i) => {
                        const risk = RISK_COLORS[result.risk];
                        return (
                          <div
                            key={i}
                            className="glass"
                            style={{
                              borderRadius: "0.625rem",
                              padding: "1.25rem 1.5rem",
                              border: "1px solid rgba(255,255,255,0.07)",
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
                                  href={`https://${result.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    fontSize: "0.75rem",
                                    color: "#4ECDC4",
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
                                {result.risk}
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

          {/* ── Tab: Contract ────────────────────────────────────────────── */}
          {activeTab === "contract" && (
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
                  backgroundColor: "rgba(78,205,196,0.1)",
                  border: "1px solid rgba(78,205,196,0.25)",
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
                  stroke="#4ECDC4"
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "1rem",
                  marginBottom: "2rem",
                  textAlign: "left",
                }}
              >
                {[
                  { label: "Links to remove", value: "6", color: "#4ECDC4" },
                  {
                    label: "Avg. removal time",
                    value: "3–7 days",
                    color: "#4ECDC4",
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
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
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
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                }}
              >
                Request Removal Service →
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer
        style={{
          padding: "2rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            textAlign: "center",
            color: "var(--color-muted)",
            fontSize: "0.875rem",
          }}
        >
          <p>&copy; 2025 RepuTrust. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
