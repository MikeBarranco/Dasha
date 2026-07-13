import { useEffect, useState } from 'react';
import { Bone, Truck, Home, Stethoscope, Package, HeartHandshake } from 'lucide-react';
import { getMyContributions } from '../../lib/api';
import { type Contribution, type NeedType } from '../../data/needs';

const PREVIEW_COUNT = 4;

const typeIcon: Record<NeedType, typeof Bone> = {
  food: Bone,
  transport: Truck,
  foster: Home,
  medical_service: Stethoscope,
  supplies: Package,
  other: HeartHandshake,
};

export function MyContributions() {
  const [items, setItems] = useState<Contribution[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    getMyContributions().then((result) => {
      if (!active) return;
      setItems(result.items);
      setDemo(result.demo);
    });
    return () => {
      active = false;
    };
  }, []);

  // Si no hay aportes, no mostramos la sección para no dejar un hueco vacío.
  if (items !== null && items.length === 0) return null;

  const shown = items ? (showAll ? items : items.slice(0, PREVIEW_COUNT)) : [];
  const hasMore = items ? items.length > PREVIEW_COUNT : false;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-cobalto">Mis aportes</h2>
        {items && items.length > 0 && (
          <span className="text-xs text-neutral-400">{items.length}</span>
        )}
      </div>

      {items === null ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((contribution) => {
              const Icon = typeIcon[contribution.type];
              return (
                <div
                  key={contribution.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cobalto/10 text-cobalto">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {contribution.title}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {contribution.organizationName}
                      {contribution.createdAgo ? ` · ${contribution.createdAgo}` : ''}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      contribution.status === 'delivered'
                        ? 'bg-exito/10 text-exito'
                        : 'bg-info/10 text-info'
                    }`}
                  >
                    {contribution.status === 'delivered' ? 'Entregado' : 'Comprometido'}
                  </span>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-3 text-sm font-medium text-cobalto hover:underline"
            >
              {showAll ? 'Ver menos' : `Ver más (${items?.length ?? 0})`}
            </button>
          )}

          {demo && (
            <p className="mt-2 text-xs text-neutral-400">
              Ejemplos de demostración; se conectará a tus aportes reales pronto.
            </p>
          )}
        </>
      )}
    </div>
  );
}
