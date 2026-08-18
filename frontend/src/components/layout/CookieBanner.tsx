import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { getCookieConsent, setCookieConsent } from '../../lib/cookieConsent';
import { grantAnalyticsConsent } from '../../lib/analytics';

// Banner de consentimiento de cookies (primera visita). Las cookies esenciales
// (sesión) siempre se usan porque sin ellas la app no funciona. La analítica mide
// de forma anónima por defecto (Consent Mode, sin cookies); al aceptar "todas" se
// activa completa (con cookies de Google Analytics).
export function CookieBanner() {
  const [visible, setVisible] = useState(() => getCookieConsent() === null);

  if (!visible) return null;

  const choose = (all: boolean) => {
    setCookieConsent(all ? 'all' : 'essential');
    // Al aceptar "todas", concedemos el consentimiento de analítica (pasa de
    // anónima a completa). En "solo esenciales" se queda anónima (denegada).
    if (all) grantAnalyticsConsent();
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center">
        <Cookie className="hidden h-6 w-6 flex-shrink-0 text-cobalto sm:block" />
        <p className="flex-1 text-sm text-neutral-600">
          Usamos cookies esenciales para que Dasha funcione (tu sesión) y medimos el uso de forma
          anónima para mejorarla. Si aceptas todas, activamos la analítica completa. Consulta nuestro{' '}
          <Link to="/aviso-privacidad" className="font-medium text-cobalto underline">
            Aviso de Privacidad
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 sm:flex-none"
          >
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
