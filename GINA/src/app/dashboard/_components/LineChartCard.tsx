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
        padding: "1.25rem",
        animationDelay: "0.22s",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <p
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-foreground, #1e293b)",
            margin: 0,
          }}
        >
          {title}
        </p>
      </div>

      <div style={{ width: "100%", height: 240, minWidth: 0, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={240}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
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
              dataKey="count"
              name="Count"
              stroke="#22c55e"
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
