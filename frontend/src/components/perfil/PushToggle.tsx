import { useEffect, useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { isPushSupported, enablePush, hasPushSubscription } from '../../lib/push';

type State = 'off' | 'on' | 'denied' | 'loading';

// Tarjeta en el perfil para activar las notificaciones push en ESTE dispositivo.
// El permiso se pide una sola vez; si el navegador no lo soporta, no se muestra.
export function PushToggle() {
  const supported = isPushSupported();
  const [state, setState] = useState<State>(() => {
    if (!supported) return 'off';
    if (Notification.permission === 'denied') return 'denied';
    return 'off';
  });

  // Si ya se dio permiso y hay suscripción, mostramos el estado "activado".
  useEffect(() => {
    if (!supported || Notification.permission !== 'granted') return;
    let active = true;
    hasPushSubscription().then((subscribed) => {
      if (active) setState(subscribed ? 'on' : 'off');
    });
    return () => {
      active = false;
    };
  }, [supported]);

  if (!supported) return null;

  const activate = async () => {
    setState('loading');
    const result = await enablePush();
    if (result === 'subscribed') setState('on');
    else if (result === 'denied') setState('denied');
    else setState('off');
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto/10 text-cobalto">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-cobalto">Notificaciones</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Recibe avisos de rescates, novedades y tus medallas directo en este dispositivo.
          </p>

          {state === 'on' ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-exito">
              <Check className="h-4 w-4" />
              Activadas en este dispositivo
            </p>
          ) : state === 'denied' ? (
            <p className="mt-3 text-sm text-neutral-500">
              Están bloqueadas. Actívalas desde los ajustes del navegador para este sitio.
            </p>
          ) : (
            <button
              type="button"
              onClick={activate}
              disabled={state === 'loading'}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
              Activar notificaciones
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
