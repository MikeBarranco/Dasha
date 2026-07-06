import { useEffect, useState } from 'react';

// Evento no estándar de Chrome/Android/escritorio para instalar la PWA.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari expone navigator.standalone cuando ya está instalada.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isApple = /iphone|ipad|ipod/i.test(ua);
  // iPadOS reciente se reporta como Mac con pantalla táctil.
  const isIPadOS = /Macintosh/.test(ua) && 'ontouchend' in document;
  return (isApple || isIPadOS) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Estado de instalación de la PWA. En Android/escritorio se usa el evento nativo
// beforeinstallprompt; en iOS no existe, así que se muestran instrucciones.
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isStandalone = detectStandalone() || installed;
  const isIOS = detectIOS();

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === 'accepted';
  };

  return {
    // Se puede lanzar el instalador nativo (Android/escritorio).
    canPrompt: deferred !== null,
    isIOS,
    isStandalone,
    promptInstall,
  };
}
