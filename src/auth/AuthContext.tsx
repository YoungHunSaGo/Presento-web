import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TOKEN_KEY } from '@/api/client';
import type { AuthResponse, User } from '@/api/types';

const USER_KEY = 'presento.user';
interface AuthValue { user: User | null; isAuthed: boolean; signIn: (r: AuthResponse) => void; signOut: () => void }
const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); } catch { return null; } });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const signIn = useCallback((r: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, r.accessToken); localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    setToken(r.accessToken); setUser(r.user);
  }, []);
  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setToken(null); setUser(null); qc.clear();
  }, [qc]);
  const value = useMemo(() => ({ user, isAuthed: !!token, signIn, signOut }), [user, token, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth() { const v = useContext(Ctx); if (!v) throw new Error('useAuth outside AuthProvider'); return v; }
