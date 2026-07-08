import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  getAdminVolunteers,
  updateVolunteerStatus,
  type AdminVolunteer,
} from '../../lib/adminApi';

const statusStyles: Record<string, string> = {
  pending: 'bg-naranja/10 text-naranja',
  approved: 'bg-exito/10 text-exito',
  rejected: 'bg-alerta/10 text-alerta',
};

const filters: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'all', label: 'Todas' },
];

function PhotoThumb({
  src,
  label,
  onView,
}: {
  src: string | null;
  label: string;
  onView: (src: string) => void;
}) {
  if (!src) {
    return (
      <div className="flex-1">
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-400">
          Sin foto
        </div>
        <p className="mt-1 text-center text-[11px] text-neutral-400">{label}</p>
      </div>
    );
  }
  return (
    <div className="flex-1">
      <button type="button" onClick={() => onView(src)} className="block w-full">
        <img src={src} alt={label} className="h-20 w-full rounded-lg object-cover" />
      </button>
      <p className="mt-1 text-center text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}

function VolunteerCard({
  volunteer,
  onDecision,
  onView,
}: {
  volunteer: AdminVolunteer;
  onDecision: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  onView: (src: string) => void;
}) {
  const [saving, setSaving] = useState<null | 'approved' | 'rejected'>(null);

  const decide = async (status: 'approved' | 'rejected') => {
    setSaving(status);
    try {
      await onDecision(volunteer.id, status);
    } catch {
      setSaving(null);
      alert('No se pudo actualizar la solicitud. Intenta de nuevo.');
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-neutral-800">{volunteer.name}</p>
          {volunteer.email && <p className="truncate text-xs text-neutral-500">{volunteer.email}</p>}
          {volunteer.phone && <p className="text-xs text-neutral-500">{volunteer.phone}</p>}
        </div>
        <span
          className={cn(
            'flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusStyles[volunteer.status] ?? 'bg-neutral-100 text-neutral-500',
          )}
        >
          {volunteer.statusLabel}
        </span>
      </div>

      {volunteer.isFoster && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-purpura">
          <Home className="h-3.5 w-3.5" />
          Hogar temporal
          {volunteer.fosterCapacity ? ` · hasta ${volunteer.fosterCapacity}` : ''}
        </p>
      )}

      {(volunteer.zone || volunteer.helpType || volunteer.availability || volunteer.motivation) && (
        <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
          {volunteer.zone && (
            <p>
              <span className="font-medium text-neutral-600">Zona:</span> {volunteer.zone}
            </p>
          )}
          {volunteer.helpType && (
            <p>
              <span className="font-medium text-neutral-600">Ayuda:</span> {volunteer.helpType}
            </p>
          )}
          {volunteer.availability && (
            <p>
              <span className="font-medium text-neutral-600">Disponibilidad:</span>{' '}
              {volunteer.availability}
            </p>
          )}
          {volunteer.motivation && (
            <p>
              <span className="font-medium text-neutral-600">Motivación:</span> {volunteer.motivation}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <PhotoThumb src={volunteer.idDoc} label="Identificación" onView={onView} />
        <PhotoThumb src={volunteer.idSelfie} label="Selfie con ID" onView={onView} />
      </div>

      {volunteer.status === 'pending' ? (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => decide('rejected')}
            disabled={saving !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-alerta transition-colors hover:bg-alerta/5 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            {saving === 'rejected' ? 'Rechazando…' : 'Rechazar'}
          </button>
          <button
            type="button"
            onClick={() => decide('approved')}
            disabled={saving !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-exito py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving === 'approved' ? 'Aprobando…' : 'Aprobar'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-neutral-400">{volunteer.requestedAgo}</p>
      )}
    </div>
  );
}

export function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<AdminVolunteer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const fetchVolunteers = (reset: boolean) => {
    if (reset) {
      setVolunteers(null);
      setError(null);
    }
    getAdminVolunteers()
      .then((data) => {
        setVolunteers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
        setVolunteers([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminVolunteers()
      .then((data) => {
        if (!active) return;
        setVolunteers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
        setVolunteers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDecision = async (id: string, status: 'approved' | 'rejected') => {
    await updateVolunteerStatus(id, status);
    // Tras decidir, el backend borra las fotos de identidad; reflejamos el nuevo
    // estado y limpiamos las fotos en pantalla.
    setVolunteers((list) =>
      list
        ? list.map((volunteer) =>
            volunteer.id === id
              ? {
                  ...volunteer,
                  status,
                  statusLabel: status === 'approved' ? 'Aprobado' : 'Rechazado',
                  idDoc: null,
                  idSelfie: null,
                }
              : volunteer,
          )
        : list,
    );
  };

  const shown =
    volunteers && filter !== 'all'
      ? volunteers.filter((volunteer) => volunteer.status === filter)
      : volunteers;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">Voluntarios</h1>

      {/* Filtro: desplegable en móvil, pastillas en escritorio */}
      <div className="mt-4">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30 sm:hidden"
        >
          {filters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="hidden gap-2 sm:flex">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === option.value
                  ? 'border-cobalto bg-cobalto text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {volunteers === null && (
        <div className="mt-6 space-y-3">
          {[0, 1].map((index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar las solicitudes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchVolunteers(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {shown !== null && !error && shown.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">Sin solicitudes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            No hay solicitudes en este estado por ahora.
          </p>
        </div>
      )}

      {shown !== null && shown.length > 0 && (
        <div className="mt-6 space-y-3">
          {shown.map((volunteer) => (
            <VolunteerCard
              key={volunteer.id}
              volunteer={volunteer}
              onDecision={handleDecision}
              onView={setViewPhoto}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {viewPhoto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewPhoto(null)}
          >
            <img
              src={viewPhoto}
              alt=""
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setViewPhoto(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
