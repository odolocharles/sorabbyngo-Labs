import React, { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Button, StatCard } from "../../components/UI";

interface CHW {
  id: string; full_name: string; phone: string; county_id: number;
  sub_county: string; ward: string; village: string; active: boolean;
}

export default function CHWRegistry() {
  const { post } = useApi();
  const [chws, setChws] = useState<CHW[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name:"", phone:"", county_id:47, sub_county:"", ward:"",
    village:"", id_number:"", link_facility_id:"dev-facility",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const data = await post<CHW>("karibu", "/chw/register", {
        ...form, county_id: Number(form.county_id)
      });
      setChws(prev => [data, ...prev]);
      setModal(false);
      setForm({ full_name:"", phone:"", county_id:47, sub_county:"", ward:"", village:"", id_number:"", link_facility_id:"dev-facility" });
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="CHW Registry" sub="Community Health Workers"
        action={<Button onClick={() => setModal(true)}>+ Register CHW</Button>} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Registered This Session" value={chws.length} color="blue" />
        <StatCard label="Active" value={chws.filter(c=>c.active).length} color="green" />
        <StatCard label="Counties" value={new Set(chws.map(c=>c.county_id)).size} color="purple" />
      </div>

      {error && <ErrorBox message={error} />}

      <Table
        cols={["SUID","Name","Phone","County","Ward","Status"]}
        rows={chws.map(c => [
          <span className="font-mono text-xs">{c.id}</span>,
          c.full_name, c.phone, c.county_id, c.ward,
          <Badge label={c.active ? "Active" : "Inactive"} color={c.active ? "green" : "gray"} />,
        ])}
      />

      {chws.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">
          No CHWs registered yet. Click "+ Register CHW" to add one.
        </p>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Register CHW">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required />
          <Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+2547XXXXXXXX" required />
          <Input label="National ID" value={form.id_number} onChange={e=>setForm({...form,id_number:e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="County ID (1-47)" type="number" value={form.county_id} onChange={e=>setForm({...form,county_id:Number(e.target.value)})} min={1} max={47} />
            <Input label="Sub-County" value={form.sub_county} onChange={e=>setForm({...form,sub_county:e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ward" value={form.ward} onChange={e=>setForm({...form,ward:e.target.value})} required />
            <Input label="Village" value={form.village} onChange={e=>setForm({...form,village:e.target.value})} required />
          </div>
          <Input label="Link Facility ID" value={form.link_facility_id} onChange={e=>setForm({...form,link_facility_id:e.target.value})} required />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Saving…":"Register"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
