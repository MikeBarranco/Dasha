import { useEffect, useState } from 'react';
import { getStoredUser } from './api';

type VolunteerStatus = 'none' | 'pending';

const KEY_PREFIX = 'dasha-volunteer:';
const CHANGE_EVENT = 'dasha-volunteer-change';
const AUTH_EVENT = 'dasha-auth-change';

function storageKey(): string | null {
  const user = getStoredUser();
  return user ? `${KEY_PREFIX}${user.id}` : null;
}

function readStatus(): VolunteerStatus {
  const key = storageKey();
  if (!key) return 'none';
  return window.localStorage.getItem(key) === 'pending' ? 'pending' : 'none';
}

export function useVolunteerStatus() {
  const [status, setStatus] = useState<VolunteerStatus>(readStatus);

  useEffect(() => {
    const handler = () => setStatus(readStatus());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener(AUTH_EVENT, handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener(AUTH_EVENT, handler);
    };
  }, []);

  const apply = () => {
    const key = storageKey();
    if (!key) return;
    window.localStorage.setItem(key, 'pending');
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { status, apply };
}
