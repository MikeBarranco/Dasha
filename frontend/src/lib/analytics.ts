// Google Analytics (GA4) con Consent Mode v2. Se activa SOLO en el dominio de
// producción para no ensuciar los números con pruebas de staging o local. El ID
// de medición no es secreto (viaja en el cliente), por eso puede vivir en el código.
//
// Consent Mode: la etiqueta se carga en producción para TODOS, pero con la
// analítica DENEGADA por defecto (sin cookies, solo pings anónimos que le dan a GA
// datos básicos de tráfico). Si el usuario acepta "todas" en el banner de cookies,
// concedemos el consentimiento y la analítica pasa a completa (con cookies). Así GA
// recoge datos respetando la privacidad: nada de cookies de analítica sin permiso.
const GA_MEASUREMENT_ID = 'G-J5NQ161QHP';
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

// Carga la etiqueta de Google y fija el consentimiento por defecto en DENEGADO.
// Es idempotente y solo corre en producción.
export function initAnalytics(): void {
  if (initialized || !isEnabled()) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  // Consent Mode: por defecto TODO denegado. Debe ir ANTES del config. Con la
  // analítica denegada, GA manda pings anónimos (sin cookies ni identificadores).
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  window.gtag('js', new Date());
  // send_page_view en false: como es una app de una sola página, mandamos la
  // vista a mano en cada cambio de ruta (ver AnalyticsTracker).
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
}

// El usuario aceptó las cookies de analítica: subimos el consentimiento a
// "granted" (analítica completa, con cookies). Si aún no se cargó la etiqueta, la
// cargamos primero.
export function grantAnalyticsConsent(): void {
  if (!initialized) initAnalytics();
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
}

export function trackPageView(path: string): void {
  if (!initialized || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
