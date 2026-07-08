import { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, MapPin, Radio, PawPrint } from 'lucide-react';
import { useRescueLive } from '../lib/useRescueLive';
import { rescueStatusLabels } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';

// El mapa arrastra maplibre; se carga aparte para no engordar el bundle inicial.
const RescueLiveMap = lazy(() =>
  import('../components/rescue/RescueLiveMap').then((module) => ({
    default: module.RescueLiveMap,
  })),
);

export function RescateEnVivoPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { assignment, position, status, connected, simulated } = useRescueLive(assignmentId);

  if (assignment === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lino">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="h-7 w-7 animate-spin text-cobalto" />
          <p className="text-sm font-medium">Cargando el rescate…</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-lino px-6 text-center">
        <PawPrint className="h-9 w-9 text-neutral-300" />
        <p className="font-semibold text-neutral-700">No encontramos este rescate</p>
        <p className="max-w-xs text-sm text-neutral-500">
          Puede que el traslado ya haya terminado.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Volver
        </button>
      </div>
    );
  }

  const currentStatus = status ?? assignment.status;
  const volunteer = assignment.volunteer;
  const orgName = assignment.destination?.organizationName;
  const animalName = assignment.animal?.name;

  return (
    <div className="relative flex h-[100dvh] flex-col bg-lino">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 shadow"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-cobalto shadow">
          <Radio className={`h-4 w-4 ${connected ? 'text-exito' : 'text-neutral-400'}`} />
          Rescate en vivo
        </div>
      </header>

      <div className="flex-1">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-100" />}>
          <RescueLiveMap assignment={assignment} position={position} />
        </Suspense>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3">
            {volunteer && (
              <Avatar
                name={volunteer.name}
                src={volunteer.photoUrl ?? undefined}
                className="h-11 w-11"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-cobalto">
                {rescueStatusLabels[currentStatus]}
              </p>
              <p className="truncate text-sm text-neutral-500">
                {volunteer ? volunteer.name : 'Voluntario'}
                {animalName ? ` lleva a ${animalName}` : ''}
              </p>
            </div>
          </div>
          {orgName && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-600">
              <MapPin className="h-4 w-4 flex-shrink-0 text-cobalto" /> Destino: {orgName}
            </p>
          )}
          {simulated && (
            <p className="mt-2 text-xs text-neutral-400">
              Recorrido en demostración (aún sin GPS en vivo).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
