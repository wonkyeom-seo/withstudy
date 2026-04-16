import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const STORAGE_KEY = "withstudy_auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.get("/auth/me", { token });
        if (active) {
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [token]);

  function applySession(nextToken, nextUser) {
    if (!nextToken) {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      return;
    }

    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function login(credentials) {
    const data = await api.post("/auth/login", { body: credentials });
    applySession(data.token, data.user);
    return data;
  }

  async function register(payload) {
    return api.post("/auth/register", { body: payload });
  }

  function logout() {
    applySession(null, null);
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        token,
        user,
        setUser,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("AuthProvider 내부에서 사용해야 합니다.");
  }

  return value;
}
