import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Button, StatCard } from "../../components/UI";

interface Invoice {
  id: string; patient_id: string; total_kes: number;
  status: string; nhif_number?: string; created_at: string;
}

export default function Billing() {
  const { get, post } = useApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [stkModal, setStkModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState("test-patient-001");
  const [form, setForm] = useState({ patient_id:"test-patient-001", facility_id:"dev-facility",
    item_desc:"Consultation", item_qty:1, item_price:500, nhif_number:"" });
  const [mpesa, setMpesa] = useState({ invoice_id:"", phone:"254700000000", amount_kes:500 });

  async function load(pid = patientId) {
    try { setLoading(true);
      const data = await get<Invoice[]>("novela", `/billing/invoices/${pid}`);
      setInvoices(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleInvoice(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await post("novela", "/billing/invoices", {
        patient_id: form.patient_id, facility_id: form.facility_id,
        nhif_number: form.nhif_number || undefined,
        items: [{ description: form.item_desc, quantity: form.item_qty, unit_price_kes: form.item_price }],
      });
      setModal(false); load();
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleStk(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await post<any>("novela", "/billing/mpesa/stk-push", mpesa);
      alert(`STK push sent. Checkout ID: ${res.checkout_request_id}`);
      setStkModal(false);
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const statusColor: Record<string,string> = { pending:"amber", paid:"green", cancelled:"red" };
  const totalRevenue = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+Number(i.total_kes),0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Billing & NHIF"
        action={<div className="flex gap-2">
          <Button variant="secondary" onClick={() => setStkModal(true)}>M-Pesa STK</Button>
          <Button onClick={() => setModal(true)}>+ Invoice</Button>
        </div>} />

      <div className="flex gap-2">
        <input value={patientId} onChange={e => setPatientId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Patient ID" />
        <Button onClick={() => load(patientId)}>Search</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Invoices" value={invoices.length} color="blue" />
        <StatCard label="Paid" value={invoices.filter(i=>i.status==="paid").length} color="green" />
        <StatCard label="Revenue (KES)" value={`${totalRevenue.toLocaleString()}`} color="purple" />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Patient","Total (KES)","NHIF","Status","Date"]}
          rows={invoices.map(i => [
            i.patient_id,
            `KES ${Number(i.total_kes).toLocaleString()}`,
            i.nhif_number || "—",
            <Badge label={i.status} color={statusColor[i.status]||"gray"} />,
            new Date(i.created_at).toLocaleDateString(),
          ])}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Invoice">
        <form onSubmit={handleInvoice} className="space-y-4">
          <Input label="Patient ID" value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} required />
          <Input label="Item Description" value={form.item_desc} onChange={e=>setForm({...form,item_desc:e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantity" type="number" value={form.item_qty} onChange={e=>setForm({...form,item_qty:Number(e.target.value)})} />
            <Input label="Unit Price (KES)" type="number" value={form.item_price} onChange={e=>setForm({...form,item_price:Number(e.target.value)})} />
          </div>
          <Input label="NHIF Number (optional)" value={form.nhif_number} onChange={e=>setForm({...form,nhif_number:e.target.value})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Saving…":"Create Invoice"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={stkModal} onClose={()=>setStkModal(false)} title="M-Pesa STK Push">
        <form onSubmit={handleStk} className="space-y-4">
          <Input label="Invoice ID" value={mpesa.invoice_id} onChange={e=>setMpesa({...mpesa,invoice_id:e.target.value})} required />
          <Input label="Phone (2547XXXXXXXX)" value={mpesa.phone} onChange={e=>setMpesa({...mpesa,phone:e.target.value})} required />
          <Input label="Amount (KES)" type="number" value={mpesa.amount_kes} onChange={e=>setMpesa({...mpesa,amount_kes:Number(e.target.value)})} required />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setStkModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Sending…":"Send STK Push"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
