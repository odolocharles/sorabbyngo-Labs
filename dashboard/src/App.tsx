import React, { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  Activity, Users, Calendar, Package, BarChart2,
  HeartPulse, Baby, Pill, Globe, Menu, X, LogOut,
} from "lucide-react";
import WardMonitor from "./pages/pulse/WardMonitor";

// Lazy page placeholders
const Page = ({ title }: { title: string }) => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-700">{title}</h2>
    <p className="text-gray-400 mt-2">Content loading…</p>
  </div>
);

const NAV = [
  {
    section: "Pulse",
    icon: HeartPulse,
    color: "text-red-500",
    items: [
      { label: "Ward Monitor", path: "/pulse/ward", element: <WardMonitor /> },
      { label: "Patient Vitals", path: "/pulse/patient", element: <Page title="Patient Vitals" /> },
      { label: "Alerts", path: "/pulse/alerts", element: <Page title="Active Alerts" /> },
      { label: "Devices", path: "/pulse/devices", element: <Page title="Devices" /> },
    ],
  },
  {
    section: "Novela",
    icon: Users,
    color: "text-blue-500",
    items: [
      { label: "Staff", path: "/novela/staff", element: <Page title="Staff Registry" /> },
      { label: "Appointments", path: "/novela/appointments", element: <Page title="Appointments" /> },
      { label: "Billing", path: "/novela/billing", element: <Page title="Billing & NHIF" /> },
    ],
  },
  {
    section: "Karibu",
    icon: Baby,
    color: "text-pink-500",
    items: [
      { label: "CHW Registry", path: "/karibu/chw", element: <Page title="CHW Registry" /> },
      { label: "Home Visits", path: "/karibu/visits", element: <Page title="Home Visits" /> },
      { label: "ANC", path: "/karibu/anc", element: <Page title="Antenatal Care" /> },
    ],
  },
  {
    section: "Dawa",
    icon: Pill,
    color: "text-green-500",
    items: [
      { label: "Stock", path: "/dawa/stock", element: <Page title="Drug Stock" /> },
      { label: "Forecasting", path: "/dawa/forecast", element: <Page title="Forecasting" /> },
      { label: "Procurement", path: "/dawa/procurement", element: <Page title="Procurement" /> },
    ],
  },
  {
    section: "Taifa",
    icon: Globe,
    color: "text-purple-500",
    items: [
      { label: "National", path: "/taifa/national", element: <Page title="National Overview" /> },
      { label: "County", path: "/taifa/county", element: <Page title="County Analytics" /> },
      { label: "Surveillance", path: "/taifa/surveillance", element: <Page title="Surveillance Alerts" /> },
    ],
  },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-gray-900 text-white z-30 flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <span className="font-bold text-lg tracking-tight">Sorabbyngo</span>
          <button onClick={onClose} className="lg:hidden">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-3">
          {NAV.map(({ section, icon: Icon, color, items }) => (
            <div key={section}>
              <div className={`flex items-center gap-2 px-2 mb-1 text-xs font-semibold uppercase tracking-wider ${color}`}>
                <Icon size={13} />
                {section}
              </div>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded text-sm transition-colors
                    ${isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-700 p-3">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-2 py-1.5">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const allRoutes = NAV.flatMap((n) => n.items);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
          <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
            <button
              className="lg:hidden text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="text-sm text-gray-500">Sorabbyngo Health Platform</span>
          </header>
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Page title="Welcome to Sorabbyngo" />} />
              {allRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
