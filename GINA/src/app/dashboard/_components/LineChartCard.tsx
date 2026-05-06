"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DATA = [
  { month: "Jan", avgScore: 68, highRisk: 42 },
  { month: "Feb", avgScore: 71, highRisk: 38 },
  { month: "Mar", avgScore: 65, highRisk: 51 },
  { month: "Apr", avgScore: 74, highRisk: 34 },
  { month: "May", avgScore: 78, highRisk: 29 },
  { month: "Jun", avgScore: 72, highRisk: 37 },
  { month: "Jul", avgScore: 80, highRisk: 25 },
  { month: "Aug", avgScore: 76, highRisk: 31 },
  { month: "Sep", avgScore: 83, highRisk: 21 },
  { month: "Oct", avgScore: 79, highRisk: 28 },
  { month: "Nov", avgScore: 85, highRisk: 18 },
  { month: "Dec", avgScore: 88, highRisk: 15 },
];

export default function LineChartCard() {
  const [period, setPeriod] = useState("Monthly");

  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.22s" }}
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
          Score Trends
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
              Avg Score
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4479da", display: "inline-block" }} />
              High Risk
            </span>
          </div>
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
      </div>

      {/* Chart */}
      <div style={{ height: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
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
            />
            <Line
              type="monotone"
              dataKey="avgScore"
              name="Avg Score"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="highRisk"
              name="High Risk"
              stroke="#4479da"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
