import { useState } from 'react';

export function useShare(title: string, text: string) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;

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
