import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:18002";

export interface VitalsMessage {
  type: string;
  patient_id?: string;
  ward?: string;
  heart_rate?: number;
  spo2?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  temperature?: number;
  respiratory_rate?: number;
  news2_score?: number;
  alert_level?: string;
  timestamp?: string;
}

export function useVitalsWS(ward: string) {
  const [vitals, setVitals] = useState<VitalsMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/vitals/${ward}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000); // auto-reconnect
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      const msg: VitalsMessage = JSON.parse(e.data);
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (msg.type === "vitals") {
        setVitals((prev) => [msg, ...prev].slice(0, 200));
      }
    };
  }, [ward]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { vitals, connected };
}
