import React, { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { HeartPulse, Users, Baby, Pill, Globe, Menu, X, LogOut, Activity, AlertTriangle, Cpu, Calendar, Receipt, Link, BarChart2, ShieldAlert } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import WardMonitor from "./pages/pulse/WardMonitor";
import PatientVitals from "./pages/pulse/PatientVitals";
import Alerts from "./pages/pulse/Alerts";
import Devices from "./pages/pulse/Devices";
import StaffPage from "./pages/novela/Staff";
import Appointments from "./pages/novela/Appointments";
import Billing from "./pages/novela/Billing";
import IdentityBridge from "./pages/novela/IdentityBridge";
import CHWRegistry from "./pages/karibu/CHWRegistry";
import ANC from "./pages/karibu/ANC";
import Forecasting from "./pages/dawa/Forecasting";
import Procurement from "./pages/dawa/Procurement";
import National from "./pages/taifa/National";
import Surveillance from "./pages/taifa/Surveillance";

const NAV = [
  { section: "Pulse", icon: HeartPulse, color: "text-red-400", items: [
    { label: "Ward Monitor", path: "/pulse/ward", icon: Activity, element: <WardMonitor /> },
    { label: "Patient Vitals", path: "/pulse/vitals", icon: HeartPulse, element: <PatientVitals /> },
    { label: "Alerts", path: "/pulse/alerts", icon: AlertTriangle, element: <Alerts /> },
    { label: "Devices", path: "/pulse/devices", icon: Cpu, element: <Devices /> },
  ]},
  { section: "Novela", icon: Users, color: "text-blue-400", items: [
    { label: "Staff", path: "/novela/staff", icon: Users, element: <StaffPage /> },
    { label: "Appointments", path: "/novela/appointments", icon: Calendar, element: <Appointments /> },
    { label: "Billing", path: "/novela/billing", icon: Receipt, element: <Billing /> },
    { label: "Identity Bridge", path: "/novela/identity", icon: Link, element: <IdentityBridge /> },
  ]},
  { section: "Karibu", icon: Baby, color: "text-pink-400", items: [
    { label: "CHW Registry", path: "/karibu/chw", icon: Users, element: <CHWRegistry /> },
    { label: "ANC", path: "/karibu/anc", icon: Baby, element: <ANC /> },
  ]},
  { section: "Dawa", icon: Pill, color: "text-green-400", items: [
    { label: "Forecasting", path: "/dawa/forecast", icon: BarChart2, element: <Forecasting /> },
    { label: "Procurement", path: "/dawa/procurement", icon: Pill, element: <Procurement /> },
  ]},
  { section: "Taifa", icon: Globe, color: "text-purple-400", items: [
    { label: "National", path: "/taifa/national", icon: Globe, element: <National /> },
    { label: "Surveillance", path: "/taifa/surveillance", icon: ShieldAlert, element: <Surveillance /> },
  ]},
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout, role } = useAuth();
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-gray-950 text-white z-30 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <div>
            <span className="font-bold text-base tracking-tight">Sorabbyngo</span>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400"><X size={16} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          {NAV.map(({ section, icon: Icon, color, items }) => (
            <div key={section}>
              <div className={`flex items-center gap-1.5 px-2 mb-1 text-xs font-semibold uppercase tracking-wider ${color}`}>
                <Icon size={11} />{section}
              </div>
              {items.map(item => (
                <NavLink key={item.path} to={item.path} onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}>
                  <item.icon size={13} />{item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-800 p-2">
          <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-3 py-1.5 rounded hover:bg-gray-800 transition-colors">
            <LogOut size={13} />Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function Shell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const allRoutes = NAV.flatMap(n => n.items);

  if (!token) return <Login />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
          <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
            <button className="lg:hidden text-gray-500" onClick={() => setOpen(true)}><Menu size={20} /></button>
            <span className="text-sm text-gray-400 font-medium">Sorabbyngo Health Platform</span>
          </header>
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<WardMonitor />} />
              {allRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
