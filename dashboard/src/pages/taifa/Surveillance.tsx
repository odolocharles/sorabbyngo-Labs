import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Button, StatCard } from "../../components/UI";

interface Alert {
  id: string; county_name: string; disease: string; cases: number;
  deaths: number; alert_date: string; threshold_exceeded: boolean; notes?: string;
}

export default function Surveillance() {
  const { get, post } = useApi();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    county_id:47, disease:"", cases:0, deaths:0,
    alert_date: new Date().toISOString().split("T")[0],
    notes:"", threshold_exceeded:false,
  });

  async function load() {
    try { setLoading(true);
      const data = await get<Alert[]>("taifa", "/surveillance/alerts");
      setAlerts(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("taifa", "/surveillance/alerts", {
        ...form, cases: Number(form.cases), deaths: Number(form.deaths), county_id: Number(form.county_id),
      });
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const DISEASES = [...new Set(alerts.map(a => a.disease))];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Disease Surveillance"
        sub="County-level outbreak alerts"
        action={<Button onClick={() => setModal(true)}>+ Report Alert</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Alerts" value={alerts.length} color="blue" />
        <StatCard label="Threshold Exceeded" value={alerts.filter(a=>a.threshold_exceeded).length} color="red" />
        <StatCard label="Total Cases" value={alerts.reduce((s,a)=>s+Number(a.cases),0)} color="amber" />
        <StatCard label="Total Deaths" value={alerts.reduce((s,a)=>s+Number(a.deaths),0)} color="red" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["County","Disease","Cases","Deaths","Threshold","Date","Notes"]}
          rows={alerts.map(a => [
            a.county_name, a.disease,
            <span className="font-bold text-amber-600">{a.cases}</span>,
            <span className="font-bold text-red-600">{a.deaths}</span>,
            <Badge label={a.threshold_exceeded?"EXCEEDED":"OK"} color={a.threshold_exceeded?"red":"green"} />,
            new Date(a.alert_date).toLocaleDateString(),
            a.notes || "—",
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Report Surveillance Alert">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="County ID (1–47)" type="number" value={form.county_id} onChange={e=>setForm({...form,county_id:Number(e.target.value)})} min={1} max={47} required />
          <Input label="Disease" value={form.disease} onChange={e=>setForm({...form,disease:e.target.value})} placeholder="e.g. Malaria, Cholera, Measles" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cases" type="number" value={form.cases} onChange={e=>setForm({...form,cases:Number(e.target.value)})} />
            <Input label="Deaths" type="number" value={form.deaths} onChange={e=>setForm({...form,deaths:Number(e.target.value)})} />
          </div>
          <Input label="Alert Date" type="date" value={form.alert_date} onChange={e=>setForm({...form,alert_date:e.target.value})} required />
          <Input label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.threshold_exceeded}
              onChange={e=>setForm({...form,threshold_exceeded:e.target.checked})}
              className="rounded" />
            Threshold exceeded
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Reporting…":"Report Alert"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
