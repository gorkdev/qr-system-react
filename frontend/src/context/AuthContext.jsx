import { createContext, useContext, useCallback, useMemo, useSyncExternalStore } from "react";

const TOKEN_KEY = "akcan_qr_session_token";

const AuthContext = createContext(null);

const listeners = new Set();
const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const notify = () => listeners.forEach((cb) => cb());

const getToken = () => localStorage.getItem(TOKEN_KEY);

export const AuthProvider = ({ children }) => {
  const token = useSyncExternalStore(subscribe, getToken);

  const isAuthenticated = !!token;

  const login = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    notify();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    notify();
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated, login, logout }),
    [token, isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
