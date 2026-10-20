import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';

type User = { id: string; name: string; email: string; role: string };
type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ironpulse_token');
    if (!token) { setLoading(false); return; }
    api<{ user: User }>('/auth/me')
      .then(r => setUser(r.user))
      .catch(() => localStorage.removeItem('ironpulse_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('ironpulse_token', r.token);
    setUser(r.user);
  }

  function logout() {
    localStorage.removeItem('ironpulse_token');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
