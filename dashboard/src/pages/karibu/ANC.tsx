import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Button, StatCard } from "../../components/UI";

interface ANCVisit {
  id: string; patient_id: string; gestational_age_weeks: number;
  blood_pressure?: string; haemoglobin_gdl?: number; malaria_test?: string;
  referral_needed: boolean; visited_at: string;
}

const MALARIA_OPTS = [{value:"positive",label:"Positive"},{value:"negative",label:"Negative"},{value:"not_done",label:"Not Done"}];
const DANGER_SIGNS = ["severe_headache","visual_disturbance","heavy_bleeding","convulsions","fever","severe_vomiting","reduced_fetal_movement","difficulty_breathing"];

export default function ANC() {
  const { get, post } = useApi();
  const [visits, setVisits] = useState<ANCVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState("test-patient-001");
  const [form, setForm] = useState({
    patient_id:"test-patient-001", facility_id:"dev-facility", provider_id:"dev-user",
    gestational_age_weeks:20, blood_pressure:"120/80", haemoglobin_gdl:11.5,
    malaria_test:"negative", danger_signs:[] as string[], notes:"",
  });

  async function load(pid = patientId) {
    setLoading(true); setError("");
    try {
      const data = await get<ANCVisit[]>("karibu", `/anc/history/${pid}`);
      setVisits(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function toggleSign(sign: string) {
    setForm(f => ({
      ...f,
      danger_signs: f.danger_signs.includes(sign)
        ? f.danger_signs.filter(s => s !== sign)
        : [...f.danger_signs, sign],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("karibu", "/anc/visits", { ...form, gestational_age_weeks: Number(form.gestational_age_weeks) });
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Antenatal Care (ANC)"
        action={<Button onClick={() => setModal(true)}>+ Record Visit</Button>} />

      <div className="flex gap-2">
        <input value={patientId} onChange={e => setPatientId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Patient ID" />
        <Button onClick={() => load(patientId)}>Load History</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Visits" value={visits.length} color="pink" />
        <StatCard label="Referrals" value={visits.filter(v=>v.referral_needed).length} color="red" />
        <StatCard label="Malaria +" value={visits.filter(v=>v.malaria_test==="positive").length} color="amber" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Patient","GA Weeks","BP","Hgb","Malaria","Referral","Date"]}
          rows={visits.map(v => [
            v.patient_id,
            `${v.gestational_age_weeks}w`,
            v.blood_pressure || "—",
            v.haemoglobin_gdl ? `${v.haemoglobin_gdl} g/dL` : "—",
            <Badge label={v.malaria_test||"—"} color={v.malaria_test==="positive"?"red":v.malaria_test==="negative"?"green":"gray"} />,
            <Badge label={v.referral_needed?"YES":"No"} color={v.referral_needed?"red":"green"} />,
            new Date(v.visited_at).toLocaleDateString(),
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Record ANC Visit">
        <form onSubmit={handleCreate} className="space-y-4 max-h-96 overflow-y-auto pr-1">
          <Input label="Patient ID" value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} required />
          <Input label="Gestational Age (weeks)" type="number" value={form.gestational_age_weeks} onChange={e=>setForm({...form,gestational_age_weeks:Number(e.target.value)})} required />
          <Input label="Blood Pressure" value={form.blood_pressure} onChange={e=>setForm({...form,blood_pressure:e.target.value})} placeholder="120/80" />
          <Input label="Haemoglobin (g/dL)" type="number" step="0.1" value={form.haemoglobin_gdl} onChange={e=>setForm({...form,haemoglobin_gdl:Number(e.target.value)})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Malaria Test</label>
            <div className="flex gap-2">
              {MALARIA_OPTS.map(o => (
                <button key={o.value} type="button"
                  onClick={() => setForm({...form, malaria_test: o.value})}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${form.malaria_test===o.value?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-300"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danger Signs</label>
            <div className="flex flex-wrap gap-2">
              {DANGER_SIGNS.map(s => (
                <button key={s} type="button"
                  onClick={() => toggleSign(s)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${form.danger_signs.includes(s)?"bg-red-500 text-white border-red-500":"bg-white text-gray-600 border-gray-300"}`}>
                  {s.replace(/_/g," ")}
                </button>
              ))}
            </div>
          </div>
          <Input label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Saving…":"Record Visit"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
