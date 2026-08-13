import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Navigation, Loader2, PawPrint } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { getAllies } from '../../lib/api';
import type { Ally } from '../../data/mockAllies';

// Antes de aceptar un rescate, el voluntario elige a qué aliado llevará al
// animalito. Solo aliados de ciclo completo (veterinaria/refugio), ordenados por
// cercanía al reporte. Se puede continuar sin elegir (por si no hay ninguno cerca).

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function distanceLabel(km: number): string {
  return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}

type RescueDestinationSheetProps = {
  reportLat: number;
  reportLng: number;
  accepting: boolean;
  onPick: (orgId: string | undefined, orgName?: string) => void;
  onClose: () => void;
};

export function RescueDestinationSheet({
  reportLat,
  reportLng,
  accepting,
  onPick,
  onClose,
}: RescueDestinationSheetProps) {
  useLockBodyScroll();
  const [allies, setAllies] = useState<Ally[] | null>(null);

  useEffect(() => {
    let active = true;
    getAllies()
      .then((data) => {
        if (!active) return;
        // Cualquier aliado con ubicación puede ser destino (todos reciben animales).
        const usable = data
          .filter((ally) => ally.lat && ally.lng)
          .map((ally) => ({
            ally,
            km: distanceKm(reportLat, reportLng, ally.lat, ally.lng),
          }))
          .sort((a, b) => a.km - b.km)
          .map((item) => item.ally);
        setAllies(usable);
      })
      .catch(() => {
        if (active) setAllies([]);
      });
    return () => {
      active = false;
    };
  }, [reportLat, reportLng]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={accepting ? undefined : onClose}
      />

      <motion.div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">¿A qué aliado lo llevas?</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Elige la veterinaria o refugio para que te esperen y ver la ruta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {allies === null && (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
              ))}
            </div>
          )}

          {allies !== null && allies.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center">
              <PawPrint className="mx-auto h-7 w-7 text-neutral-300" />
              <p className="mt-2 text-sm text-neutral-500">
                No hay aliados registrados cerca. Puedes ir en camino y coordinar el destino después.
              </p>
            </div>
          )}

          {allies !== null && allies.length > 0 && (
            <div className="space-y-2">
              {allies.map((ally) => (
                <button
                  key={ally.id}
                  type="button"
                  onClick={() => onPick(ally.id, ally.name)}
                  disabled={accepting}
                  className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-cobalto/40 disabled:opacity-60"
                >
                  <img
                    src={ally.logoUrl ?? '/placeholder-logo.svg'}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-logo.svg';
                    }}
                    className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">{ally.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                      {distanceLabel(distanceKm(reportLat, reportLng, ally.lat, ally.lng))}
                    </p>
                  </div>
                  <Navigation className="h-4 w-4 flex-shrink-0 text-cobalto" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => onPick(undefined)}
            disabled={accepting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Aceptando…
              </>
            ) : (
              'Voy en camino y decido el destino después'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
