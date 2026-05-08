"use client";

import { dashboard, DashboardStats, MonthPoint } from "@/lib/api";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
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

/* ─── Research Pipeline (placeholder) ─── */
const PIPELINE_ROWS = [
  {
    label: "Pending",
    count: 12,
    pct: "20%",
    color: "#94a3b8",
    bg: "#f1f5f9",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Scanning",
    count: 30,
    pct: "48%",
    color: "#4479da",
    bg: "#eff6ff",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4479da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Brief Ready",
    count: 18,
    pct: "29%",
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
      </svg>
    ),
  },
  {
    label: "High Risk",
    count: 4,
    pct: "6%",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

function ResearchPipelineCard() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.125rem 1.25rem", animationDelay: "0.17s", height: "100%", boxSizing: "border-box" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>
          Research Pipeline
        </p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {PIPELINE_ROWS.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.625rem",
              borderRadius: "0.875rem",
              backgroundColor: row.bg,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {row.icon}
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: row.color }}>
                {row.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)" }}>
                {row.count}
              </span>
              <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--color-muted, #64748b)", minWidth: 30, textAlign: "right" }}>
                {row.pct}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.875rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
        }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)" }}>Total</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)" }}>64</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── ReputScore Donut (placeholder) ─── */
const DONUT_DATA = [
  { name: "Excellent (80–100)", value: 38, color: "#4479DA" },
  { name: "Good (60–79)", value: 34, color: "#48D4B8" },
  { name: "Fair (40–59)", value: 16, color: "#f97316" },
  { name: "Poor (20–39)", value: 8, color: "#1e293b" },
  { name: "Critical (0–19)", value: 4, color: "#ef4444" },
];

function CenterLabel() {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-0.4em" style={{ fontSize: 22, fontWeight: 600, fill: "#1e293b" }}>72</tspan>
      <tspan x="50%" dy="1.4em" style={{ fontSize: 10, fill: "#64748b" }}>Average</tspan>
    </text>
  );
}

