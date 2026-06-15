"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import TokenUsageSection from "./_components/TokenUsageSection";

// ── Geo map ───────────────────────────────────────────────────────────────────
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const GEO_LEVEL: Record<string, number> = {
  "840": 2, "826": 2, "124": 2, "36": 2,                               // High
  "276": 1, "250": 1, "76": 1, "356": 1, "392": 1, "410": 1,          // Medium
  "528": 1, "752": 1, "702": 1, "784": 1, "554": 1, "710": 1,         // Medium
  "756": 0, "724": 0, "380": 0, "616": 0, "156": 0, "484": 0, "32": 0, // Low
  "643": 0, "792": 0, "818": 0, "566": 0,                              // Low
};
const GEO_COLORS = ["#bfdbfe", "#48D4B8", "#4479DA"]; // low, med, high

// ── Data ──────────────────────────────────────────────────────────────────────
const ACTIVITY = [
  { d: "May 12", v: 780 }, { d: "May 13", v: 740 }, { d: "May 14", v: 890 },
  { d: "May 15", v: 540 }, { d: "May 16", v: 840 }, { d: "May 17", v: 670 }, { d: "May 18", v: 770 },
];

const PIPELINE = [
  { label: "Input\nReceived",       count: 1248, bottleneck: false },
  { label: "Profile\nResearch",     count: 1097, bottleneck: false },
  { label: "Keywords\nGenerated",   count: 984,  bottleneck: false },
  { label: "Sources\nFound",        count: 812,  bottleneck: true  },
  { label: "Classification",        count: 612,  bottleneck: false },
  { label: "ReputScore",            count: 496,  bottleneck: false },
  { label: "Brief\nReady",          count: 342,  bottleneck: false },
];

const REPUT_DIST = [
  { name: "Excellent (80–100)", v: 274, pct: 22, color: "#22c55e" },
  { name: "Good (60–79)",       v: 424, pct: 34, color: "#4479DA" },
  { name: "Fair (40–59)",       v: 299, pct: 24, color: "#eab308" },
  { name: "Poor (20–39)",       v: 162, pct: 13, color: "#f97316" },
  { name: "Critical (0–19)",    v: 89,  pct: 7,  color: "#ef4444" },
];

const SOURCES = [
  { name: "Search",         pct: 44, count: 4740, color: "#4479DA" },
  { name: "News",           pct: 22, count: 2380, color: "#48D4B8" },
  { name: "Blogs",          pct: 12, count: 1298, color: "#8b5cf6" },
  { name: "Forums",         pct: 8,  count: 867,  color: "#f97316" },
  { name: "Social",         pct: 9,  count: 973,  color: "#eab308" },
  { name: "Public Records", pct: 5,  count: 584,  color: "#94a3b8" },
];

const RISK_ETHICS = [
  { label: "Ethics filter blocks",   value: 118, trend: "+9.2%",  color: "#ef4444", neutral: false },
  { label: "Manual reviews",         value: 96,  trend: "→ 2.1%", color: "#eab308", neutral: true  },
  { label: "Low-confidence scans",   value: 153, trend: "+6.4%",  color: "#f97316", neutral: false },
  { label: "Compliance flags",       value: 24,  trend: "↓ 11.1%",color: "#22c55e", neutral: false },
];

const FUNNEL = [
  { stage: "Profiled",  value: 1248 },
  { stage: "Added",     value: 962  },
  { stage: "Booked",    value: 634  },
  { stage: "Active",    value: 284  },
  { stage: "Engaged",   value: 112  },
  { stage: "Converted", value: 68   },
];

const WEB_ANALYSTS: { name: string; scans: number; briefs: number; time: string; quality: number; trend: "up" | "flat" | "down" }[] = [
  { name: "Web Analyst 1", scans: 312, briefs: 96, time: "6.1 hrs", quality: 94, trend: "up"   },
  { name: "Web Analyst 2", scans: 268, briefs: 79, time: "7.3 hrs", quality: 91, trend: "up"   },
  { name: "Web Analyst 3", scans: 224, briefs: 61, time: "8.4 hrs", quality: 88, trend: "flat" },
  { name: "Web Analyst 4", scans: 198, briefs: 54, time: "9.1 hrs", quality: 86, trend: "down" },
  { name: "Web Analyst 5", scans: 146, briefs: 38, time: "9.8 hrs", quality: 83, trend: "down" },
];

