import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Select, Button, StatCard } from "../../components/UI";

interface Order {
  id: string; order_ref: string; facility_id: string; route: string;
  priority: string; status: string; created_at: string; items: any;
}

const ROUTES = [{value:"kemsa",label:"KEMSA"},{value:"direct",label:"Direct"},{value:"emergency",label:"Emergency"}];
const PRIORITIES = [{value:"routine",label:"Routine"},{value:"urgent",label:"Urgent"},{value:"emergency",label:"Emergency"}];

export default function Procurement() {
  const { get, post } = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [facilityId] = useState("dev-facility");
  const [form, setForm] = useState({
    facility_id:"dev-facility", route:"kemsa", priority:"routine", notes:"",
    drug:"", qty:100, unit:"tablets",
  });

  async function load() {
    try { setLoading(true);
      const data = await get<Order[]>("dawa", `/procurement/${facilityId}`);
      setOrders(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("dawa", "/procurement", {
        facility_id: form.facility_id, route: form.route,
        priority: form.priority, notes: form.notes,
        items: [{ drug_name: form.drug, quantity: Number(form.qty), unit: form.unit, category: "essential" }],
      });
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const routeColor: Record<string,string> = { kemsa:"blue", direct:"green", emergency:"red" };
  const priorityColor: Record<string,string> = { routine:"gray", urgent:"amber", emergency:"red" };
  const statusColor: Record<string,string> = { pending:"amber", approved:"green", delivered:"blue", cancelled:"red" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Procurement Orders"
        sub="KEMSA & direct supply routing"
        action={<Button onClick={() => setModal(true)}>+ New Order</Button>} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={orders.length} color="blue" />
        <StatCard label="Pending" value={orders.filter(o=>o.status==="pending").length} color="amber" />
        <StatCard label="Emergency" value={orders.filter(o=>o.priority==="emergency").length} color="red" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Ref","Route","Priority","Status","Date"]}
          rows={orders.map(o => [
            <span className="font-mono text-xs">{o.order_ref}</span>,
            <Badge label={o.route} color={routeColor[o.route]||"gray"} />,
            <Badge label={o.priority} color={priorityColor[o.priority]||"gray"} />,
            <Badge label={o.status} color={statusColor[o.status]||"gray"} />,
            new Date(o.created_at).toLocaleDateString(),
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Procurement Order">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Drug Name" value={form.drug} onChange={e=>setForm({...form,drug:e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantity" type="number" value={form.qty} onChange={e=>setForm({...form,qty:Number(e.target.value)})} />
            <Input label="Unit" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="tablets / vials / packs" />
          </div>
          <Select label="Route" value={form.route} onChange={e=>setForm({...form,route:e.target.value})} options={ROUTES} />
          <Select label="Priority" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} options={PRIORITIES} />
          <Input label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Submitting…":"Submit Order"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
