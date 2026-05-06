"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DATA = [
  { category: "News",   vol: 42 },
  { category: "Social", vol: 28 },
  { category: "Legal",  vol: 35 },
  { category: "PR",     vol: 48 },
  { category: "Forums", vol: 22 },
  { category: "Review", vol: 38 },
  { category: "Other",  vol: 31 },
];

const BAR_COLORS = ["#4479da", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#f97316", "#64748b"];

export default function BarChartCard() {
  const [period, setPeriod] = useState("Monthly");

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.15s" }}
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
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
          }}
        >
          Scan Volume
        </p>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted, #64748b)",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: "0.375rem",
            padding: "0.25rem 0.5rem",
            backgroundColor: "#fff",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option>Monthly</option>
          <option>Weekly</option>
          <option>Daily</option>
        </select>
      </div>

      {/* Chart */}
      <div style={{ height: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                fontSize: "0.8125rem",
              }}
              cursor={{ fill: "rgba(68,121,218,0.06)" }}
            />
            <Bar dataKey="vol" name="Scans" radius={[4, 4, 0, 0]}>
              {DATA.map((_, index) => (
                <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
