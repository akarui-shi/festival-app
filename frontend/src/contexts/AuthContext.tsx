import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import { authService } from '@/services/auth-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: 'RESIDENT' | 'ORGANIZER',
    companyName?: string,
    organizationId?: number,
    joinRequestMessage?: string,
  ) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  isAuthenticated: boolean;
  isResident: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false;
  const roles = (user.roles || []).map((entry) => entry.toUpperCase());
  const target = role.toUpperCase();
  return roles.some((entry) => entry === target || entry === `ROLE_${target}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then(u => { setUser(u); setLoading(false); });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    setUser(res.user);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: 'RESIDENT' | 'ORGANIZER',
    companyName?: string,
    organizationId?: number,
    joinRequestMessage?: string,
  ) => {
    const res = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role,
      companyName,
      organizationId,
      joinRequestMessage,
    });
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const updated = await authService.updateCurrentUser(data);
    setUser(updated);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    const updated = await authService.loginWithToken(token);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateUser, loginWithToken,
      isAuthenticated: !!user,
      isResident: hasRole(user, 'RESIDENT'),
      isOrganizer: hasRole(user, 'ORGANIZER'),
      isAdmin: hasRole(user, 'ADMIN'),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
