// Consentimiento de cookies. Guardamos la elección del usuario en localStorage.
//   'all'       = acepta cookies esenciales + analítica (Google Analytics)
//   'essential' = solo esenciales (sesión); NO se carga Analytics
// La cookie de sesión (HttpOnly, para el login) es ESENCIAL y no requiere
// consentimiento; Analytics sí, por eso solo se carga con 'all'.
const KEY = 'dasha:cookie-consent';

export type CookieConsent = 'all' | 'essential';

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'all' || value === 'essential' ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsent): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Sin acceso a almacenamiento: la elección solo dura esta sesión.
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'all';
}
