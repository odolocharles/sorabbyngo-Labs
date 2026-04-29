import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Select, Button, StatCard } from "../../components/UI";

interface Appointment {
  id: string; patient_id: string; provider_id: string; facility_id: string;
  scheduled_at: string; type: string; status: string; notes?: string;
}

const TYPES = ["outpatient","anc","followup","procedure"].map(t => ({ value: t, label: t }));

export default function Appointments() {
  const { get, post } = useApi();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState("test-patient-001");
  const [form, setForm] = useState({
    patient_id: "test-patient-001", provider_id: "", facility_id: "dev-facility",
    scheduled_at: "", type: "outpatient", notes: "",
  });

  async function load(pid = patientId) {
    if (!pid) return;
    try {
      setLoading(true);
      const data = await get<Appointment[]>("novela", `/appointments/patient/${pid}`);
      setAppts(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("novela", "/appointments/", form);
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const statusColor: Record<string,string> = { confirmed:"green", cancelled:"red", completed:"blue", no_show:"amber" };

  const counts = { confirmed: appts.filter(a=>a.status==="confirmed").length,
    completed: appts.filter(a=>a.status==="completed").length };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Appointments" sub="Search by patient ID"
        action={<Button onClick={() => setModal(true)}>+ Book</Button>} />

      <div className="flex gap-2">
        <input value={patientId} onChange={e => setPatientId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Patient ID" />
        <Button onClick={() => load(patientId)}>Search</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={appts.length} color="blue" />
        <StatCard label="Confirmed" value={counts.confirmed} color="green" />
        <StatCard label="Completed" value={counts.completed} color="purple" />
        <StatCard label="Upcoming" value={appts.filter(a=>new Date(a.scheduled_at)>new Date()&&a.status==="confirmed").length} color="amber" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Patient","Provider","Type","Scheduled","Status"]}
          rows={appts.map(a => [
            a.patient_id,
            a.provider_id,
            <Badge label={a.type} />,
            new Date(a.scheduled_at).toLocaleString(),
            <Badge label={a.status} color={statusColor[a.status] || "gray"} />,
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Book Appointment">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Patient ID" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required />
          <Input label="Provider ID" value={form.provider_id} onChange={e => setForm({...form, provider_id: e.target.value})} required />
          <Input label="Scheduled At" type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} required />
          <Select label="Type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} options={TYPES} />
          <Input label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Book"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
