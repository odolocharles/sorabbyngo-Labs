import React, { useEffect, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { PageHeader, Table, Badge, Spinner, ErrorBox, Modal, Input, Select, Button, StatCard } from "../../components/UI";

interface Device {
  id: string; serial: string; type: string; manufacturer: string;
  model: string; facility_id: string; ward?: string; status: string;
}

const TYPES = ["pulse_oximeter","bp_monitor","ecg","thermometer","ventilator"].map(t=>({value:t,label:t}));

export default function Devices() {
  const { get, post } = useApi();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serial:"", type:"pulse_oximeter", manufacturer:"", model:"",
    facility_id:"dev-facility", ward:"ICU", mqtt_topic:"",
  });

  async function load() {
    try { setLoading(true);
      const data = await get<Device[]>("pulse", "/devices/");
      setDevices(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await post("pulse", "/devices/", form); setModal(false); load(); }
    catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const typeColor: Record<string,string> = { pulse_oximeter:"blue", bp_monitor:"purple", ecg:"red", thermometer:"amber", ventilator:"green" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Medical Devices"
        action={<Button onClick={() => setModal(true)}>+ Register Device</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={devices.length} color="blue" />
        <StatCard label="Active" value={devices.filter(d=>d.status==="active").length} color="green" />
        {["ICU","HDU"].map(w => (
          <StatCard key={w} label={w} value={devices.filter(d=>d.ward===w).length} color="purple" />
        ))}
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <Table
          cols={["Serial","Type","Manufacturer","Model","Ward","Status"]}
          rows={devices.map(d => [
            d.serial, <Badge label={d.type} color={typeColor[d.type]||"gray"} />,
            d.manufacturer, d.model, d.ward||"—",
            <Badge label={d.status} color={d.status==="active"?"green":"gray"} />,
          ])}
        />
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Device">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Serial Number" value={form.serial} onChange={e=>setForm({...form,serial:e.target.value})} required />
          <Select label="Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={TYPES} />
          <Input label="Manufacturer" value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})} required />
          <Input label="Model" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} required />
          <Input label="Ward" value={form.ward} onChange={e=>setForm({...form,ward:e.target.value})} />
          <Input label="MQTT Topic (optional)" value={form.mqtt_topic} onChange={e=>setForm({...form,mqtt_topic:e.target.value})} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={()=>setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving?"Saving…":"Register"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
