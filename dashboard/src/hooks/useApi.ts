import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const URLS: Record<string, string> = {
  novela: import.meta.env.VITE_NOVELA_URL || "http://localhost:18001",
  pulse:  import.meta.env.VITE_PULSE_URL  || "http://localhost:18002",
  karibu: import.meta.env.VITE_KARIBU_URL || "http://localhost:18003",
  dawa:   import.meta.env.VITE_DAWA_URL   || "http://localhost:18004",
  taifa:  import.meta.env.VITE_TAIFA_URL  || "http://localhost:18005",
};

function svcUrl(service: string, path: string) {
  return `${URLS[service]}${path}`;
}

export function useApi() {
  const { token } = useAuth();

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const get = useCallback(async <T>(service: string, path: string): Promise<T> => {
    const res = await fetch(svcUrl(service, path), { headers: headers() });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }, [headers]);

  const post = useCallback(async <T>(service: string, path: string, body: unknown): Promise<T> => {
    const res = await fetch(svcUrl(service, path), {
      method: "POST", headers: headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }, [headers]);

  const patch = useCallback(async <T>(service: string, path: string, body: unknown): Promise<T> => {
    const res = await fetch(svcUrl(service, path), {
      method: "PATCH", headers: headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }, [headers]);

  const del = useCallback(async (service: string, path: string): Promise<void> => {
    const res = await fetch(svcUrl(service, path), { method: "DELETE", headers: headers() });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  }, [headers]);

  return { get, post, patch, del };
}
