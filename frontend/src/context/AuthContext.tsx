import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken as persistToken } from '../lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, verify it
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then((data) => setUser(data))
      .catch(() => {
        persistToken(null);
        setTokenState(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const { user, token } = await api.login(email, password);
    persistToken(token);
    setTokenState(token);
    setUser(user);
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    const { user, token } = await api.register(
      payload.name,
      payload.email,
      payload.password,
      payload.password_confirmation
    );
    persistToken(token);
    setTokenState(token);
    setUser(user);
  };

  const logout = () => {
    api.logout().catch(() => {});
    persistToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}