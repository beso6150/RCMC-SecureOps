import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import {
  clearAuthStorage,
  getMustChangePassword,
  setMustChangePassword,
} from '../api/client';
import { STORAGE_KEYS } from '../config/env';
import type { AuthUser, LoginPayload } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasStoredToken(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEYS.accessToken));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePasswordState] = useState(getMustChangePassword());

  const refreshUser = useCallback(async () => {
    if (!hasStoredToken()) {
      setUser(null);
      return;
    }
    const me = await authApi.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!hasStoredToken()) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        clearAuthStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [refreshUser]);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setMustChangePasswordState(false);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authApi.login(payload);
    setMustChangePasswordState(result.mustChangePassword);
    if (!result.mustChangePassword) {
      await refreshUser();
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken) ?? undefined;
    await authApi.logout(refreshToken);
    setUser(null);
    setMustChangePasswordState(false);
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
    setMustChangePasswordState(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user) || (hasStoredToken() && mustChangePassword),
      isLoading,
      mustChangePassword,
      login,
      logout,
      refreshUser,
      clearMustChangePassword,
    }),
    [user, isLoading, mustChangePassword, login, logout, refreshUser, clearMustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
