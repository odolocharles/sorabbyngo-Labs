import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useApi } from "../../hooks/useApi";
import { PageHeader, StatCard, Spinner, ErrorBox, Badge, Button } from "../../components/UI";

interface VitalsRow {
  timestamp: string; heart_rate?: number; spo2?: number;
  systolic_bp?: number; temperature?: number; respiratory_rate?: number;
  news2_score?: number; alert_level?: string; ward?: string;
}

const ALERT_COLOR: Record<string, string> = {
  green: "green", yellow: "amber", amber: "amber", red: "red",
};

export default function PatientVitals() {
  const { get } = useApi();
  const [patientId, setPatientId] = useState("4fe09dcddfcb47e1");
  const [hours, setHours] = useState(24);
  const [vitals, setVitals] = useState<VitalsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(pid = patientId, h = hours) {
    if (!pid) return;
    setLoading(true); setError("");
    try {
      const data = await get<VitalsRow[]>("pulse", `/vitals/${pid}?hours=${h}`);
      setVitals(data.slice(0, 100).reverse());
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const latest = vitals[vitals.length - 1];
  const chartData = vitals.map((v, i) => ({
    t: i, hr: v.heart_rate, spo2: v.spo2, sbp: v.systolic_bp,
    temp: v.temperature, rr: v.respiratory_rate, news2: v.news2_score,
  }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Patient Vitals" sub="Real-time vitals from InfluxDB" />

      <div className="flex gap-2 flex-wrap">
        <input value={patientId} onChange={e => setPatientId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Pulse patient ID" />
        <select value={hours} onChange={e => { setHours(Number(e.target.value)); load(patientId, Number(e.target.value)); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none">
          {[1,6,12,24,48].map(h => <option key={h} value={h}>Last {h}h</option>)}
        </select>
        <Button onClick={() => load()}>Load</Button>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {latest && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="NEWS2" value={latest.news2_score ?? "—"}
              color={ALERT_COLOR[latest.alert_level || "green"]} />
            <StatCard label="Heart Rate" value={latest.heart_rate ? `${latest.heart_rate} bpm` : "—"} color="red" />
            <StatCard label="SpO₂" value={latest.spo2 ? `${latest.spo2}%` : "—"} color="blue" />
            <StatCard label="Sys BP" value={latest.systolic_bp ? `${latest.systolic_bp} mmHg` : "—"} color="purple" />
            <StatCard label="Temp" value={latest.temperature ? `${latest.temperature}°C` : "—"} color="amber" />
            <StatCard label="Resp Rate" value={latest.respiratory_rate ? `${latest.respiratory_rate}/min` : "—"} color="green" />
            <StatCard label="Ward" value={latest.ward || "—"} color="blue" />
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Heart Rate & SpO₂</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="t" hide />
                <YAxis domain={['auto','auto']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hr" stroke="#ef4444" dot={false} strokeWidth={2} name="HR (bpm)" />
                <Line type="monotone" dataKey="spo2" stroke="#3b82f6" dot={false} strokeWidth={2} name="SpO₂ %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Blood Pressure</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={['auto','auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sbp" stroke="#8b5cf6" dot={false} strokeWidth={2} name="SBP" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">NEWS2 Score</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0,10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="news2" stroke="#f59e0b" dot={false} strokeWidth={2} name="NEWS2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!loading && !error && vitals.length === 0 && (
        <div className="text-center text-gray-400 py-20">
          No vitals found for this patient in the last {hours}h
        </div>
      )}
    </div>
  );
}
