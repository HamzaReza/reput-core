"use client";

import {
  dashboard,
  DashboardStats,
  FunnelData,
  MonthPoint,
  RegionDataPoint,
  ScoreDistribution,
} from "@/lib/api";
import { countryNameToNumericISO } from "@/lib/countries";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import RecentScans from "./_components/RecentScans";
import StatsRow from "./_components/StatsRow";
import TopBar from "./_components/TopBar";

/* ─── Chart placeholder shimmer ─── */
function ChartPlaceholder({ height = 314 }: { height?: number }) {
  return (
    <>
      <style>{`
        @keyframes chart-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: calc(400px + 100%) 0; }
        }
        .chart-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 400px 100%;
          animation: chart-shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
      <div
        className="chart-shimmer"
        style={{
          borderRadius: "0.875rem",
          height,
          border: "1px solid var(--color-border, #e2e8f0)",
        }}
      />
    </>
  );
}

/* ─── Lazy chart imports ─── */
const LineChartCard = dynamic(() => import("./_components/LineChartCard"), {
  ssr: false,
  loading: () => <ChartPlaceholder height={330} />,
});

/* ─── ReputScore Donut ─── */

function CenterLabel({ average }: { average: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan
        x="50%"
        dy="-0.4em"
        style={{ fontSize: 22, fontWeight: 600, fill: "#1e293b" }}
      >
        {average > 0 ? average : "—"}
      </tspan>
      <tspan x="50%" dy="1.4em" style={{ fontSize: 10, fill: "#64748b" }}>
        Average
      </tspan>
    </text>
  );
}

function ReputScoreDonut({ data }: { data: ScoreDistribution }) {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        padding: "1.125rem 1.25rem",
        animationDelay: "0.2s",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          ReputScore Overview
        </p>
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Donut */}
        <div style={{ flex: "0 0 130px", height: 130 }}>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie
                data={
                  data.distribution.length > 0
                    ? data.distribution
                    : [{ name: "No data", value: 1, color: "#e2e8f0" }]
                }
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {(data.distribution.length > 0
                  ? data.distribution
                  : [{ name: "No data", value: 1, color: "#e2e8f0" }]
                ).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <CenterLabel average={data.average} />
              <Tooltip
                formatter={(value) => [`${value}%`, ""]}
                contentStyle={{
                  fontSize: "0.7rem",
                  borderRadius: "0.5rem",
                  padding: "0.3rem 0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          {data.distribution.map((entry) => (
            <div
              key={entry.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.375rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: entry.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-muted, #64748b)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--color-foreground, #1e293b)",
                }}
              >
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          fontSize: "0.6875rem",
          color: "var(--color-muted, #64748b)",
          margin: "0.75rem 0 0",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
          paddingTop: "0.625rem",
        }}
      >
        Based on {data.total} deep searches
      </p>
    </div>
  );
}

/* ─── Activity by Region — real world map via react-simple-maps ─── */
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const LEVEL_COLORS = [
  "#dbeafe", // 0 – no data
  "#bfdbfe", // 1 – very low
  "#93c5fd", // 2 – low
  "#60a5fa", // 3 – medium
  "#3b82f6", // 4 – high
  "#1d4ed8", // 5 – very high
];

const LEVEL_LABELS = [
  "No data",
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
] as const;

function ActivityByRegionCard({ data }: { data: RegionDataPoint[] }) {
  const maxCount = data.reduce((m, d) => Math.max(m, d.count), 0);
  const countMap: Record<string, number> = {};
  for (const { country, count } of data) {
    const iso = countryNameToNumericISO(country);
    if (iso) countMap[iso] = count;
  }
  function getLevel(count: number): number {
    if (!count) return 0;
    return Math.max(1, Math.ceil((count / maxCount) * 5));
  }
  const top5 = data.slice(0, 5);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    country: string;
    count: number;
  } | null>(null);

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        padding: "0.875rem 1rem 0.75rem",
        animationDelay: "0.27s",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Activity by Region
          </p>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </div>

      {/* Real world map — bleed to card edges */}
      <div
        style={{
          margin: "0 -0.875rem",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <ComposableMap
          width={800}
          height={360}
          projectionConfig={{ scale: 148, center: [10, 5] }}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const count = countMap[geo.id as string] ?? 0;
                const level = getLevel(count);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={LEVEL_COLORS[level]}
                    stroke="#ffffff"
                    strokeWidth={0.4}
                    style={{
                      default: {
                        outline: "none",
                        cursor: count ? "pointer" : "default",
                      },
                      hover: {
                        outline: "none",
                        fill: LEVEL_COLORS[Math.min(level + 1, 5)],
                        cursor: count ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(evt: React.MouseEvent<SVGPathElement>) => {
                      if (!count) return;
                      setTooltip({
                        x: evt.clientX,
                        y: evt.clientY,
                        country: (geo.properties as { name: string }).name,
                        count,
                      });
                    }}
                    onMouseMove={(evt: React.MouseEvent<SVGPathElement>) => {
                      if (tooltip)
                        setTooltip((prev) =>
                          prev
                            ? { ...prev, x: evt.clientX, y: evt.clientY }
                            : null,
                        );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip — portalled to body to escape stacking contexts */}
      {tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltip.x + 12,
              top: tooltip.y - 36,
              background: "rgba(15,23,42,0.9)",
              color: "#f8fafc",
              padding: "0.3rem 0.65rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              pointerEvents: "none",
              zIndex: 9999,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              lineHeight: 1.6,
            }}
          >
            {tooltip.country}
            <br />
            <span style={{ fontWeight: 400, color: "#94a3b8" }}>
              {tooltip.count.toLocaleString()} scan
              {tooltip.count !== 1 ? "s" : ""}
            </span>
          </div>,
          document.body,
        )}

      {/* Legend — 5 labeled color boxes */}
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {LEVEL_COLORS.slice(1).map((color, i) => (
            <div
              key={color}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 7,
                  backgroundColor: color,
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontSize: "0.55rem",
                  color: "var(--color-muted, #64748b)",
                  textAlign: "center",
                }}
              >
                {LEVEL_LABELS[i + 1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top regions list */}
      {top5.length > 0 ? (
        <div
          style={{
            marginTop: "0.5rem",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            paddingTop: "0.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: "0 0 0.35rem",
            }}
          >
            Top Regions
          </p>
          {top5.map(({ country, count }) => (
            <div
              key={country}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                marginBottom: "0.2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: LEVEL_COLORS[getLevel(count)],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-foreground, #1e293b)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {country}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--color-muted, #64748b)",
                  flexShrink: 0,
                }}
              >
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted, #64748b)",
            margin: "0.5rem 0 0",
            textAlign: "center",
          }}
        >
          No scan data yet
        </p>
      )}
    </div>
  );
}

/* ─── Conversion Funnel ─── */
function ConversionFunnelCard({ data }: { data: FunnelData }) {
  const scanRate =
    data.total > 0 ? Math.round((data.unique_scanned / data.total) * 100) : 0;

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        padding: "1.125rem 1.25rem",
        animationDelay: "0.15s",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Conversion Funnel
        </p>
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* Step 1 — Total Leads */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#4479DA",
            flexShrink: 0,
          }}
        />
        <div>
          <p
            style={{
              fontSize: "0.6875rem",
              color: "var(--color-muted, #64748b)",
              margin: 0,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Total Leads
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {data.total > 0 ? data.total.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Connector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          margin: "0.375rem 0",
        }}
      >
        <div
          style={{
            width: 10,
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 1,
              height: 28,
              backgroundColor: "var(--color-border, #e2e8f0)",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            color: "#4479DA",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "999px",
            padding: "0.15rem 0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          {scanRate}% scan rate
        </span>
      </div>

      {/* Step 2 — Total Scans */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#8b5cf6",
            flexShrink: 0,
          }}
        />
        <div>
          <p
            style={{
              fontSize: "0.6875rem",
              color: "var(--color-muted, #64748b)",
              margin: 0,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Total Scans
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {data.scanned > 0 ? data.scanned.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Note */}
      <p
        style={{
          fontSize: "0.6rem",
          color: "var(--color-muted, #64748b)",
          margin: "0.75rem 0 0",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
          paddingTop: "0.5rem",
          lineHeight: 1.5,
        }}
      >
        * Scan rate reflects unique leads scanned, not total scan count.
      </p>
    </div>
  );
}

/* ─── Empty state defaults ─── */
const EMPTY_STATS: DashboardStats = {
  web_analysts: 0,
  scans: 0,
  leads: 0,
  contracts: 0,
  clients: 0,
  avg_score: 0,
  trends: { clients: null, leads: null, scans: null, avg_score: null },
};
const EMPTY_CHARTS = {
  web_analysts: [] as MonthPoint[],
  leads: [] as MonthPoint[],
  leads_pending: [] as MonthPoint[],
  contracts: [] as MonthPoint[],
  clients: [] as MonthPoint[],
};

/* ─── Main Dashboard ─── */
export default function DashboardHome() {
  const [userName, setUserName] = useState("User");
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [chartsData, setChartsData] = useState(EMPTY_CHARTS);
  const [scoreData, setScoreData] = useState<ScoreDistribution>({
    distribution: [],
    average: 0,
    total: 0,
  });
  const [funnelData, setFunnelData] = useState<FunnelData>({
    total: 0,
    scanned: 0,
    unique_scanned: 0,
    good: 0,
    mediocre: 0,
    poor: 0,
    negative: 0,
  });
  const [regionData, setRegionData] = useState<RegionDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">(
    "monthly",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserName(u.name || u.email || "User");
      }
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      dashboard
        .stats()
        .then(setStatsData)
        .catch(() => {}),
      dashboard
        .scoreDistribution()
        .then(setScoreData)
        .catch(() => {}),
      dashboard
        .funnel()
        .then(setFunnelData)
        .catch(() => {}),
      dashboard
        .activityByRegion()
        .then((d) => setRegionData(d.regions))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    dashboard
      .charts(chartPeriod)
      .then(setChartsData)
      .catch(() => {});
  }, [chartPeriod]);

  return (
    <div
      style={{
        padding: "clamp(1.25rem, 4vw, 2rem)",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .dash-zone-a {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: stretch;
        }
        .dash-zone-a .col-chart     { flex: 1; min-width: 0; overflow-x: auto; }
        .dash-zone-a .col-scans-top { flex: 1; min-width: 0; }

        .dash-zone-b {
          display: flex;
          gap: 1rem;
          align-items: stretch;
        }
        .dash-zone-b .col-funnel-b { flex: 1;   min-width: 0; }
        .dash-zone-b .col-donut-b  { flex: 1.5; min-width: 0; }
        .dash-zone-b .col-region   { flex: 1.5; min-width: 0; }

        @media (max-width: 1200px) {
          .dash-zone-a { flex-wrap: wrap; }
          .dash-zone-a .col-chart     { flex: 1 1 50%; }
          .dash-zone-a .col-scans-top { flex: 1 1 50%; }
        }
        @media (max-width: 900px) {
          .dash-zone-b { flex-wrap: wrap; }
          .dash-zone-b .col-funnel-b { flex: 1 1 100%; }
          .dash-zone-b .col-donut-b  { flex: 1 1 calc(50% - 0.5rem); }
          .dash-zone-b .col-region   { flex: 1 1 calc(50% - 0.5rem); }
        }
        @media (max-width: 600px) {
          .dash-zone-b .col-donut-b, .dash-zone-b .col-region { flex: 1 1 100%; }
        }
      `}</style>

      <TopBar />

      <StatsRow data={statsData} loading={loading} />

      {/* Zone A — Charts + Recent Research */}
      <div className="dash-zone-a">
        <div className="col-chart">
          {loading ? (
            <ChartPlaceholder height={330} />
          ) : (
            <LineChartCard
              title="Research Activity Over Time"
              data={chartsData.leads}
              dataPending={chartsData.leads_pending}
              period={chartPeriod}
              onPeriodChange={setChartPeriod}
            />
          )}
        </div>
        <div className="col-scans-top">
          <RecentScans />
        </div>
      </div>

      {/* Zone B — Funnel + Donut + Region */}
      <div className="dash-zone-b">
        <div className="col-funnel-b" style={{ alignSelf: "flex-start" }}>
          <ConversionFunnelCard data={funnelData} />
        </div>
        <div className="col-donut-b" style={{ alignSelf: "flex-start" }}>
          <ReputScoreDonut data={scoreData} />
        </div>
        <div className="col-region" style={{ alignSelf: "flex-start" }}>
          <ActivityByRegionCard data={regionData} />
        </div>
      </div>
    </div>
  );
}
