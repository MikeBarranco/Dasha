import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Stethoscope, Check } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { updateMyOrgAnimalStatus } from '../../lib/api';
import type { Animal, AnimalStatus } from '../../data/mockAnimals';

const statusOptions: AnimalStatus[] = ['En tratamiento', 'Recuperándose', 'Buscando hogar'];

// Etiqueta de nuestro modelo -> enum que espera el backend.
const statusToSlug: Record<AnimalStatus, string> = {
  'En tratamiento': 'in_treatment',
  Recuperándose: 'recovering',
  'Buscando hogar': 'looking_for_adoption',
};

type PortalAnimalSheetProps = {
  animal: Animal;
  preview: boolean;
  onClose: () => void;
  onStatusChanged: (id: string, status: AnimalStatus) => void;
};

export function PortalAnimalSheet({
  animal,
  preview,
  onClose,
  onStatusChanged,
}: PortalAnimalSheetProps) {
  useLockBodyScroll();
  const [status, setStatus] = useState<AnimalStatus>(animal.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeline = animal.timeline ?? [];
  const changed = status !== animal.status;

  const save = async () => {
    setError(null);
    if (preview) {
      onStatusChanged(animal.id, status);
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      await updateMyOrgAnimalStatus(animal.id, statusToSlug[status]);
      onStatusChanged(animal.id, status);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="relative">
          <img
            src={animal.photos[animal.photos.length - 1]}
            alt={animal.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/placeholder-animal.svg';
            }}
            className="h-52 w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-cobalto">{animal.name}</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              {animal.species === 'perro' ? 'Perro' : 'Gato'}
            </span>
          </div>

          {animal.diagnosis && (
            <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
              <Stethoscope className="h-4 w-4 text-cobalto" /> {animal.diagnosis}
            </p>
          )}
          {animal.story && <p className="mt-2 text-sm text-neutral-600">{animal.story}</p>}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Estatus</label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AnimalStatus);
                setSaved(false);
              }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {error && <p className="mt-2 text-sm text-alerta">{error}</p>}
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-exito">
                <Check className="h-4 w-4" /> Estatus actualizado{preview ? ' (vista previa)' : ''}.
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || !changed}
              className="mt-3 w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar estatus'}
            </button>
          </div>

          {timeline.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Seguimiento</p>
              <ol className="space-y-3">
                {timeline.map((event, index) => (
                  <li key={`${index}-${event.title}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cobalto" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      {event.when && <p className="text-xs text-neutral-400">{event.when}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-neutral-400">
            La cartilla (vacunas y tratamientos) llegará pronto.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
