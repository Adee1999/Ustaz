/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  schoolName: string;
  position: string;
  city: string;
  subjects: string[];
  grades: string[];
  standardConformity: string;
  autosave: boolean;
  theme: 'light' | 'dark';
  createdAt: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  schoolName?: string;
  position?: string;
  city?: string;
}

export type ProfileUpdatePayload = Partial<
  Pick<
    AuthUser,
    | 'fullName'
    | 'schoolName'
    | 'position'
    | 'city'
    | 'subjects'
    | 'grades'
    | 'standardConformity'
    | 'autosave'
    | 'theme'
  >
>;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (update: ProfileUpdatePayload) => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'ustaz_auth_token';
export const CURRENT_USER_ID_KEY = 'ustaz_current_user_id';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(CURRENT_USER_ID_KEY, nextUser.id);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_ID_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // On mount (or when token changes), validate session against the server.
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('session expired');
        }
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem(CURRENT_USER_ID_KEY, data.user.id);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCurrentUser();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const message = data.error || 'Кіру мүмкін болмады.';
      setError(message);
      throw new Error(message);
    }
    persistSession(data.token, data.user);
  }, [persistSession]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const message = data.error || 'Тіркелу мүмкін болмады.';
      setError(message);
      throw new Error(message);
    }
    persistSession(data.token, data.user);
  }, [persistSession]);

  const updateProfile = useCallback(async (update: ProfileUpdatePayload) => {
    if (!token) throw new Error('Авторизация қажет.');
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data.error || 'Профильді жаңарту мүмкін болмады.');
    }
    setUser(data.user);
  }, [token]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, login, register, logout, updateProfile, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth AuthProvider ішінде ғана қолданылуы керек.');
  }
  return ctx;
}
