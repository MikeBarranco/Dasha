import { useEffect, useState } from 'react';
import { defaultAvatar } from './avatars';

const STORAGE_KEY = 'dasha-avatar';
const CHANGE_EVENT = 'dasha-avatar-change';

function readAvatar(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? defaultAvatar;
}

export function useAvatar() {
  const [avatar, setAvatarState] = useState<string>(readAvatar);

  useEffect(() => {
    const handler = () => setAvatarState(readAvatar());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const setAvatar = (url: string) => {
    window.localStorage.setItem(STORAGE_KEY, url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { avatar, setAvatar };
}
