import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Input, Button, StatCard, Spinner, ErrorBox } from "../../components/UI";

interface ForecastResult {
  drug: string; current_stock: number; reorder_point: number;
  needs_reorder: boolean; total_forecasted: number; order_quantity: number;
  projection: { month_offset: number; month: number; forecasted_qty: number; factor: number }[];
}

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Forecasting() {
  const { post } = useApi();
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    facility_id: "dev-facility", drug_name: "Coartem",
    avg_monthly_consumption: 200, current_stock: 350, months: 6,
  });

  async function forecast(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const data = await post<ForecastResult>("dawa", "/dawa/forecast", {
        ...form,
        avg_monthly_consumption: Number(form.avg_monthly_consumption),
        current_stock: Number(form.current_stock),
        months: Number(form.months),
      });
      setResult(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Drug Forecasting" sub="Seasonal malaria-adjusted consumption projections" />

      <div className="bg-white rounded-xl border p-5">
        <form onSubmit={forecast} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <Input label="Drug Name" value={form.drug_name} onChange={e=>setForm({...form,drug_name:e.target.value})} required />
          <Input label="Avg Monthly Consumption" type="number" value={form.avg_monthly_consumption} onChange={e=>setForm({...form,avg_monthly_consumption:Number(e.target.value)})} />
          <Input label="Current Stock" type="number" value={form.current_stock} onChange={e=>setForm({...form,current_stock:Number(e.target.value)})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months to Forecast</label>
            <select value={form.months} onChange={e=>setForm({...form,months:Number(e.target.value)})}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[3,6,9,12].map(m => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
          <Button type="submit" disabled={loading}>{loading?"Running…":"Forecast"}</Button>
        </form>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Current Stock" value={result.current_stock} color="blue" />
            <StatCard label="Reorder Point" value={result.reorder_point} color={result.needs_reorder?"red":"green"} />
            <StatCard label="Total Forecasted" value={result.total_forecasted} color="purple" />
            <StatCard label="Order Quantity" value={result.order_quantity}
              color={result.needs_reorder?"red":"green"}
              sub={result.needs_reorder ? "⚠️ Reorder needed" : "✅ Stock sufficient"} />
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-700 mb-4">6-Month Projection — {result.drug}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={result.projection.map(p => ({
                month: MONTHS[p.month], qty: p.forecasted_qty, factor: p.factor,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v, n) => [v, n === "qty" ? "Forecasted Qty" : "Seasonal Factor"]} />
                <Bar dataKey="qty" radius={[4,4,0,0]}>
                  {result.projection.map((p, i) => (
                    <Cell key={i} fill={p.factor > 1 ? "#ef4444" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2">🔴 High season (malaria spike) &nbsp; 🔵 Low season</p>
          </div>
        </>
      )}
    </div>
  );
}