const RISK_CATS = [
  { label: "Negative News",          pct: 42, count: 51 },
  { label: "Legal Issues",           pct: 21, count: 25 },
  { label: "Financial Concerns",     pct: 15, count: 18 },
  { label: "Sanctions / Watchlists", pct: 12, count: 14 },
  { label: "Other",                  pct: 10, count: 12 },
];

// ── KPI icons ─────────────────────────────────────────────────────────────────
function IconDoc()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4479DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IconCheck()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function IconShield() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4479DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconWarn()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconClock()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

const KPI = [
  { label: "Total Researches", value: "1,248",          trend: "↑ 18.7%",   good: true,  vs: "vs Apr 28 – May 4", Icon: IconDoc,    iconBg: "#eff6ff" },
  { label: "Briefs Ready",     value: "342",            trend: "↑ 21.3%",   good: true,  vs: "vs Apr 28 – May 4", Icon: IconCheck,  iconBg: "#f0fdf4" },
  { label: "Avg ReputScore",   value: "72", unit:"/100",trend: "↑ 4 pts",   good: true,  vs: "vs Apr 28 – May 4", Icon: IconShield, iconBg: "#eff6ff" },
  { label: "High-Risk Cases",  value: "27",             trend: "↓ 15.6%",   good: true,  vs: "vs Apr 28 – May 4", Icon: IconWarn,   iconBg: "#fff7ed" },
  { label: "Avg Time to Brief",value: "7.6", unit:" hrs",trend: "↓ 1.2 hrs",good: true,  vs: "vs Apr 28 – May 4", Icon: IconClock,  iconBg: "#f0f9ff" },
];

