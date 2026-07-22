import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  MapPin,
  Radio,
  PawPrint,
  Navigation,
  Camera,
  History,
  ChevronDown,
  RefreshCw,
  CircleCheck,
} from 'lucide-react';
import { useRescueLive } from '../lib/useRescueLive';
import { useAuth } from '../lib/useAuth';
import {
  rescueStatusLabels,
  updateRescueAssignmentStatus,
  postRescueLocation,
  addRescuePhoto,
  type RescueStatus,
  type RescuePhotoKind,
} from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { RescuePhotoSheet } from '../components/rescue/RescuePhotoSheet';
import { CaseTimeline } from '../components/rescue/CaseTimeline';

// Pasos que el voluntario activa según el estado. Los pasos con `photo` piden una
// foto de evidencia antes de avanzar. El último paso propio del voluntario es
// "Llegué con el aliado" (arrived): a partir de ahí el cierre (completed) lo hace
// el ALIADO al confirmar la recepción, no el voluntario.
const nextByStatus: Partial<
  Record<RescueStatus, { next: RescueStatus; label: string; photo?: RescuePhotoKind }>
> = {
  accepted: { next: 'on_the_way', label: 'Voy en camino', photo: 'pickup' },
  on_the_way: { next: 'arrived', label: 'Llegué con el aliado', photo: 'delivery' },
};

// Orden del traslado. Sirve para no dejar que el avance optimista local (por
// ejemplo "arrived") tape un estado real más avanzado que llega por el socket
// (por ejemplo "completed" cuando el aliado confirma la recepción).
const statusRank: Record<string, number> = {
  accepted: 0,
  on_the_way: 1,
  arrived: 2,
  completed: 3,
  cancelled: 4,
};

function mostAdvanced(a: RescueStatus, b: RescueStatus): RescueStatus {
  return (statusRank[a] ?? 0) >= (statusRank[b] ?? 0) ? a : b;
}

// El mapa arrastra maplibre; se carga aparte para no engordar el bundle inicial.
const RescueLiveMap = lazy(() =>
  import('../components/rescue/RescueLiveMap').then((module) => ({
    default: module.RescueLiveMap,
  })),
);

export function RescateEnVivoPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignment, position, status, connected, simulated, refresh } = useRescueLive(assignmentId);
  const [pendingStatus, setPendingStatus] = useState<RescueStatus | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [photoStep, setPhotoStep] = useState<RescuePhotoKind | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const realAssignment = assignment ?? null;
  const isDriver = Boolean(
    user && realAssignment?.volunteer && user.id === realAssignment.volunteer.id,
  );
  const baseStatus = status ?? realAssignment?.status ?? null;
  const liveStatus =
    pendingStatus && baseStatus
      ? mostAdvanced(pendingStatus, baseStatus)
      : (pendingStatus ?? baseStatus);

  // El conductor comparte su GPS en vivo mientras va en camino.
  useEffect(() => {
    if (!isDriver || !realAssignment || liveStatus !== 'on_the_way') return;
    if (!navigator.geolocation) return;
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 4000) return;
        lastSent = now;
        void postRescueLocation(realAssignment.id, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriver, realAssignment, liveStatus]);

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

  const currentStatus = liveStatus ?? assignment.status;
  const volunteer = assignment.volunteer;
  const orgName = assignment.destination?.organizationName;
  const animalName = assignment.animal?.name;
  const step = nextByStatus[currentStatus];

  // Mientras el voluntario espera que el aliado confirme la recepción, puede
  // refrescar el estado a mano (el socket también lo actualiza solo).
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      // Silencioso: si falla, el socket sigue escuchando el cambio.
    } finally {
      setRefreshing(false);
    }
  };

  // Al tocar el paso: si pide foto, abrimos la hoja; si no, avanzamos directo.
  const handleStep = () => {
    if (!step || advancing) return;
    if (step.photo) {
      setPhotoStep(step.photo);
      return;
    }
    void runAdvance(null, '');
  };

  // Sube la foto (si hay) y avanza el estado. La foto es evidencia opcional: si
  // su subida falla no bloqueamos el traslado, el estado se actualiza igual.
  const runAdvance = async (photoBase64: string | null, note: string) => {
    if (!step || advancing) return;
    setAdvancing(true);
    try {
      if (step.photo && photoBase64) {
        try {
          await addRescuePhoto(assignment.id, step.photo, photoBase64, note);
        } catch {
          // La evidencia es un extra; seguimos con el avance del estado.
        }
      }
      await updateRescueAssignmentStatus(assignment.id, step.next);
      setPendingStatus(step.next);
      setPhotoStep(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    } finally {
      setAdvancing(false);
    }
  };

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

          {isDriver && step && (
            <button
              type="button"
              onClick={handleStep}
              disabled={advancing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-naranja py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {step.photo ? <Camera className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
              {advancing ? 'Guardando…' : step.label}
            </button>
          )}
          {isDriver && currentStatus === 'on_the_way' && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              Compartiendo tu ubicación en vivo…
            </p>
          )}

          {isDriver && currentStatus === 'arrived' && (
            <div className="mt-3 rounded-xl border border-cobalto/20 bg-cobalto/5 p-3 text-center">
              <p className="text-sm font-medium text-cobalto">
                Llegaste {orgName ? `con ${orgName}` : 'con el aliado'}.
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Esperando que confirmen la recepción de {animalName ?? 'el animalito'}.
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-cobalto/30 bg-white px-4 py-2 text-sm font-semibold text-cobalto transition-colors hover:bg-cobalto/5 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          )}

          {currentStatus === 'completed' && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-exito/10 py-2.5 text-sm font-semibold text-exito">
              <CircleCheck className="h-4 w-4" />
              {animalName ? `${animalName} llegó a salvo` : 'El aliado recibió al animalito'}.
            </div>
          )}

          {simulated && !isDriver && (
            <p className="mt-2 text-xs text-neutral-400">
              Recorrido en demostración (aún sin GPS en vivo).
            </p>
          )}

          <div className="mt-3 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              aria-expanded={showHistory}
              className="flex w-full items-center justify-between text-sm font-medium text-cobalto"
            >
              <span className="flex items-center gap-1.5">
                <History className="h-4 w-4" /> Historia del caso
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>
            {showHistory && (
              <div className="mt-3 max-h-56 overflow-y-auto pr-1">
                <CaseTimeline status={currentStatus} />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {photoStep && (
          <RescuePhotoSheet
            kind={photoStep}
            saving={advancing}
            onConfirm={(photoBase64, note) => runAdvance(photoBase64, note)}
            onClose={() => {
              if (!advancing) setPhotoStep(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
