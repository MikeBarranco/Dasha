import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from '../../lib/analytics';
import { hasAnalyticsConsent } from '../../lib/cookieConsent';

// Arranca Analytics una vez (SOLO si el usuario aceptó las cookies de analítica) y
// registra una vista cada vez que cambia la ruta. Si no hay consentimiento,
// initAnalytics no corre y trackPageView queda como no-op; al aceptar en el banner
// de cookies, este arranca Analytics en ese momento.
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (hasAnalyticsConsent()) initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
