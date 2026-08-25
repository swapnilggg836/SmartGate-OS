'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

export type UserRole = 'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'GM' | 'EMPLOYEE' | 'SECURITY_GUARD';

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
  managerId?: string | null;
  hrAuthorityId?: string | null;
  gmAuthorityId?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  roles?: string[]; // all roles including additional
  employee?: UserEmployee | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isHR: boolean;
  isGM: boolean;
  isEmployee: boolean;
  isSecurity: boolean;
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
        const userData = res.data.data;
        // Fetch additional roles if any
        try {
          const rolesRes = await api.get(`/users/${userData.id}/roles`);
          if (rolesRes.data?.success) {
            userData.roles = rolesRes.data.data.allRoles;
          }
        } catch {
          userData.roles = [userData.role];
        }
        setUser(userData);
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
        // Fetch roles too
        try {
          const rolesRes = await api.get(`/users/${profile.id}/roles`, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` }
          });
          if (rolesRes.data?.success) profile.roles = rolesRes.data.data.allRoles;
        } catch { profile.roles = [profile.role]; }
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
        profile.roles = [profile.role];
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

  const hasRole = (role: UserRole | string): boolean => {
    if (!user) return false;
    if (user.role === role) return true;
    if (user.roles && user.roles.includes(role)) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser: fetchUser,
      hasRole,
      isAdmin: hasRole('SUPER_ADMIN'),
      isManager: hasRole('MANAGER'),
      isHR: hasRole('HR'),
      isGM: hasRole('GM'),
      isEmployee: hasRole('EMPLOYEE'),
      isSecurity: hasRole('SECURITY_GUARD'),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
