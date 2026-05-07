"use client";

import { dashboard, DashboardStats, MonthPoint } from "@/lib/api";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import RecentScans from "./_components/RecentScans";
import StatsRow from "./_components/StatsRow";
import TopBar from "./_components/TopBar";

function ChartPlaceholder() {
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
          height: "314px",
          border: "1px solid var(--color-border, #e2e8f0)",
        }}
      />
    </>
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

const ClientsChartCard = dynamic(
  () => import("./_components/ClientsChartCard"),
  {
    ssr: false,
    loading: () => <ChartPlaceholder />,
  },
);

const EMPTY_STATS: DashboardStats = {
  operators: 0,
  scans: 0,
  leads: 0,
  contracts: 0,
  clients: 0,
};
const EMPTY_CHARTS = {
  operators: [] as MonthPoint[],
  contracts: [] as MonthPoint[],
  clients: [] as MonthPoint[],
};

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
      dashboard
        .stats()
        .then(setStatsData)
        .catch(() => {}),
      dashboard
        .charts()
        .then(setChartsData)
        .catch(() => {}),
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
      <TopBar userName={userName} userEmail="" />

      <StatsRow data={statsData} loading={loading} />

      <style>{`
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1080px) {
          .charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="charts-grid">
        {loading ? (
          <>
            <ChartPlaceholder />
            <ChartPlaceholder />
            <ChartPlaceholder />
          </>
        ) : (
          <>
            <LineChartCard title="Operator Growth" data={chartsData.operators} />
            <ClientsChartCard title="Clients by Month" data={chartsData.clients} />
            <ContractsChartCard title="Contracts" data={chartsData.contracts} />
          </>
        )}
      </div>

      <div>
        <RecentScans />
      </div>
    </div>
  );
}
