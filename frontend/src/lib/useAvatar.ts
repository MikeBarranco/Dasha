import { useEffect, useState } from 'react';
import { defaultAvatar } from './avatars';
import { getStoredUser, setStoredUserAvatar } from './api';

const KEY_PREFIX = 'dasha-avatar:';
const CHANGE_EVENT = 'dasha-avatar-change';
const AUTH_EVENT = 'dasha-auth-change';

// El avatar vive en la sesión (llega del backend en /auth y /me), así se ve igual
// en cualquier dispositivo. localStorage queda como respaldo local por si una
// respuesta vieja aún no trae avatarUrl.
function readAvatar(): string {
  const user = getStoredUser();
  if (!user) return defaultAvatar;
  if (user.avatarUrl) return user.avatarUrl;
  return window.localStorage.getItem(`${KEY_PREFIX}${user.id}`) ?? defaultAvatar;
}

// Sincroniza el avatar que llega del backend (GET /me) en la sesión y en el
// respaldo local, y avisa a la app para repintar.
export function setStoredAvatar(userId: string, url: string): void {
  window.localStorage.setItem(`${KEY_PREFIX}${userId}`, url);
  const current = getStoredUser();
  if (current && current.id === userId) setStoredUserAvatar(url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAvatar() {
  const [avatar, setAvatarState] = useState<string>(readAvatar);

  useEffect(() => {
    const handler = () => setAvatarState(readAvatar());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener(AUTH_EVENT, handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener(AUTH_EVENT, handler);
    };
  }, []);

  const setAvatar = (url: string) => {
    const user = getStoredUser();
    if (!user) return;
    window.localStorage.setItem(`${KEY_PREFIX}${user.id}`, url);
    setStoredUserAvatar(url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { avatar, setAvatar };
}
