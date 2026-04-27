import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useVitalsWS } from "../../hooks/useVitalsWS";

const ALERT_COLORS: Record<string, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  amber: "#ea580c",
  red: "#dc2626",
};

export default function WardMonitor() {
  const [ward, setWard] = useState("ICU");
  const { vitals, connected } = useVitalsWS(ward);

  const patientMap = new Map<string, typeof vitals>();
  for (const v of vitals) {
    if (!v.patient_id) continue;
    if (!patientMap.has(v.patient_id)) patientMap.set(v.patient_id, []);
    patientMap.get(v.patient_id)!.push(v);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Ward Monitor</h1>
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm text-gray-500">{connected ? "Live" : "Reconnecting..."}</span>
        <select
          className="ml-auto border rounded px-3 py-1.5 text-sm"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
        >
          {["ICU", "HDU", "General", "Maternity", "Paeds", "A&E"].map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>

      {patientMap.size === 0 && (
        <div className="text-center text-gray-400 py-20">
          Waiting for vitals from ward <strong>{ward}</strong>…
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from(patientMap.entries()).map(([pid, readings]) => {
          const latest = readings[0];
          const color = ALERT_COLORS[latest?.alert_level || "green"];
          const chartData = [...readings].reverse().slice(-30).map((v, i) => ({
            t: i,
            hr: v.heart_rate,
            spo2: v.spo2,
            sbp: v.systolic_bp,
          }));

          return (
            <div
              key={pid}
              className="border rounded-xl p-4 shadow-sm"
              style={{ borderLeftColor: color, borderLeftWidth: 4 }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-sm">{pid}</p>
                  <p
                    className="text-xs font-bold uppercase mt-0.5"
                    style={{ color }}
                  >
                    NEWS2: {latest?.news2_score ?? "—"} — {latest?.alert_level ?? "—"}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 grid grid-cols-2 gap-x-3 gap-y-1">
                  <span>HR</span><span className="font-mono">{latest?.heart_rate ?? "—"}</span>
                  <span>SpO₂</span><span className="font-mono">{latest?.spo2 ?? "—"}%</span>
                  <span>BP</span>
                  <span className="font-mono">
                    {latest?.systolic_bp}/{latest?.diastolic_bp ?? "—"}
                  </span>
                  <span>Temp</span><span className="font-mono">{latest?.temperature ?? "—"}°C</span>
                  <span>RR</span><span className="font-mono">{latest?.respiratory_rate ?? "—"}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" dot={false} strokeWidth={1.5} name="HR" />
                  <Line type="monotone" dataKey="spo2" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="SpO₂" />
                  <Line type="monotone" dataKey="sbp" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="SBP" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
