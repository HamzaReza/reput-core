"use client";

import { MonthPoint } from "@/lib/api";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtMonth(iso: string) {
  try {
    return new Date(iso).toLocaleString("default", { month: "short" });
  } catch {
    return iso.slice(0, 7);
  }
}

function fillMonths(data: MonthPoint[]): { month: string; count: number }[] {
  const lookup = new Map(data.map((d) => [d.month.slice(0, 7), d.count]));
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const d = new Date(year, i, 1);
    return { month: fmtMonth(d.toISOString()), count: lookup.get(key) ?? 0 };
  });
}

function fillWeek(data: MonthPoint[]): { month: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const p of data) map[p.month.slice(0, 10)] = p.count;

  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { month: label, count: map[key] ?? 0 };
  });
}

export default function LineChartCard({
  title,
  data,
  dataPending,
  period,
  onPeriodChange,
}: {
  title: string;
  data: MonthPoint[];
  dataPending: MonthPoint[];
  period: "weekly" | "monthly";
  onPeriodChange: (p: "weekly" | "monthly") => void;
}) {
  const completedFilled = period === "weekly" ? fillWeek(data ?? []) : fillMonths(data ?? []);
  const pendingFilled   = period === "weekly" ? fillWeek(dataPending ?? []) : fillMonths(dataPending ?? []);

  const chartData = completedFilled.map((pt, i) => ({
    month: pt.month,
    completed: pt.count,
    pending: pendingFilled[i]?.count ?? 0,
  }));

  const completedTotal = chartData.reduce((s, p) => s + p.completed, 0);
  const pendingTotal   = chartData.reduce((s, p) => s + p.pending, 0);

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{
        borderRadius: "0.875rem",
        padding: "1.125rem 1.25rem",
        animationDelay: "0.14s",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "0.25rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>
            {title}
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--color-muted, #64748b)", margin: "0.125rem 0 0" }}>
            Scans completed
          </p>
        </div>

        {/* Weekly / Monthly toggle */}
        <div style={{ display: "flex", gap: "0.25rem", padding: "0.2rem", borderRadius: "999px", border: "1px solid var(--color-border, #e2e8f0)", backgroundColor: "#f8fafc" }}>
          {(["Weekly", "Monthly"] as const).map((label) => (
            <button
              key={label}
              onClick={() => onPeriodChange(label.toLowerCase() as "weekly" | "monthly")}
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                padding: "0.2rem 0.5rem",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                color: period === label.toLowerCase() ? "#ffffff" : "var(--color-muted, #64748b)",
                backgroundColor: period === label.toLowerCase() ? "#4479DA" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 200, marginTop: "0.75rem" }}>
        <ResponsiveContainer width="100%" height={220} minWidth={1}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "0.75rem", padding: "0.4rem 0.625rem" }}
            />
            <Line type="monotone" dataKey="completed" name="Completed"
              stroke="#4479DA" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#4479DA" }} />
            <Line type="monotone" dataKey="pending" name="Pending"
              stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4"
              dot={false} activeDot={{ r: 3, fill: "#94a3b8" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", paddingTop: "0.625rem", borderTop: "1px solid var(--color-border, #e2e8f0)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", color: "var(--color-muted, #64748b)" }}>
          <span style={{ display: "inline-block", width: 16, height: 2, backgroundColor: "#4479DA", borderRadius: 1 }} />
          Completed <strong style={{ color: "#1e293b", marginLeft: 2 }}>{completedTotal.toLocaleString()}</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", color: "var(--color-muted, #64748b)" }}>
          <span style={{ display: "inline-block", width: 16, height: 2, backgroundImage: "repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 4px,transparent 4px,transparent 8px)", borderRadius: 1 }} />
          Pending <strong style={{ color: "#1e293b", marginLeft: 2 }}>{pendingTotal.toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}
