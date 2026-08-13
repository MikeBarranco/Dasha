import { Check } from 'lucide-react';
import type { RescueStatus } from '../../lib/api';

// Hitos del TRASLADO: del reporte en la calle hasta que el voluntario entrega el
// animalito al aliado. Lo que sigue (rehabilitación, adopción) lo maneja el aliado
// desde su portal, así que no se muestra aquí (se quedaba sin marcar).
const milestones = [
  'Reporte creado',
  'Un voluntario tomó el caso',
  'En camino',
  'Llegó con el aliado',
  'Entregado al aliado',
];

// Hasta qué hito llegó el caso según el estado del traslado (índice en la lista).
// -1 en `cancelled` para no marcar nada más que el reporte inicial.
const reachedByStatus: Record<RescueStatus, number> = {
  accepted: 1,
  on_the_way: 2,
  arrived: 3,
  completed: 4,
  cancelled: 0,
};

type CaseTimelineProps = {
  status: RescueStatus;
};

export function CaseTimeline({ status }: CaseTimelineProps) {
  const reached = reachedByStatus[status] ?? 0;
  const cancelled = status === 'cancelled';

  return (
    <div>
      {cancelled && (
        <p className="mb-3 rounded-lg bg-alerta/10 px-3 py-2 text-xs font-medium text-alerta">
          Este traslado se canceló.
        </p>
      )}
      <ol className="relative">
        {milestones.map((label, index) => {
          const state = index < reached ? 'done' : index === reached ? 'current' : 'pending';
          const isLast = index === milestones.length - 1;
          return (
            <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-[7px] top-5 h-[calc(100%-1rem)] w-px ${
                    state === 'done' ? 'bg-cobalto/40' : 'bg-neutral-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                  state === 'done'
                    ? 'bg-cobalto text-white'
                    : state === 'current'
                      ? 'bg-naranja ring-4 ring-naranja/20'
                      : 'border-2 border-neutral-300 bg-white'
                }`}
              >
                {state === 'done' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <p
                className={`text-sm ${
                  state === 'done'
                    ? 'font-medium text-neutral-700'
                    : state === 'current'
                      ? 'font-semibold text-cobalto'
                      : 'text-neutral-400'
                }`}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
