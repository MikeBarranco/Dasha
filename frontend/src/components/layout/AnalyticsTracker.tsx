import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, grantAnalyticsConsent, trackPageView } from '../../lib/analytics';
import { hasAnalyticsConsent } from '../../lib/cookieConsent';

// Con Consent Mode: cargamos la etiqueta de Google en cada visita de producción
// (analítica DENEGADA por defecto → pings anónimos, sin cookies). Si el usuario ya
// había aceptado "todas" antes, subimos el consentimiento a completo. Luego
// registramos una vista en cada cambio de ruta.
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
    if (hasAnalyticsConsent()) grantAnalyticsConsent();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
