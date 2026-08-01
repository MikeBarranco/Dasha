import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarDays, AlertCircle, Plus, MapPin, CalendarClock } from 'lucide-react';
import { PortalEventoSheet } from '../../components/portal/PortalEventoSheet';
import { getEvents } from '../../lib/api';
import type { CommunityEvent } from '../../data/mockComunidad';
import { useAllyPortal } from '../../lib/useAllyPortal';

export function PortalEventosPage() {
  const ctx = useAllyPortal();
  // En vista previa no hay eventos que traer: se arranca vacío (sin fetch).
  const [events, setEvents] = useState<CommunityEvent[] | null>(() =>
    ctx.preview ? [] : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // GET /events trae los eventos de toda la comunidad (ya ordenados y filtrados
  // por fecha en el backend); aquí nos quedamos solo con los de esta organización.
  const fetchEvents = (isActive: () => boolean) => {
    getEvents()
      .then((data) => {
        if (!isActive()) return;
        setEvents(data.filter((event) => event.organizationId === ctx.organizationId));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isActive()) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos');
        setEvents([]);
      });
  };

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    fetchEvents(() => active);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.preview, ctx.organizationId]);

  // Tras publicar, recarga la lista (event handler; reset síncrono permitido).
  const reloadAfterCreate = () => {
    setEvents(null);
    setError(null);
    fetchEvents(() => true);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-cobalto">Eventos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Publica tus jornadas y actividades. Aparecen en Comunidad y se quitan solas al pasar la
            fecha.
          </p>
        </div>
        {!ctx.preview && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Publicar
          </button>
        )}
      </div>

      <div className="mt-5">
        {events === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No se pudieron cargar los eventos</p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {events !== null && !error && events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <img
              src="/illustrations/vacio-eventos.webp"
              alt=""
              aria-hidden="true"
              className="mx-auto h-24 w-24 object-contain"
            />
            <p className="mt-2 font-semibold text-neutral-700">Aún no has publicado eventos</p>
            <p className="mt-1 text-sm text-neutral-500">
              Comparte una jornada de esterilización, una carrera con causa o una colecta. La
              comunidad lo verá en la sección de eventos.
            </p>
            {!ctx.preview && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Publicar mi primer evento
              </button>
            )}
          </div>
        )}

        {events !== null && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="flex gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <img
                  src={event.image}
                  alt=""
                  aria-hidden="true"
                  onError={(el) => {
                    el.currentTarget.onerror = null;
                    el.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-cobalto/10 px-2 py-0.5 text-xs font-medium text-cobalto">
                    {event.type}
                  </span>
                  <p className="mt-1 truncate font-semibold text-neutral-800">{event.title}</p>
                  {event.date && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{event.date}</span>
                    </p>
                  )}
                  {event.place && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{event.place}</span>
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {ctx.preview && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <CalendarDays className="h-3.5 w-3.5" />
          En vista previa no se publican eventos de verdad.
        </p>
      )}

      <AnimatePresence>
        {createOpen && (
          <PortalEventoSheet
            organizationId={ctx.organizationId}
            onClose={() => setCreateOpen(false)}
            onCreated={reloadAfterCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
