import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost";

const MODULE_PORTS: Record<string, number> = {
  novela: 8001,
  pulse: 8002,
  karibu: 8003,
  dawa: 8004,
  taifa: 8005,
};

function moduleUrl(module: string, path: string): string {
  const port = MODULE_PORTS[module];
  return port ? `${BASE}:${port}${path}` : `${BASE}/${module}${path}`;
}

export function useApi() {
  const token = localStorage.getItem("srb_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  async function get<T>(module: string, path: string): Promise<T> {
    const { data } = await axios.get<T>(moduleUrl(module, path), { headers });
    return data;
  }

  async function post<T>(module: string, path: string, body: unknown): Promise<T> {
    const { data } = await axios.post<T>(moduleUrl(module, path), body, { headers });
    return data;
  }

  async function patch<T>(module: string, path: string, body: unknown): Promise<T> {
    const { data } = await axios.patch<T>(moduleUrl(module, path), body, { headers });
    return data;
  }

  async function del(module: string, path: string): Promise<void> {
    await axios.delete(moduleUrl(module, path), { headers });
  }

  return { get, post, patch, del };
}
