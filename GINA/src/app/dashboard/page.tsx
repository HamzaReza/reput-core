"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import TopBar from "./_components/TopBar";
import StatsRow from "./_components/StatsRow";
import RecentScans from "./_components/RecentScans";
import TeamActivity from "./_components/TeamActivity";
import QuickActions from "./_components/QuickActions";

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

export default function DashboardHome() {
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reput_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email ?? "");
        setUserName(u.name || u.email || "User");
      }
    } catch {}
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
      {/* Top bar */}
      <TopBar userName={userName} userEmail="" />

      {/* Stats row */}
      <StatsRow />

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 400px), 1fr))",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <BarChartCard />
        <LineChartCard />
      </div>

      {/* Bottom row */}
      <div>
        <RecentScans />
      </div>
    </div>
  );
}
