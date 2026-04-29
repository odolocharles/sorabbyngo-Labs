import React, { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Input, Button, ErrorBox, StatCard } from "../../components/UI";

interface Identity {
  suid: string; novela_patient_id: string; pulse_patient_id: string;
  full_name: string; dob?: string; national_id?: string; nhif_number?: string;
}

export default function IdentityBridge() {
  const { get, post } = useApi();
  const [result, setResult] = useState<Identity | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolveId, setResolveId] = useState("");
  const [form, setForm] = useState({
    novela_patient_id: "", full_name: "", dob: "", national_id: "", nhif_number: "",
  });

  async function resolve() {
    if (!resolveId) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await get<Identity>("novela", `/identity/resolve/${resolveId}`);
      setResult(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const data = await post<Identity>("novela", "/identity/register", form);
      setResult(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Identity Bridge"
        sub="Links novela patient IDs ↔ pulse patient IDs via SUID" />

      {/* Resolve */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Resolve Any ID</h2>
        <p className="text-sm text-gray-500">Enter any patient ID — novela, pulse, SUID, or national ID</p>
        <div className="flex gap-2">
          <input value={resolveId} onChange={e => setResolveId(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any patient identifier…" />
          <Button onClick={resolve} disabled={loading}>Resolve</Button>
        </div>
      </div>

      {/* Register */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Register New Identity</h2>
        <form onSubmit={register} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Novela Patient ID" value={form.novela_patient_id}
              onChange={e => setForm({...form, novela_patient_id: e.target.value})} required />
            <Input label="Full Name" value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})} required />
            <Input label="Date of Birth" type="date" value={form.dob}
              onChange={e => setForm({...form, dob: e.target.value})} />
            <Input label="National ID" value={form.national_id}
              onChange={e => setForm({...form, national_id: e.target.value})} />
            <Input label="NHIF Number" value={form.nhif_number}
              onChange={e => setForm({...form, nhif_number: e.target.value})} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Registering…" : "Register Identity"}</Button>
        </form>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Identity Record</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="SUID" value={result.suid} color="blue" />
            <StatCard label="Novela ID" value={result.novela_patient_id} color="green" />
            <StatCard label="Pulse ID" value={result.pulse_patient_id} color="purple" />
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex gap-4">
              <span className="text-gray-500 w-32">Full Name</span>
              <span className="font-medium">{result.full_name}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-500 w-32">Date of Birth</span>
              <span className="font-medium">{result.dob || "—"}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-500 w-32">National ID</span>
              <span className="font-medium">{result.national_id || "—"}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-500 w-32">NHIF Number</span>
              <span className="font-medium">{result.nhif_number || "—"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
