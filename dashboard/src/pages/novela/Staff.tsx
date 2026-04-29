import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Select, Button, StatCard } from "../../components/UI";

interface Staff {
  id: string; full_name: string; email: string; role: string;
  facility_id: string; county_id: number; phone?: string; active: boolean;
}

const ROLES = ["doctor","nurse","chw","admin","pharmacist","analyst"].map(r => ({ value: r, label: r.charAt(0).toUpperCase()+r.slice(1) }));

export default function StaffPage() {
  const { get, post } = useApi();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name:"", email:"", password:"", role:"nurse", facility_id:"dev-facility", county_id:47, phone:"" });

  async function load() {
    try {
      setLoading(true);
      const data = await get<Staff[]>("novela", "/staff/");
      setStaff(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("novela", "/staff/", { ...form, county_id: Number(form.county_id) });
      setModal(false);
      setForm({ full_name:"", email:"", password:"", role:"nurse", facility_id:"dev-facility", county_id:47, phone:"" });
      load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const roleColor: Record<string,string> = { doctor:"blue", nurse:"green", admin:"purple", chw:"amber", pharmacist:"blue", analyst:"gray" };

  const rows = staff.map(s => [
    s.full_name,
    s.email,
    <Badge label={s.role} color={roleColor[s.role] || "gray"} />,
    s.facility_id,
    s.phone || "—",
    <Badge label={s.active ? "Active" : "Inactive"} color={s.active ? "green" : "gray"} />,
  ]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Staff Registry"
        sub={`${staff.length} staff members`}
        action={<Button onClick={() => setModal(true)}>+ Add Staff</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["doctor","nurse","chw","admin"].map(role => (
          <StatCard key={role} label={role} value={staff.filter(s=>s.role===role).length}
            color={roleColor[role] || "blue"} />
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Name","Email","Role","Facility","Phone","Status"]}
          rows={rows}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Staff Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+2547XXXXXXXX" />
          <Select label="Role" value={form.role} onChange={e => setForm({...form, role: e.target.value})} options={ROLES} />
          <Input label="Facility ID" value={form.facility_id} onChange={e => setForm({...form, facility_id: e.target.value})} required />
          <Input label="County ID" type="number" value={form.county_id} onChange={e => setForm({...form, county_id: Number(e.target.value)})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
