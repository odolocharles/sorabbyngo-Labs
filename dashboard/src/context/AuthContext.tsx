import React, { createContext, useContext, useState, useCallback } from "react";

interface AuthState {
  token: string | null;
  role: string | null;
  facilityId: string | null;
}

interface AuthCtx extends AuthState {
  login: (token: string, role: string, facilityId: string) => void;
  devLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

const BASE = import.meta.env.VITE_NOVELA_URL || "http://localhost:18001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("srb_token"),
    role: localStorage.getItem("srb_role"),
    facilityId: localStorage.getItem("srb_facility"),
  });

  const login = useCallback((token: string, role: string, facilityId: string) => {
    localStorage.setItem("srb_token", token);
    localStorage.setItem("srb_role", role);
    localStorage.setItem("srb_facility", facilityId);
    setAuth({ token, role, facilityId });
  }, []);

  const devLogin = useCallback(async () => {
    const res = await fetch(`${BASE}/auth/dev-token`, { method: "POST" });
    const data = await res.json();
    login(data.access_token, "admin", "dev-facility");
  }, [login]);

  const logout = useCallback(() => {
    localStorage.clear();
    setAuth({ token: null, role: null, facilityId: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