// ── Small helpers ─────────────────────────────────────────────────────────────
function SparkLine({ trend }: { trend: "up" | "flat" | "down" }) {
  const pts = { up: "0,18 10,14 20,10 30,6 40,2", flat: "0,10 10,8 20,10 30,9 40,10", down: "0,2 10,6 20,10 30,14 40,18" }[trend];
  const c   = { up: "#22c55e", flat: "#eab308", down: "#ef4444" }[trend];
  return (
    <svg width="44" height="20" viewBox="0 0 44 20">
      <polyline fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function SectionCard({ title, subtitle, children, action, cardStyle }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; cardStyle?: React.CSSProperties }) {
  return (
    <div className="glass glow-border" style={{ borderRadius: "0.875rem", padding: "1.125rem 1.25rem", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", ...cardStyle }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem", gap: "0.5rem" }}>
        <div>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", margin: "0.125rem 0 0" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"Daily" | "Weekly">("Daily");

  useEffect(() => {
    if (!isAdmin()) router.replace("/dashboard");
  }, [router]);

  return (
    <div style={{ padding: "clamp(1.25rem, 4vw, 2rem)", backgroundColor: "#f8fafc", minHeight: "100%", boxSizing: "border-box" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>Analytics</h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted, #64748b)", margin: "0.25rem 0 0" }}>Operational intelligence across research, reputation scoring, and premium pipeline.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", backgroundColor: "#fff", fontSize: "0.8rem", fontWeight: 500, color: "var(--color-foreground, #1e293b)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            May 12 – May 18, 2025
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", backgroundColor: "#fff", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", backgroundColor: "#fff", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.875rem", marginBottom: "1rem" }}>
        <style>{`@media(max-width:1100px){.analytics-kpi{grid-template-columns:repeat(3,1fr)!important}}@media(max-width:640px){.analytics-kpi{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        {KPI.map((k) => (
          <div key={k.label} className="glass glow-border" style={{ borderRadius: "0.875rem", padding: "1rem 1.125rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.625rem" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-muted, #64748b)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
              <div style={{ width: 32, height: 32, borderRadius: "0.625rem", backgroundColor: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <k.Icon />
              </div>
            </div>
            <p style={{ fontSize: "1.625rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: "0 0 0.25rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {k.value}<span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-muted, #64748b)" }}>{k.unit}</span>
            </p>
            <p style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600, margin: 0 }}>
              {k.trend} <span style={{ color: "var(--color-muted, #64748b)", fontWeight: 400 }}>{k.vs}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Row 2: Line Chart | Pipeline | ReputScore Donut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2.2fr 1.5fr", gap: "0.875rem", marginBottom: "1rem" }}>
        {/* Research Activity */}
        <SectionCard
          title="Research Activity"
          subtitle="Scan volume over time"
          action={
            <div style={{ display: "flex", gap: "0.25rem", padding: "0.15rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", backgroundColor: "#f8fafc" }}>
              {(["Daily", "Weekly"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", border: "none", cursor: "pointer", color: tab === t ? "#fff" : "var(--color-muted, #64748b)", backgroundColor: tab === t ? "#4479DA" : "transparent", transition: "all 0.15s" }}>{t}</button>
              ))}
            </div>
          }
        >
          <div style={{ flex: 1, minHeight: 0, height: "180px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACTIVITY} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} />
                <Tooltip contentStyle={{ fontSize: "0.7rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: "0.4rem 0.625rem" }} />
                <Line type="monotone" dataKey="v" name="Scans" stroke="#4479DA" strokeWidth={2} dot={{ r: 3, fill: "#4479DA" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Research Pipeline */}
        <SectionCard title="Research Pipeline" subtitle="Live pipeline from input to brief">
          {/* Stage flow */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: "0.5rem" }}>
            {PIPELINE.map((stage, i) => (
              <div key={stage.label} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem", minWidth: "64px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: stage.bottleneck ? "#fff7ed" : "#eff6ff", border: `1.5px solid ${stage.bottleneck ? "#f97316" : "#4479DA"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stage.bottleneck ? "#f97316" : "#4479DA"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {i === 0 && <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}
                      {i === 1 && <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}
                      {i === 2 && <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}
                      {i === 3 && <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}
                      {i === 4 && <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>}
                      {i === 5 && <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
                      {i === 6 && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}
                    </svg>
                  </div>
                  <p style={{ fontSize: "0.55rem", fontWeight: 600, color: stage.bottleneck ? "#f97316" : "var(--color-muted, #64748b)", textAlign: "center", margin: 0, whiteSpace: "pre-line", lineHeight: 1.3 }}>{stage.label}</p>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: stage.bottleneck ? "#f97316" : "var(--color-foreground, #1e293b)", margin: 0 }}>{stage.count.toLocaleString()}</p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div style={{ marginTop: "14px", flexShrink: 0, color: "#cbd5e1", fontSize: "0.75rem", padding: "0 2px" }}>→</div>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline metrics */}
          <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border, #e2e8f0)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {[
              { label: "Conversion to Brief", value: "27.4%", color: "#4479DA" },
              { label: "Avg Time in Pipeline", value: "7.6 hrs", color: "#4479DA" },
              { label: "Bottleneck", value: "Sources Found", color: "#f97316" },
              { label: "vs Last 7 Days", value: "↑ 3.1%", color: "#22c55e" },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--color-muted, #64748b)", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: m.color, margin: 0 }}>{m.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ReputScore Distribution */}
        <SectionCard title="ReputScore Distribution" subtitle="Distribution of completed scans">
          <div style={{ position: "relative", height: "140px", flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={REPUT_DIST} dataKey="v" cx="50%" cy="50%" innerRadius="52%" outerRadius="80%" strokeWidth={0}>
                  {REPUT_DIST.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: 0, lineHeight: 1 }}>1,248</p>
              <p style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--color-muted, #64748b)", margin: "0.15rem 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</p>
            </div>
          </div>
          <div style={{ marginTop: "0.625rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {REPUT_DIST.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: "0.7rem", color: "var(--color-foreground, #1e293b)" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-muted, #64748b)", flexShrink: 0 }}>{d.pct}% ({d.v})</span>
              </div>
            ))}
          </div>
          <button style={{ marginTop: "0.75rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View full breakdown →
          </button>
        </SectionCard>
      </div>

      {/* ── Row 3: Source Intelligence | Risk Monitor | Conversion Funnel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem", marginBottom: "1rem" }}>

        {/* Source Intelligence */}
        <SectionCard title="Source Intelligence" subtitle="Composition of sources used">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ flexShrink: 0, width: "120px", height: "120px", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SOURCES} dataKey="pct" cx="50%" cy="50%" innerRadius="48%" outerRadius="78%" strokeWidth={0}>
                    {SOURCES.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: 0, lineHeight: 1 }}>10,842</p>
                <p style={{ fontSize: "0.55rem", fontWeight: 600, color: "var(--color-muted, #64748b)", margin: "0.1rem 0 0", textAlign: "center" }}>Total Sources</p>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {SOURCES.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--color-foreground, #1e293b)" }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-muted, #64748b)" }}>{s.pct}% ({s.count.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>
          <button style={{ marginTop: "0.875rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View sources detail →
          </button>
        </SectionCard>

        {/* Risk & Ethics Monitor */}
        <SectionCard title="Risk & Ethics Monitor" subtitle="System safeguards and review indicators">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
            {RISK_ETHICS.map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--color-border, #e2e8f0)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: r.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-foreground, #1e293b)" }}>{r.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)" }}>{r.value}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: r.neutral ? "#eab308" : r.color }}>{r.trend}</span>
                </div>
              </div>
            ))}
          </div>
          <button style={{ marginTop: "0.5rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View risk center →
          </button>
        </SectionCard>

        {/* Commercial Conversion Funnel */}
        <SectionCard title="Commercial Conversion Funnel" subtitle="Lead qualification to active engagement">
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FUNNEL} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: "0.7rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", padding: "0.3rem 0.5rem" }} />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {FUNNEL.map((_, i) => (
                    <Cell key={i} fill={`rgba(68,121,218,${1 - i * 0.13})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: "0.625rem", paddingTop: "0.625rem", borderTop: "1px solid var(--color-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-muted, #64748b)", margin: "0 0 0.125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Conversion to Active</p>
              <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#4479DA", margin: 0 }}>5.4%</p>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#22c55e" }}>↑ 0.8 pts vs Apr 28 – May 4</span>
          </div>
          <button style={{ marginTop: "0.5rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View conversion analytics →
          </button>
        </SectionCard>
      </div>

      {/* ── Row 4: Web Analyst Performance | Geographic Activity | Top Risk Categories ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr", gap: "0.875rem", alignItems: "start" }}>

        {/* Web Analyst Performance */}
        <SectionCard title="Web Analyst Performance" subtitle="Performance overview for research web analysts">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Web Analyst", "Scans", "Briefs", "Avg Review Time", "Quality Score", "Trend"].map((h) => (
                    <th key={h} style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-muted, #64748b)", textAlign: h === "Web Analyst" ? "left" : "center", padding: "0 0.5rem 0.625rem", borderBottom: "1px solid var(--color-border, #e2e8f0)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEB_ANALYSTS.map((op, i) => (
                  <tr key={op.name}>
                    <td style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-foreground, #1e293b)", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>{op.name}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-foreground, #1e293b)", textAlign: "center", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>{op.scans}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-foreground, #1e293b)", textAlign: "center", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>{op.briefs}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-foreground, #1e293b)", textAlign: "center", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>{op.time}</td>
                    <td style={{ textAlign: "center", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: op.quality >= 90 ? "#22c55e" : op.quality >= 85 ? "#eab308" : "#f97316" }}>{op.quality}%</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "0.625rem 0.5rem", borderBottom: i < WEB_ANALYSTS.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none" }}>
                      <SparkLine trend={op.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button style={{ marginTop: "0.75rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View all web analysts →
          </button>
        </SectionCard>

        {/* Geographic Activity */}
        <SectionCard title="Geographic Activity" subtitle="Research activity by region" cardStyle={{ height: "auto" }}>
          <div style={{ margin: "0 -1.25rem" }}>
            <ComposableMap
              width={800}
              height={320}
              projectionConfig={{ scale: 148, center: [10, 5] }}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const level = GEO_LEVEL[geo.id as string];
                    const fill = level !== undefined ? GEO_COLORS[level] : "#e2e8f0";
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={0.4}
                        style={{ default: { outline: "none" }, hover: { outline: "none", fill: fill === "#e2e8f0" ? "#e2e8f0" : fill }, pressed: { outline: "none" } }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.375rem" }}>
            {[{ label: "High", color: "#4479DA" }, { label: "Medium", color: "#48D4B8" }, { label: "Low", color: "#bfdbfe" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: l.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: "0.7rem", color: "var(--color-muted, #64748b)" }}>{l.label}</span>
              </div>
            ))}
          </div>
          <button style={{ marginTop: "0.5rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View region breakdown →
          </button>
        </SectionCard>

        {/* Top Risk Categories */}
        <SectionCard title="Top Risk Categories" subtitle="Categories triggering risk alerts">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
            {RISK_CATS.map((r) => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-foreground, #1e293b)" }}>{r.label}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted, #64748b)" }}>{r.pct}% ({r.count})</span>
                </div>
                <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.pct}%`, backgroundColor: "#4479DA", borderRadius: "999px" }} />
                </div>
              </div>
            ))}
          </div>
          <button style={{ marginTop: "0.875rem", background: "none", border: "none", fontSize: "0.75rem", fontWeight: 600, color: "#4479DA", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View risk classifications →
          </button>
        </SectionCard>
      </div>

      <TokenUsageSection />

    </div>
  );
}
