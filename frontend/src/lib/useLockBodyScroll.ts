import { useEffect } from 'react';

// Bloquea el scroll del fondo mientras un modal está abierto.
export function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}
