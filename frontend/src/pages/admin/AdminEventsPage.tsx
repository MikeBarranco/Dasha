import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { EventFormSheet } from '../../components/admin/EventFormSheet';
import { getAdminEvents, deleteAdminEvent, type AdminEvent } from '../../lib/adminApi';

export function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = (reset: boolean) => {
    if (reset) {
      setEvents(null);
      setError(null);
    }
    getAdminEvents()
      .then((data) => {
        setEvents(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos');
        setEvents([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminEvents()
      .then((data) => {
        if (!active) return;
        setEvents(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos');
        setEvents([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event: AdminEvent) => {
    setEditing(event);
    setFormOpen(true);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminEvent(id);
      setEvents((current) => (current ? current.filter((item) => item.id !== id) : current));
      setConfirmId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo eliminar: ${detail}` : 'No se pudo eliminar el evento.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-cobalto">Eventos</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {events === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar los eventos</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchEvents(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {events !== null && !error && events.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">Aún no hay eventos</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Crea jornadas de esterilización, vacunación o ferias de adopción con el botón “Nuevo”.
          </p>
        </div>
      )}

      {events !== null && events.length > 0 && (
        <div className="mt-6 space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt=""
                    onError={(imgEvent) => {
                      imgEvent.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CalendarDays className="h-6 w-6 text-neutral-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-800">
                  {event.title || 'Sin título'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="rounded-full bg-cobalto/10 px-2 py-0.5 font-medium text-cobalto">
                    {event.categoryLabel}
                  </span>
                  {event.eventDateLabel && (
                    <span className="truncate">{event.eventDateLabel}</span>
                  )}
                </p>
                {(event.location || event.organizationName) && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-400">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {[event.location, event.organizationName].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {confirmId === event.id ? (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(event.id)}
                    disabled={deletingId === event.id}
                    className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {deletingId === event.id ? 'Eliminando…' : 'Sí'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(event)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-cobalto"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(event.id)}
                    aria-label="Eliminar"
                    className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-alerta/5 hover:text-alerta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <EventFormSheet
            event={editing}
            onClose={() => setFormOpen(false)}
            onSaved={() => fetchEvents(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
