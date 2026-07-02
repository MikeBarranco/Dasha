import { savePushSubscription } from './api';

// Llave pública VAPID de Dasha (la pareja privada vive en el backend de Isabel).
// Se usa para suscribir el navegador al servicio de Web Push.
const VAPID_PUBLIC_KEY =
  'BPJoABRvg_dLxoX7MLNLNV3rDpOptuRO4FyHxPejufbVknisivI2KZjZGKWw55Y3rAB-_i9LzpFe-B8qyFfw9vo';

export type EnablePushResult = 'subscribed' | 'denied' | 'unsupported' | 'error';

// El navegador soporta Web Push solo si tiene Service Worker, PushManager y la
// API de Notificaciones. En iOS solo funciona con la PWA instalada (iOS 16.4+).
export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Las llaves VAPID vienen en base64url; el navegador las pide como bytes.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// Registra el Service Worker (idempotente: si ya está, no pasa nada).
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Sin Service Worker no hay push, pero la app sigue funcionando igual.
  }
}

// ¿Este dispositivo ya está suscrito a las notificaciones push?
export async function hasPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

// Flujo completo de activación (se dispara con un gesto del usuario):
// pide permiso, suscribe al navegador y manda la suscripción al backend.
// El permiso se pide UNA sola vez; el navegador lo recuerda después.
export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushSupported()) return 'unsupported';

  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    await savePushSubscription(subscription.toJSON());
    return 'subscribed';
  } catch {
    return 'error';
  }
}
