// Seguimiento de Google Analytics (GA4) para la app de una sola página.
//
// La ETIQUETA de Google (carga de gtag.js + consentimiento por defecto + config)
// vive en index.html, guardada para que SOLO cargue en producción (dashamx.me).
// Aquí solo: (1) registramos una vista en cada cambio de ruta (el config usa
// send_page_view: false), y (2) encendemos/apagamos el consentimiento de analítica
// según el banner de cookies. Todo se apoya en el window.gtag que crea index.html.
const PRODUCTION_HOSTS = ['dashamx.me', 'www.dashamx.me'];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function isEnabled(): boolean {
  return typeof window !== 'undefined' && PRODUCTION_HOSTS.includes(window.location.hostname);
}

let initialized = false;

// La etiqueta ya la cargó index.html en producción; aquí solo marcamos que está
// lista para empezar a mandar vistas de pantalla.
export function initAnalytics(): void {
  if (initialized || !isEnabled()) return;
  initialized = true;
}

// El usuario aceptó las cookies de analítica (o es el estado por defecto).
export function grantAnalyticsConsent(): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
}

// El usuario eligió "Solo esenciales": retiramos el consentimiento de analítica.
export function denyAnalyticsConsent(): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', { analytics_storage: 'denied' });
}

export function trackPageView(path: string): void {
  if (!initialized || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
