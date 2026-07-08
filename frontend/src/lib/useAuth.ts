import { useEffect, useState } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  setSession,
  clearSession,
  getStoredUser,
  API_URL,
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
    setSession(result.user);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await apiRegister(name, email, password);
    setSession(result.user);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const logout = async () => {
    // La cookie de sesión es HttpOnly: solo el backend puede borrarla, así que
    // le pedimos que la destruya. Pase lo que pase con la red, limpiamos el
    // perfil local para que la UI cierre sesión de inmediato.
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    } finally {
      clearSession();
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  };

  return { user, login, register, logout };
}
