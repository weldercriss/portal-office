import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { httpClient, setAccessToken } from '../../api/httpClient';
import type { AuthUser } from '../../types/auth.types';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, senha: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = '@portal:user';
const TOKEN_STORAGE_KEY = '@portal:token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) setAccessToken(saved);
    return saved;
  });

  /** Recarrega o usuário da sessão: permissões e estado da senha podem ter mudado. */
  async function refreshUser() {
    const atualizado = await httpClient<AuthUser>('/users/me');
    setUser(atualizado);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(atualizado));
  }

  useEffect(() => {
    if (!token) return;
    refreshUser().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sessao aplicada da mesma forma pelo login por senha e pelo login com Google. */
  function aplicarSessao(data: LoginResponse) {
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  async function login(email: string, senha: string) {
    const data = await httpClient<LoginResponse>('/auth/login', { method: 'POST', body: { email, senha } });
    aplicarSessao(data);
  }

  async function loginWithGoogle(credential: string) {
    const data = await httpClient<LoginResponse>('/auth/google', { method: 'POST', body: { credential } });
    aplicarSessao(data);
  }

  async function logout() {
    await httpClient('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  return <AuthContext.Provider value={{ user, accessToken: token, login, loginWithGoogle, refreshUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
