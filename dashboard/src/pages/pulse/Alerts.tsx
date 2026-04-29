import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, StatCard, Button } from "../../components/UI";

interface Alert {
  patient_id: string; ward: string; news2_score: number;
  alert_level: string; heart_rate?: number; spo2?: number;
  systolic_bp?: number; timestamp: string;
}

export default function Alerts() {
  const { get } = useApi();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [minNews2, setMinNews2] = useState(5);

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await get<Alert[]>("pulse", `/vitals/alerts/active?min_news2=${minNews2}`);
      setAlerts(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [minNews2]);

  const levelColor: Record<string,string> = { red:"red", amber:"amber", yellow:"amber", green:"green" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Active Alerts"
        sub="Auto-refreshes every 30 seconds"
        action={
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Min NEWS2:</label>
            <select value={minNews2} onChange={e => setMinNews2(Number(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none">
              {[1,3,5,7].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
            <Button onClick={load}>Refresh</Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="🔴 Critical (7+)" value={alerts.filter(a=>a.news2_score>=7).length} color="red" />
        <StatCard label="🟠 High (5–6)" value={alerts.filter(a=>a.news2_score>=5&&a.news2_score<7).length} color="amber" />
        <StatCard label="🟡 Low Risk (1–4)" value={alerts.filter(a=>a.news2_score<5).length} color="blue" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Patient","Ward","NEWS2","Level","HR","SpO₂","SBP","Time"]}
          rows={alerts.map(a => [
            a.patient_id,
            a.ward,
            <span className="font-bold text-lg">{a.news2_score}</span>,
            <Badge label={a.alert_level?.toUpperCase()||"—"} color={levelColor[a.alert_level]||"gray"} />,
            a.heart_rate ? `${a.heart_rate} bpm` : "—",
            a.spo2 ? `${a.spo2}%` : "—",
            a.systolic_bp ? `${a.systolic_bp} mmHg` : "—",
            new Date(a.timestamp).toLocaleTimeString(),
          ])}
        />
      )}
      {!loading && !error && alerts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          ✅ No active alerts with NEWS2 ≥ {minNews2}
        </div>
      )}
    </div>
  );
}