function ReputScoreDonut() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.125rem 1.25rem", animationDelay: "0.2s", height: "100%", boxSizing: "border-box" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>
          ReputScore Overview
        </p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {DONUT_DATA.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <CenterLabel />
              <Tooltip
                formatter={(value) => [`${value}%`, ""]}
                contentStyle={{ fontSize: "0.7rem", borderRadius: "0.5rem", padding: "0.3rem 0.5rem" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {DONUT_DATA.map((entry) => (
            <div key={entry.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.375rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.6875rem", color: "var(--color-muted, #64748b)", whiteSpace: "nowrap" }}>
                  {entry.name}
                </span>
              </div>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)" }}>
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: "0.6875rem", color: "var(--color-muted, #64748b)", margin: "0.75rem 0 0", borderTop: "1px solid var(--color-border, #e2e8f0)", paddingTop: "0.625rem" }}>
        Based on 142 client profiles
      </p>
    </div>
  );
}

/* ─── Web Analyst Tasks (placeholder) ─── */
const TASKS = [
  { icon: "warn", text: "4 high risk cases need review", due: "Due today", urgent: true },
  { icon: "scan", text: "12 scans awaiting web analyst input", due: "Due today", urgent: true },
  { icon: "user", text: "3 client status updates pending", due: "Due tomorrow", urgent: false },
  { icon: "bell", text: "7 data source sync issues", due: "Due in 2 days", urgent: false },
  { icon: "doc", text: "5 briefs pending quality check", due: "Due in 2 days", urgent: false },
];

function TaskIcon({ type }: { type: string }) {
  const stroke = type === "warn" ? "#ef4444" : type === "scan" ? "#4479da" : type === "bell" ? "#eab308" : "#64748b";
  if (type === "warn") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  if (type === "scan") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
  if (type === "user") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
  if (type === "bell") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function WebAnalystTasksCard() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.125rem 1.25rem", animationDelay: "0.24s", height: "100%", boxSizing: "border-box" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>
          Web Analyst Tasks & Alerts
        </p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {TASKS.map((task, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0",
              borderBottom: i < TASKS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flex: 1, minWidth: 0 }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>
                <TaskIcon type={task.icon} />
              </span>
              <p style={{ fontSize: "0.7875rem", fontWeight: 500, color: "var(--color-foreground, #1e293b)", margin: 0, lineHeight: 1.4 }}>
                {task.text}
              </p>
            </div>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: task.urgent ? "#ef4444" : "var(--color-muted, #64748b)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {task.due}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Activity by Region — real world map via react-simple-maps ─── */
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* Numeric ISO 3166-1 → activity level 0–5 */
const ACTIVITY_LEVEL: Record<string, number> = {
  /* North America – highest */
  "840": 5, // USA
  "124": 4, // Canada
  "484": 3, // Mexico
  /* Western Europe */
  "826": 3, // UK
  "276": 3, // Germany
  "250": 3, // France
  "528": 2, // Netherlands
  "756": 2, // Switzerland
  "56":  2, // Belgium
  "724": 2, // Spain
  "380": 2, // Italy
  "40":  2, // Austria
  "752": 2, // Sweden
  "578": 2, // Norway
  "208": 2, // Denmark
  "246": 2, // Finland
  "620": 2, // Portugal
  "616": 1, // Poland
  "203": 1, // Czech Republic
  "642": 1, // Romania
  "348": 1, // Hungary
  "804": 1, // Ukraine
  "643": 1, // Russia
  /* Asia-Pacific */
  "36":  4, // Australia
  "392": 3, // Japan
  "410": 2, // South Korea
  "702": 2, // Singapore
  "458": 2, // Malaysia
  "344": 2, // Hong Kong
  "356": 2, // India
  "156": 1, // China
  "764": 1, // Thailand
  "704": 1, // Vietnam
  "360": 1, // Indonesia
  "608": 1, // Philippines
  "554": 2, // New Zealand
  /* Middle East */
  "784": 1, // UAE
  "376": 1, // Israel
  "682": 1, // Saudi Arabia
  /* Latin America */
  "76":  2, // Brazil
  "32":  1, // Argentina
  "170": 1, // Colombia
  "152": 1, // Chile
  "604": 1, // Peru
  /* Africa */
  "710": 1, // South Africa
  "566": 1, // Nigeria
  "404": 1, // Kenya
  "818": 1, // Egypt
};

const LEVEL_COLORS = [
  "#dbeafe", // 0 – no data
  "#bfdbfe", // 1 – very low
  "#93c5fd", // 2 – low
  "#60a5fa", // 3 – medium
  "#3b82f6", // 4 – high
  "#1d4ed8", // 5 – very high
];

function ActivityByRegionCard() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        padding: "0.875rem 1rem 0.75rem",
        animationDelay: "0.27s",
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: "var(--color-muted, #64748b)",
            padding: "0.2rem 0.5rem",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: "999px",
            cursor: "default",
          }}
        >
          This Month ▾
        </span>
      </div>

      {/* Real world map — bleed to card edges, taller */}
      <div style={{ flex: 1, margin: "0 -0.875rem", overflow: "hidden" }}>
        <ComposableMap
          width={800}
          height={360}
          projectionConfig={{ scale: 148, center: [10, 5] }}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const level = ACTIVITY_LEVEL[geo.id as string] ?? 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={LEVEL_COLORS[level]}
                    stroke="#ffffff"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover:   { outline: "none", fill: LEVEL_COLORS[Math.min(level + 1, 5)] },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Legend */}
      <div style={{ marginTop: "0.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.3rem",
          }}
        >
          <span style={{ fontSize: "0.6875rem", color: "var(--color-muted, #64748b)" }}>Low</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--color-muted, #64748b)" }}>High</span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          {LEVEL_COLORS.map((c) => (
            <div
              key={c}
              style={{ flex: 1, height: 7, backgroundColor: c, borderRadius: 2 }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.375rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", margin: 0 }}>
          Top region:{" "}
          <strong style={{ color: "var(--color-foreground, #1e293b)", fontWeight: 700 }}>
            North America
          </strong>
        </p>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#4479DA",
            display: "flex",
            alignItems: "center",
            gap: "0.2rem",
            cursor: "default",
          }}
        >
          View breakdown
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
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
};
const EMPTY_CHARTS = {
  web_analysts: [] as MonthPoint[],
  contracts: [] as MonthPoint[],
  clients: [] as MonthPoint[],
};

/* ─── Main Dashboard ─── */
export default function DashboardHome() {
  const [userName, setUserName] = useState("User");
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [chartsData, setChartsData] = useState(EMPTY_CHARTS);
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
      dashboard.stats().then(setStatsData).catch(() => {}),
      dashboard.charts().then(setChartsData).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

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
        .dash-zone-a .col-chart  { flex: 2.5; min-width: 0; }
        .dash-zone-a .col-pipe   { flex: 1.2; min-width: 0; }
        .dash-zone-a .col-donut  { flex: 1.5; min-width: 0; }

        .dash-zone-b {
          display: flex;
          gap: 1rem;
          align-items: stretch;
        }
        .dash-zone-b .col-scans  { flex: 2; min-width: 0; }
        .dash-zone-b .col-tasks  { flex: 1.5; min-width: 0; }
        .dash-zone-b .col-region { flex: 1.5; min-width: 0; }

        @media (max-width: 1200px) {
          .dash-zone-a { flex-wrap: wrap; }
          .dash-zone-a .col-chart  { flex: 1 1 100%; }
          .dash-zone-a .col-pipe   { flex: 1 1 calc(50% - 0.5rem); }
          .dash-zone-a .col-donut  { flex: 1 1 calc(50% - 0.5rem); }
        }
        @media (max-width: 900px) {
          .dash-zone-b { flex-wrap: wrap; }
          .dash-zone-b .col-scans  { flex: 1 1 100%; }
          .dash-zone-b .col-tasks  { flex: 1 1 calc(50% - 0.5rem); }
          .dash-zone-b .col-region { flex: 1 1 calc(50% - 0.5rem); }
        }
        @media (max-width: 600px) {
          .dash-zone-a .col-pipe, .dash-zone-a .col-donut { flex: 1 1 100%; }
          .dash-zone-b .col-tasks, .dash-zone-b .col-region { flex: 1 1 100%; }
        }
      `}</style>

      <TopBar userName={userName} userEmail="" />

      <StatsRow data={statsData} loading={loading} />

      {/* Zone A — Charts */}
      <div className="dash-zone-a">
        <div className="col-chart">
          {loading ? (
            <ChartPlaceholder height={330} />
          ) : (
            <LineChartCard title="Research Activity Over Time" data={chartsData.web_analysts} />
          )}
        </div>
        <div className="col-pipe">
          <ResearchPipelineCard />
        </div>
        <div className="col-donut">
          <ReputScoreDonut />
        </div>
      </div>

      {/* Zone B — Bottom row */}
      <div className="dash-zone-b">
        <div className="col-scans">
          <RecentScans />
        </div>
        <div className="col-tasks">
          <WebAnalystTasksCard />
        </div>
        <div className="col-region">
          <ActivityByRegionCard />
        </div>
      </div>
    </div>
  );
}
