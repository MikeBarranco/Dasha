import { useEffect, useState } from 'react';
import { defaultAvatar } from './avatars';
import { getStoredUser } from './api';

const KEY_PREFIX = 'dasha-avatar:';
const CHANGE_EVENT = 'dasha-avatar-change';
const AUTH_EVENT = 'dasha-auth-change';

function storageKey(): string | null {
  const user = getStoredUser();
  return user ? `${KEY_PREFIX}${user.id}` : null;
}

function readAvatar(): string {
  const key = storageKey();
  if (!key) return defaultAvatar;
  return window.localStorage.getItem(key) ?? defaultAvatar;
}

// Guarda el avatar de un usuario y avisa a la app. Se usa para sincronizar el
// avatar que viene del backend (GET /me) entre dispositivos.
export function setStoredAvatar(userId: string, url: string): void {
  window.localStorage.setItem(`${KEY_PREFIX}${userId}`, url);
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
    const key = storageKey();
    if (!key) return;
    window.localStorage.setItem(key, url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { avatar, setAvatar };
}
