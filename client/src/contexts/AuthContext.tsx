import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserMode } from './MarketplaceContext';
import { setAuthToken, clearAuthToken, authFetch } from '@/lib/authFetch';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  roles: UserMode[];
  address: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
}

export interface RegisterData {
  cpf: string;
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addRole: (role: UserMode, extra?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  hasRole: (role: UserMode) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'auth-user';

async function publicApi(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
        fetch(`/api/auth/user/${parsed.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.user) {
              setUser(data.user as AuthUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            } else {
              setUser(null);
              localStorage.removeItem(STORAGE_KEY);
              clearAuthToken();
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        clearAuthToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await publicApi('POST', '/api/auth/login', { email, password });
      if (data.error) return { success: false, error: data.error };
      setUser(data.user as AuthUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      if (data.token) setAuthToken(data.token);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const register = async (formData: RegisterData) => {
    try {
      const data = await publicApi('POST', '/api/auth/register', formData);
      if (data.error) return { success: false, error: data.error };
      setUser(data.user as AuthUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      if (data.token) setAuthToken(data.token);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const logout = () => {
    if (user?.id) {
      localStorage.removeItem(`marketplace-mode_${user.id}`);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('marketplace-mode');
    clearAuthToken();
  };

  const addRole = async (role: UserMode, extra?: Record<string, unknown>) => {
    if (!user) return { success: false, error: 'Não autenticado' };
    try {
      const res = await authFetch('/api/auth/add-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role, ...extra }),
      });
      const data = await res.json();
      if (data.error) return { success: false, error: data.error };
      setUser(data.user as AuthUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      if (data.token) setAuthToken(data.token);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const hasRole = (role: UserMode) => {
    return user?.roles.includes(role) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, addRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
