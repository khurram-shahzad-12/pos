'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setPermissions(data.user.permissions || []);
        setIsAuthenticated(true);
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMe();
      setIsLoading(false);
    })();
  }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setUser(data.user);
      setPermissions(data.user.permissions || []);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const hasPermission = useCallback(
    (perm) => permissions.includes(perm),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (arr = []) => arr.some((p) => permissions.includes(p)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (arr = []) => arr.every((p) => permissions.includes(p)),
    [permissions]
  );

  const value = useMemo(
    () => ({
      user,
      permissions,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      refreshMe: fetchMe,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [user, permissions, isAuthenticated, isLoading, error, login, logout, fetchMe, hasPermission, hasAnyPermission, hasAllPermissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}