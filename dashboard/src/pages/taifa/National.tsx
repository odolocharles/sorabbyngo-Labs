import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Spinner, ErrorBox, StatCard, Table } from "../../components/UI";

interface CountyStats {
  county_id: number; county_name: string;
  appointments: number; home_visits: number;
}

export default function National() {
  const { get } = useApi();
  const [data, setData] = useState<CountyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    get<CountyStats[]>("taifa", "/analytics/national")
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = {
    appts: data.reduce((s,d) => s + Number(d.appointments||0), 0),
    visits: data.reduce((s,d) => s + Number(d.home_visits||0), 0),
  };
  const top5 = [...data].sort((a,b) => Number(b.appointments||0)-Number(a.appointments||0)).slice(0,5);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="National Overview" sub="Aggregate statistics across all 47 counties" />

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Counties Reporting" value={data.filter(d=>Number(d.appointments||0)>0).length} color="blue" />
            <StatCard label="Total Appointments" value={totals.appts.toLocaleString()} color="green" />
            <StatCard label="Total Home Visits" value={totals.visits.toLocaleString()} color="purple" />
            <StatCard label="Active Counties" value={data.length} color="amber" />
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Top 5 Counties by Appointments</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top5.map(d => ({ name: d.county_name, appts: Number(d.appointments||0), visits: Number(d.home_visits||0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appts" fill="#3b82f6" radius={[4,4,0,0]} name="Appointments" />
                <Bar dataKey="visits" fill="#8b5cf6" radius={[4,4,0,0]} name="Home Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table
            cols={["County","County ID","Appointments","Home Visits"]}
            rows={data.map(d => [
              d.county_name, d.county_id,
              Number(d.appointments||0).toLocaleString(),
              Number(d.home_visits||0).toLocaleString(),
            ])}
          />
        </>
      )}
    </div>
  );
}
