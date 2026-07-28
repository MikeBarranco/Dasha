import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { PawPrint, AlertCircle, ChevronRight } from 'lucide-react';
import { PortalAnimalSheet } from '../../components/portal/PortalAnimalSheet';
import { getMyOrgAnimals } from '../../lib/api';
import { mockAnimals, type Animal } from '../../data/mockAnimals';
import { mockAllies as allies } from '../../data/mockAllies';
import { useAllyPortal } from '../../lib/useAllyPortal';

// Datos de ejemplo para la vista previa: resuelve los ids de animales del aliado
// a sus fichas completas del mock (con timeline).
function previewAnimals(orgId: string): Animal[] {
  const ally = allies.find((item) => item.id === orgId);
  const ids = (ally?.animals ?? []).map((animal) => animal.id);
  return ids
    .map((id) => mockAnimals.find((animal) => animal.id === id))
    .filter((animal): animal is Animal => Boolean(animal));
}

const statusStyles: Record<string, string> = {
  'En tratamiento': 'bg-naranja/10 text-naranja',
  Recuperándose: 'bg-info/10 text-info',
  'Buscando hogar': 'bg-exito/10 text-exito',
  Adoptado: 'bg-purpura/10 text-purpura',
  Fallecido: 'bg-neutral-200 text-neutral-600',
};

export function PortalPerritosPage() {
  const ctx = useAllyPortal();
  const [animals, setAnimals] = useState<Animal[] | null>(() =>
    ctx.preview ? previewAnimals(ctx.organizationId) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getMyOrgAnimals(ctx.adminOrgId)
      .then((data) => {
        if (!active) return;
        setAnimals(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los perritos');
        setAnimals([]);
      });
    return () => {
      active = false;
    };
  }, [ctx.preview, ctx.adminOrgId]);

  const onUpdated = (id: string, patch: Partial<Animal>) => {
    setAnimals((current) =>
      current ? current.map((animal) => (animal.id === id ? { ...animal, ...patch } : animal)) : current,
    );
  };

  const selected = animals?.find((animal) => animal.id === selectedId) ?? null;

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-cobalto">Mis perritos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Los animalitos que atiendes. Toca uno para ver su seguimiento y actualizar su estatus.
      </p>

      <div className="mt-5">
        {animals === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No se pudieron cargar los perritos</p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {animals !== null && !error && animals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <p className="font-semibold text-neutral-700">Aún no tienes perritos asignados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando recibas un rescate aparecerá aquí para darle seguimiento.
            </p>
          </div>
        )}

        {animals !== null && animals.length > 0 && (
          <div className="space-y-3">
            {animals.map((animal) => (
              <button
                key={animal.id}
                type="button"
                onClick={() => setSelectedId(animal.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-cobalto/40"
              >
                <img
                  src={animal.photos[animal.photos.length - 1]}
                  alt={animal.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-800">{animal.name}</p>
                  <p className="truncate text-xs text-neutral-500">{animal.diagnosis}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusStyles[animal.status] ?? 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {animal.status}
                </span>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {ctx.preview && animals !== null && animals.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <PawPrint className="h-3.5 w-3.5" />
          En vista previa los cambios no se guardan de verdad.
        </p>
      )}

      <AnimatePresence>
        {selected && (
          <PortalAnimalSheet
            animal={selected}
            preview={ctx.preview}
            orgId={ctx.adminOrgId}
            onClose={() => setSelectedId(null)}
            onUpdated={onUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
