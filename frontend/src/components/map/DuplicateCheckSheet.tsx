import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, MapPin, Clock, PawPrint, Maximize2 } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import type { Report } from '../../data/mockReports';

export type DuplicateCandidate = { report: Report; distanceM: number };

export type NewReportSummary = {
  photoUrl: string;
  speciesLabel: string;
  condition: string;
};

type DuplicateCheckSheetProps = {
  newReport: NewReportSummary;
  candidates: DuplicateCandidate[];
  savingId: string | null;
  onSame: (report: Report) => void;
  onDifferent: () => void;
  onClose: () => void;
};

function distanceLabel(meters: number): string {
  return meters < 1000 ? `a ${Math.round(meters)} m` : `a ${(meters / 1000).toFixed(1)} km`;
}

// Antes de publicar, si hay reportes activos muy cerca del mismo tipo de animal,
// mostramos esta hoja para que el usuario confirme si es EL MISMO (suma un
// avistamiento) o es otro (se crea el reporte). Evita duplicados del mismo caso.
export function DuplicateCheckSheet({
  newReport,
  candidates,
  savingId,
  onSame,
  onDifferent,
  onClose,
}: DuplicateCheckSheetProps) {
  useLockBodyScroll();
  const saving = savingId !== null;
  // Foto a la que se le hizo zoom (pantalla completa) para comparar bien si es el
  // mismo animalito. Sin esto, las miniaturas son muy chicas para decidir.
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={saving ? undefined : onClose}
      />

      <motion.div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">¿Es el mismo animalito?</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Encontramos reportes recientes muy cerca. Si es el mismo, súmalo como avistamiento en
              vez de crear un duplicado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-cobalto/20 bg-cobalto/5 p-3">
            <button
              type="button"
              onClick={() => setZoomPhoto(newReport.photoUrl)}
              aria-label="Ver tu foto en grande"
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl"
            >
              <img
                src={newReport.photoUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/placeholder-animal.svg';
                }}
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded-full bg-black/55 p-0.5 text-white">
                <Maximize2 className="h-3 w-3" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-cobalto">Tu reporte</p>
              <p className="truncate text-sm font-medium text-neutral-800">
                {newReport.speciesLabel}
                {newReport.condition ? ` · ${newReport.condition}` : ''}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-medium text-neutral-500">Reportes cercanos</p>
          <div className="space-y-3">
            {candidates.map(({ report, distanceM }) => (
              <div key={report.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setZoomPhoto(report.photo)}
                    aria-label="Ver la foto de este reporte en grande"
                    className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    <img
                      src={report.photo}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/placeholder-animal.svg';
                      }}
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded-full bg-black/55 p-0.5 text-white">
                      <Maximize2 className="h-3 w-3" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-medium text-neutral-800">
                      <PawPrint className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                      {report.species === 'gato' ? 'Gato' : 'Perro'} · {report.condition}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                        {distanceLabel(distanceM)} · {report.colonia}
                      </span>
                      {report.reportedAgo && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {report.reportedAgo}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSame(report)}
                  disabled={saving}
                  className="mt-3 w-full rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {savingId === report.id ? 'Sumando avistamiento…' : 'Es el mismo, sumar avistamiento'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={onDifferent}
            disabled={saving}
            className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            Ninguno, es otro animal
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {zoomPhoto && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomPhoto(null)}
          >
            <img
              src={zoomPhoto}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              aria-label="Cerrar foto"
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
