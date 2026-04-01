import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { authStorage } from '../utils/storage';
import { hasAnyRole } from '../utils/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authStorage.getUser());
  const [token, setToken] = useState(authStorage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    authStorage.setToken(nextToken);
    authStorage.setUser(nextUser);
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    authStorage.clearAll();
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!authStorage.getToken()) {
      clearAuth();
      return null;
    }

    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    authStorage.setUser(currentUser);
    return currentUser;
  }, [clearAuth]);

  const login = useCallback(
    async (credentials) => {
      const response = await authService.login(credentials);
      persistAuth(response.token, response.user);
      return response.user;
    },
    [persistAuth]
  );

  const register = useCallback(
    async (payload) => {
      const response = await authService.register(payload);
      persistAuth(response.token, response.user);
      return response.user;
    },
    [persistAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshCurrentUser();
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [token, refreshCurrentUser, clearAuth]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshCurrentUser,
      hasRole: (roles) => hasAnyRole(user, roles)
    }),
    [user, token, isLoading, login, register, logout, refreshCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
