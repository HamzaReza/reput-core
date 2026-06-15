"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  usage,
  type UsageSummary,
  type UsageAnalystRow,
  type UsageTimeseries,
  type PricingRate,
} from "@/lib/api";
import AnalystUsageModal from "./AnalystUsageModal";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function fmtUsd(n: number, dp = 2): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
function fmtNum(n: number): string {
  return n.toLocaleString();
}
function dayLabel(iso: string): string {
  // bucket is already truncated to the user's local day; parse + display local.
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const cardStyle: React.CSSProperties = {
  borderRadius: "0.875rem",
  padding: "1rem 1.125rem",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--color-muted, #64748b)",
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--color-muted, #64748b)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "0.5rem 0.625rem",
  borderBottom: "1px solid var(--color-border, #e2e8f0)",
};
const tdStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--color-foreground, #1e293b)",
  padding: "0.5rem 0.625rem",
  borderBottom: "1px solid #f1f5f9",
};

export default function TokenUsageSection() {
  const [days, setDays] = useState<number>(30);
  const [tz, setTz] = useState("UTC");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [analysts, setAnalysts] = useState<UsageAnalystRow[]>([]);
  const [series, setSeries] = useState<UsageTimeseries | null>(null);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UsageAnalystRow | null>(null);
  // set synchronously in load() before any row is clickable, so the modal never opens with an empty range
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const genRef = useRef(0);

  // Resolve the browser zone client-side only — avoids an SSR/hydration mismatch.
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const load = useCallback(async () => {
    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const to = now.toISOString();
      const from = new Date(now.getTime() - days * 86400000).toISOString();
      setRange({ from, to });
      const [s, a, t, p] = await Promise.all([
        usage.summary(from, to),
        usage.byAnalyst(from, to),
        usage.timeseries(from, to, "day", tz),
        usage.pricing.list(),
      ]);
      if (gen !== genRef.current) return; // a newer range superseded this fetch
      setSummary(s);
      setAnalysts(a.analysts);
      setSeries(t);
      setRates(p.rates);
    } catch (e) {
      if (gen !== genRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load usage data");
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [days, tz]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = summary?.totals;
  const cards = [
    { label: "Total Cost", value: totals ? fmtUsd(totals.costUsd) : "—" },
    { label: "Total Tokens", value: totals ? fmtNum(totals.totalTokens) : "—" },
    { label: "Scans", value: totals ? fmtNum(totals.scans) : "—" },
    { label: "LLM Calls", value: totals ? fmtNum(totals.calls) : "—" },
  ];
  const trendData = (series?.points ?? []).map((p) => ({
    label: dayLabel(p.bucket),
    cost: Number(p.costUsd.toFixed(4)),
  }));
  const modelData = (summary?.byModel ?? []).map((m) => ({
    model: m.model,
    cost: Number(m.costUsd.toFixed(4)),
  }));

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* ── Section header + range selector ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--color-foreground, #1e293b)", margin: 0, letterSpacing: "-0.01em" }}>Token Usage &amp; Cost</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--color-muted, #64748b)", margin: "0.25rem 0 0" }}>LLM spend per analyst across OpenAI &amp; Anthropic · times shown in {tz}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", backgroundColor: "#fff", border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "999px", padding: "0.2rem" }}>
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.7rem", borderRadius: "999px", border: "none", cursor: "pointer", color: days === r.days ? "#fff" : "var(--color-muted, #64748b)", backgroundColor: days === r.days ? "#4479DA" : "transparent", transition: "all 0.15s" }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1rem" }}>
        {cards.map((c) => (
          <div key={c.label} className="glass glow-border" style={cardStyle}>
            <p style={labelStyle}>{c.label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-foreground, #1e293b)", margin: "0.5rem 0 0", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {loading ? "…" : c.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Cost trend + cost by model ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "0.875rem", marginBottom: "1rem" }}>
        <div className="glass glow-border" style={cardStyle}>
          <p style={labelStyle}>Cost Trend</p>
          <div style={{ height: 240, marginTop: "0.75rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => fmtUsd(v, 2)} width={56} />
                <Tooltip formatter={(v) => (v == null ? "—" : fmtUsd(Number(v), 4))} />
                <Line type="monotone" dataKey="cost" stroke="#4479DA" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass glow-border" style={cardStyle}>
          <p style={labelStyle}>Cost by Model</p>
          <div style={{ height: 240, marginTop: "0.75rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => fmtUsd(v, 2)} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 10, fill: "#64748b" }} width={104} />
                <Tooltip formatter={(v) => (v == null ? "—" : fmtUsd(Number(v), 4))} />
                <Bar dataKey="cost" fill="#4479DA" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Per-analyst accountability ── */}
      <div className="glass glow-border" style={{ ...cardStyle, marginBottom: "1rem" }}>
        <p style={labelStyle}>Usage by Analyst</p>
        <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>Click a row to see what the tokens were spent on.</p>
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Analyst</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Tokens</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Scans</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Calls</th>
              </tr>
            </thead>
            <tbody>
              {analysts.length === 0 && !loading && (
                <tr><td style={{ ...tdStyle, color: "#94a3b8" }} colSpan={5}>No usage recorded in this period.</td></tr>
              )}
              {analysts.map((a) => (
                <tr
                  key={a.webAnalystId}
                  onClick={() => setSelected(a)}
                  title="View what the tokens were spent on"
                  style={{ cursor: "pointer" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{a.email}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtUsd(a.costUsd)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(a.totalTokens)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(a.scans)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(a.calls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pricing editor ── */}
      <PricingEditor rates={rates} onChange={load} />

      {selected && (
        <AnalystUsageModal
          analyst={selected}
          from={range.from}
          to={range.to}
          tz={tz}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PricingEditor({ rates, onChange }: { rates: PricingRate[]; onChange: () => void }) {
  const [model, setModel] = useState("");
  const [provider, setProvider] = useState("openai");
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const ir = parseFloat(inputRate);
    const or = parseFloat(outputRate);
    if (!model.trim() || Number.isNaN(ir) || Number.isNaN(or) || ir <= 0 || or <= 0) {
      setErr("Model and positive numeric rates are required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await usage.pricing.add({ model: model.trim(), provider, inputRate: ir, outputRate: or });
      setModel("");
      setInputRate("");
      setOutputRate("");
      void onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  const inputCss: React.CSSProperties = {
    fontSize: "0.8125rem",
    padding: "0.4rem 0.6rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--color-border, #e2e8f0)",
    backgroundColor: "#fff",
    color: "var(--color-foreground, #1e293b)",
  };

  return (
    <div className="glass glow-border" style={cardStyle}>
      <p style={labelStyle}>Model Pricing (USD per 1M tokens)</p>
      <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Model</th>
              <th style={thStyle}>Provider</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Input</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Output</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Effective</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.model}</td>
                <td style={tdStyle}>{r.provider}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtUsd(r.inputRate, 3)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtUsd(r.outputRate, 3)}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#94a3b8" }}>{new Date(r.effectiveFrom).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginTop: "0.875rem" }}>
        <input style={{ ...inputCss, flex: "2 1 160px" }} placeholder="model id (e.g. gpt-5.5)" value={model} onChange={(e) => setModel(e.target.value)} />
        <select style={{ ...inputCss, flex: "1 1 110px" }} value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="openai">openai</option>
          <option value="anthropic">anthropic</option>
        </select>
        <input style={{ ...inputCss, flex: "1 1 90px" }} placeholder="input rate" inputMode="decimal" value={inputRate} onChange={(e) => setInputRate(e.target.value)} />
        <input style={{ ...inputCss, flex: "1 1 90px" }} placeholder="output rate" inputMode="decimal" value={outputRate} onChange={(e) => setOutputRate(e.target.value)} />
        <button
          onClick={submit}
          disabled={saving}
          style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.45rem 1rem", borderRadius: "0.5rem", border: "none", cursor: saving ? "default" : "pointer", color: "#fff", backgroundColor: "#4479DA", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Add rate"}
        </button>
      </div>
      {err && <p style={{ fontSize: "0.75rem", color: "#b91c1c", margin: "0.5rem 0 0" }}>{err}</p>}
    </div>
  );
}
