import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '../lib/types';
import { api } from '../lib/api';

const STORAGE_KEY = 'pwpt.session';

interface AuthContextValue {
  session: Session | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitialSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readInitialSession);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: async (phone: string) => {
      const s = await api.login(phone);
      setSession(s);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    },
    logout: () => {
      setSession(null);
      window.localStorage.removeItem(STORAGE_KEY);
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
