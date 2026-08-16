import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoredItem, removeStoredItem, setStoredItem } from "../lib/storage";

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  setToken: (token: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredItem(STORAGE_KEY).then((stored) => {
      setTokenState(stored);
      setLoading(false);
    });
  }, []);

  const setToken = (next: string | null) => {
    setTokenState(next);
    if (next) {
      void setStoredItem(STORAGE_KEY, next);
    } else {
      void removeStoredItem(STORAGE_KEY);
    }
  };

  return <AuthContext.Provider value={{ token, loading, setToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
