import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, denyAnalyticsConsent, trackPageView } from '../../lib/analytics';
import { getCookieConsent } from '../../lib/cookieConsent';

// Cargamos la etiqueta de Google en cada visita de producción con la analítica
// CONCEDIDA por defecto (para poder ver el tráfico). Si el usuario ya había elegido
// "Solo esenciales" antes, retiramos el consentimiento. Luego registramos una vista
// en cada cambio de ruta.
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
    if (getCookieConsent() === 'essential') denyAnalyticsConsent();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
