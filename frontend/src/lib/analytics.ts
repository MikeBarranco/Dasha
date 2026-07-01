// Google Analytics (GA4). Se activa SOLO en el dominio de producción para no
// ensuciar los números con pruebas de staging o local. El ID de medición no es
// secreto (viaja en el cliente), por eso puede vivir en el código.
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
  window.gtag('js', new Date());
  // send_page_view en false: como es una app de una sola página, mandamos la
  // vista a mano en cada cambio de ruta (ver AnalyticsTracker).
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageView(path: string): void {
  if (!initialized || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
