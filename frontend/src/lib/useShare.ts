import { useState } from 'react';

// `shareUrl` opcional: cuando lo que se comparte NO está reflejado en la URL
// actual (ej. la ficha de un perdido se abre por estado, no por query), el
// llamador pasa la ruta correcta (relativa o absoluta) y aquí la resolvemos.
export function useShare(title: string, text: string, shareUrl?: string) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = shareUrl
      ? new URL(shareUrl, window.location.origin).href
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // el usuario canceló el menú de compartir
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin acceso al portapapeles
    }
  };

  return { share, copied };
}
