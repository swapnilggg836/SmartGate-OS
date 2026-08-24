'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

export type UserRole = 'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'SECURITY_GUARD';

export interface UserEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentName: string;
  departmentId: string;
  designation: string;
  phone: string;
  avatarUrl?: string;
  leaveBalances?: any[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employee?: UserEmployee | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  designation: string;
  phone: string;
  role: UserRole;
  employeeCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data);
      }
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Route guard
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.replace('/login');
    } else if (user && isPublic) {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        const { tokens, user: profile } = res.data.data;
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        setUser(profile);
        router.push('/dashboard');
        return { ok: true };
      }
      return { ok: false, error: 'Login failed' };
    } catch (err: any) {
      return { ok: false, error: err.response?.data?.message || 'Invalid email or password' };
    }
  };

  const register = async (data: RegisterData): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await api.post('/auth/register', data);
      if (res.data?.success) {
        const { tokens, user: profile } = res.data.data;
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        setUser(profile);
        router.push('/dashboard');
        return { ok: true };
      }
      return { ok: false, error: 'Registration failed' };
    } catch (err: any) {
      return { ok: false, error: err.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
