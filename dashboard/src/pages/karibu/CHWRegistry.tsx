import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Button, StatCard } from "../../components/UI";

interface CHW {
  id: string; full_name: string; phone: string; county_id: number;
  sub_county: string; ward: string; village: string; active: boolean;
}

export default function CHWRegistry() {
  const { get, post } = useApi();
  const [chws, setChws] = useState<CHW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name:"", phone:"", county_id:47, sub_county:"", ward:"",
    village:"", id_number:"", link_facility_id:"dev-facility",
  });

  async function load() {
    try { setLoading(true);
      // list all recent visits to get CHW list (CHW list endpoint)
      const data = await get<CHW[]>("karibu", "/chw/?limit=100");
      setChws(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("karibu", "/chw/register", { ...form, county_id: Number(form.county_id) });
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="CHW Registry"
        sub="Community Health Workers"
        action={<Button onClick={() => setModal(true)}>+ Register CHW</Button>} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total CHWs" value={chws.length} color="blue" />
        <StatCard label="Active" value={chws.filter(c=>c.active).length} color="green" />
        <StatCard label="Counties" value={new Set(chws.map(c=>c.county_id)).size} color="purple" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["SUID","Name","Phone","County","Sub-County","Ward","Status"]}
          rows={chws.map(c => [
            <span className="font-mono text-xs">{c.id}</span>,
            c.full_name, c.phone, c.county_id, c.sub_county, c.ward,
            <Badge label={c.active ? "Active" : "Inactive"} color={c.active ? "green" : "gray"} />,
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Register CHW">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required />
          <Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+2547XXXXXXXX" required />
          <Input label="National ID" value={form.id_number} onChange={e=>setForm({...form,id_number:e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="County ID" type="number" value={form.county_id} onChange={e=>setForm({...form,county_id:Number(e.target.value)})} />
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
