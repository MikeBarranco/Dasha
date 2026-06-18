import { useEffect, useState } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  setSession,
  clearSession,
  getStoredUser,
  type AuthUser,
} from './api';

const CHANGE_EVENT = 'dasha-auth-change';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  useEffect(() => {
    const handler = () => setUser(getStoredUser());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setSession(result.user, result.token);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await apiRegister(name, email, password);
    setSession(result.user, result.token);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const logout = () => {
    clearSession();
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { user, login, register, logout };
}
