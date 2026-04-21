import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import { authService } from '@/services/auth-service';
import { userHasRole } from '@/lib/auth-roles';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
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
      isResident: userHasRole(user, 'RESIDENT'),
      isOrganizer: userHasRole(user, 'ORGANIZER'),
      isAdmin: userHasRole(user, 'ADMIN'),
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
