import { useCallback, useEffect, useState } from 'react';
import { getStoredUser, followAnimal, unfollowAnimal } from './api';

// "Seguir animal" por usuario. Se guarda en localStorage para que funcione ya
// (y persista por dispositivo) y, cuando el backend exista, se sincroniza para
// recibir los avisos reales. Ver [[bug-voluntario-estado]] para el patrón.
const KEY_PREFIX = 'dasha-following:';
const CHANGE_EVENT = 'dasha-following-change';

function storageKey(): string | null {
  const user = getStoredUser();
  return user ? `${KEY_PREFIX}${user.id}` : null;
}

function readSet(): string[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeSet(ids: string[]): void {
  const key = storageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Sin localStorage no se recuerda; no bloquea.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useFollowAnimal(animalId: string) {
  const [following, setFollowing] = useState(() => readSet().includes(animalId));

  useEffect(() => {
    const handler = () => setFollowing(readSet().includes(animalId));
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [animalId]);

  const toggle = useCallback(() => {
    const current = readSet();
    const isOn = current.includes(animalId);
    writeSet(isOn ? current.filter((id) => id !== animalId) : [...current, animalId]);
    // Sincroniza con el backend cuando exista; best-effort, no bloquea la UI local.
    (isOn ? unfollowAnimal(animalId) : followAnimal(animalId)).catch(() => {});
  }, [animalId]);

  return { following, toggle };
}
