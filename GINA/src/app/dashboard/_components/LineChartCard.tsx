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

export default function LineChartCard({
  title,
  data,
}: {
  title: string;
  data: MonthPoint[];
}) {
  const chartData = fillMonths(data);

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
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "var(--color-foreground, #1e293b)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--color-muted, #64748b)",
              margin: "0.125rem 0 0",
            }}
          >
            Scans completed
          </p>
        </div>

        {/* Static filter chip */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.2rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "#f8fafc",
          }}
        >
          {["Daily", "Weekly"].map((label) => (
            <span
              key={label}
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                padding: "0.2rem 0.5rem",
                borderRadius: "999px",
                color: label === "Daily" ? "#ffffff" : "var(--color-muted, #64748b)",
                backgroundColor: label === "Daily" ? "#4479DA" : "transparent",
                cursor: "default",
                userSelect: "none",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 200, marginTop: "0.75rem" }}>
        <ResponsiveContainer width="100%" height={220} minWidth={1}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "999px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: "0.75rem",
                padding: "0.4rem 0.625rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Completed"
              stroke="#4479DA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "#4479DA" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Static legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginTop: "0.5rem",
          paddingTop: "0.625rem",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", color: "var(--color-muted, #64748b)" }}>
          <span style={{ display: "inline-block", width: 16, height: 2, backgroundColor: "#4479DA", borderRadius: 1 }} />
          Completed <strong style={{ color: "#1e293b", marginLeft: 2 }}>318</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", color: "var(--color-muted, #64748b)" }}>
          <span style={{ display: "inline-block", width: 16, height: 2, backgroundImage: "repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 4px,transparent 4px,transparent 8px)", borderRadius: 1 }} />
          Backlog <strong style={{ color: "#1e293b", marginLeft: 2 }}>42</strong>
        </span>
      </div>
    </div>
  );
}
