"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import TopBar from "./_components/TopBar";
import StatsRow from "./_components/StatsRow";
import RecentScans from "./_components/RecentScans";
import { dashboard, DashboardStats, MonthPoint } from "@/lib/api";

function ChartPlaceholder() {
  return (
    <div
      style={{
        borderRadius: "0.875rem",
        height: "314px",
        backgroundColor: "#f1f5f9",
        border: "1px solid var(--color-border, #e2e8f0)",
      }}
    />
  );
}

const BarChartCard = dynamic(() => import("./_components/BarChartCard"), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

const LineChartCard = dynamic(() => import("./_components/LineChartCard"), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

const ContractsChartCard = dynamic(
  () => import("./_components/ContractsChartCard"),
  {
    ssr: false,
    loading: () => <ChartPlaceholder />,
  },
);

const EMPTY_STATS: DashboardStats = { users: 0, scans: 0, leads: 0, contracts: 0 };
const EMPTY_CHARTS = { users: [] as MonthPoint[], scans: [] as MonthPoint[], contracts: [] as MonthPoint[] };

export default function DashboardHome() {
  const [userName, setUserName] = useState("User");
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [chartsData, setChartsData] = useState(EMPTY_CHARTS);

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
    dashboard.stats().then(setStatsData).catch(() => {});
    dashboard.charts().then(setChartsData).catch(() => {});
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
      <TopBar userName={userName} userEmail="" />

      <StatsRow data={statsData} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <BarChartCard title="Scans by Month" data={chartsData.scans} />
        <LineChartCard title="User Growth" data={chartsData.users} />
        <ContractsChartCard title="Contracts" data={chartsData.contracts} />
      </div>

      <div>
        <RecentScans />
      </div>
    </div>
  );
}
