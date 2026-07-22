import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Radio,
  MapPin,
  Clock,
  Navigation,
  AlertCircle,
  ShieldCheck,
  Ambulance,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import {
  getMe,
  getVolunteerAvailability,
  setVolunteerAvailability,
  getMyRescueAssignments,
  getNearbyReports,
  acceptReport,
  availabilityRadiusOptions,
  rescueStatusLabels,
  type MeProfile,
  type VolunteerAvailability,
  type RescueAssignment,
} from '../lib/api';
import type { Report } from '../data/mockReports';

type LatLng = { lat: number; lng: number };

// Distancia en metros entre dos puntos (haversine), para ordenar por cercanía.
function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function distanceLabel(meters: number): string {
  return meters < 1000 ? `a ${Math.round(meters)} m` : `a ${(meters / 1000).toFixed(1)} km`;
}

const severityRank: Record<string, number> = { critica: 0, media: 1, baja: 2 };
const severityStyles: Record<string, string> = {
  critica: 'bg-alerta/10 text-alerta',
  media: 'bg-naranja/10 text-naranja',
  baja: 'bg-neutral-100 text-neutral-500',
};

// Pide la ubicación una vez. Devuelve null si el usuario la niega o falla.
function getCurrentPosition(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function PanelVoluntarioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [me, setMe] = useState<MeProfile | null | undefined>(undefined);
  const [availability, setAvailability] = useState<VolunteerAvailability>({
    active: false,
    radiusKm: 5,
  });
  const [savingAvail, setSavingAvail] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [locWarning, setLocWarning] = useState(false);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [nearby, setNearby] = useState<Report[] | null>(null);
  const [nearbyError, setNearbyError] = useState(false);
  const [assignments, setAssignments] = useState<RescueAssignment[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
    getVolunteerAvailability()
      .then(setAvailability)
      .catch(() => setAvailability({ active: false, radiusKm: 5 }));
    getMyRescueAssignments()
      .then((list) =>
        setAssignments(
          list.filter((item) => item.status !== 'completed' && item.status !== 'cancelled'),
        ),
      )
      .catch(() => setAssignments([]));
  }, []);

  // Trae emergencias cercanas para un radio y ubicación dados.
  const loadNearby = async (position: LatLng, radiusKm: number) => {
    setNearbyError(false);
    try {
      const reports = await getNearbyReports(position.lat, position.lng, radiusKm);
      const list = reports
        .filter((report) => report.status !== 'Rescatado' && !report.activeAssignmentId)
        .map((report) => ({
          report,
          distance: distanceMeters(position, { lat: report.lat, lng: report.lng }),
        }))
        .sort((a, b) => {
          const sev = (severityRank[a.report.severity] ?? 1) - (severityRank[b.report.severity] ?? 1);
          return sev !== 0 ? sev : a.distance - b.distance;
        });
      setNearby(list.map((item) => item.report));
    } catch {
      setNearbyError(true);
      setNearby([]);
    }
  };

  // Enciende/apaga la disponibilidad. Al encender, manda también la ubicación.
  const toggleActive = async () => {
    if (savingAvail) return;
    const next = !availability.active;
    setSavingAvail(true);
    setAvailError(null);
    setLocWarning(false);
    try {
      let position: LatLng | null = coords;
      if (next) {
        position = await getCurrentPosition();
        if (position) setCoords(position);
        else setLocWarning(true);
      }
      await setVolunteerAvailability({
        active: next,
        radiusKm: availability.radiusKm,
        lat: position?.lat,
        lng: position?.lng,
      });
      setAvailability((current) => ({ ...current, active: next }));
      if (next && position) {
        setNearby(null);
        await loadNearby(position, availability.radiusKm);
      }
      if (!next) setNearby(null);
    } catch (err) {
      setAvailError(err instanceof Error ? err.message : 'No se pudo actualizar tu disponibilidad.');
    } finally {
      setSavingAvail(false);
    }
  };

  // Cambia el radio. Si está activo, lo guarda y recarga las emergencias.
  const changeRadius = async (radiusKm: number) => {
    if (savingAvail || radiusKm === availability.radiusKm) return;
    setAvailability((current) => ({ ...current, radiusKm }));
    if (!availability.active) return;
    setSavingAvail(true);
    setAvailError(null);
    try {
      await setVolunteerAvailability({
        active: true,
        radiusKm,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      if (coords) {
        setNearby(null);
        await loadNearby(coords, radiusKm);
      }
    } catch (err) {
      setAvailError(err instanceof Error ? err.message : 'No se pudo actualizar el radio.');
    } finally {
      setSavingAvail(false);
    }
  };

  const acceptCase = async (report: Report) => {
    if (acceptingId) return;
    setAcceptingId(report.id);
    try {
      const assignment = await acceptReport(report.id);
      const rescueId = assignment?.id ? String(assignment.id).trim() : '';
      if (rescueId) {
        navigate(`/rescate/${rescueId}`);
      } else {
        // El caso quedó aceptado pero el backend no devolvió un rescate abrible:
        // NO navegamos a "/rescate/" (que no existe y deja la pantalla en blanco).
        setNearby((current) => current?.filter((item) => item.id !== report.id) ?? null);
        alert(
          'Aceptaste el caso, pero aún no se pudo abrir el rescate en vivo. Lo encuentras en "Mis casos activos".',
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo aceptar el caso.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (me === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-cobalto" />
      </div>
    );
  }

  if (!user || !me) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-neutral-300" />
        <p className="mt-3 font-semibold text-neutral-700">Inicia sesión para ver tu panel</p>
        <Link
          to="/login"
          className="mt-4 inline-block rounded-xl bg-cobalto px-5 py-2.5 text-sm font-semibold text-white"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  // Solo voluntarios aprobados (el backend pone role='volunteer' al aprobar).
  if (me.role !== 'volunteer') {
    const pending = me.volunteerStatus === 'pending';
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-neutral-300" />
        <p className="mt-3 font-semibold text-neutral-700">
          {pending ? 'Tu solicitud está en revisión' : 'Este panel es para voluntarios'}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {pending
            ? 'En cuanto validemos tu identidad podrás activar el Modo Activo y recibir casos.'
            : 'Vuélvete voluntario para recibir alertas de rescate cerca de ti.'}
        </p>
        {!pending && (
          <Link
            to="/ser-voluntario"
            className="mt-4 inline-block rounded-xl bg-cobalto px-5 py-2.5 text-sm font-semibold text-white"
          >
            Quiero ser voluntario
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-xl font-bold text-cobalto">
        <Radio className="h-5 w-5" /> Panel de voluntario
      </h1>

      <section
        className={`mt-4 rounded-2xl border p-4 transition-colors ${
          availability.active ? 'border-exito/30 bg-exito/5' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-neutral-800">
              Modo Activo: {availability.active ? 'Activado' : 'Desactivado'}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {availability.active
                ? `Recibes casos en un radio de ${availability.radiusKm} km.`
                : 'Actívalo para recibir emergencias cerca de ti.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={availability.active}
            aria-label="Disponible"
            onClick={toggleActive}
            disabled={savingAvail}
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              availability.active ? 'bg-exito' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                availability.active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-neutral-500">Radio de alcance</p>
          <div className="flex gap-2">
            {availabilityRadiusOptions.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => changeRadius(radius)}
                disabled={savingAvail}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  availability.radiusKm === radius
                    ? 'border-cobalto bg-cobalto/5 text-cobalto'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {radius} km
              </button>
            ))}
          </div>
        </div>

        {savingAvail && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
          </p>
        )}
        {locWarning && availability.active && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-naranja">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Activa la ubicación del navegador para ver los casos más cercanos a ti.
          </p>
        )}
        {availError && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-alerta">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {availError}
          </p>
        )}
      </section>

      {assignments && assignments.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-cobalto">Mis casos activos</h2>
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <article
                key={assignment.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {assignment.animal?.name || 'Traslado en curso'}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {rescueStatusLabels[assignment.status]}
                    {assignment.destination?.organizationName
                      ? ` · ${assignment.destination.organizationName}`
                      : ''}
                  </p>
                </div>
                <Link
                  to={`/rescate/${assignment.id}`}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Radio className="h-4 w-4" /> Ver ruta
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-cobalto">
          <Ambulance className="h-4 w-4" /> Emergencias cercanas
        </h2>

        {!availability.active && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
            <Radio className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">Activa el Modo Activo</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando estés disponible verás aquí los casos por atender cerca de ti.
            </p>
          </div>
        )}

        {availability.active && nearby === null && !nearbyError && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {availability.active && nearbyError && (
          <div className="flex flex-col items-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-8 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No pudimos cargar los casos cercanos</p>
            <button
              type="button"
              onClick={() => coords && loadNearby(coords, availability.radiusKm)}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Reintentar
            </button>
          </div>
        )}

        {availability.active && nearby !== null && !nearbyError && nearby.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-exito" />
            <p className="mt-2 font-semibold text-neutral-700">Sin emergencias por ahora</p>
            <p className="mt-1 text-sm text-neutral-500">
              No hay casos por atender en tu radio. Te avisaremos si aparece uno.
            </p>
          </div>
        )}

        {availability.active && nearby !== null && nearby.length > 0 && (
          <div className="space-y-3">
            {nearby.map((report) => (
              <article
                key={report.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                <div className="flex gap-3 p-3">
                  <img
                    src={report.photo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-animal.svg';
                    }}
                    className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          severityStyles[report.severity] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {report.severity === 'critica'
                          ? 'Urgente'
                          : report.severity === 'media'
                            ? 'Media'
                            : 'Baja'}
                      </span>
                      <span className="text-xs font-medium text-neutral-500">
                        {report.species === 'gato' ? 'Gato' : 'Perro'} · {report.condition}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                        {coords
                          ? distanceLabel(distanceMeters(coords, { lat: report.lat, lng: report.lng }))
                          : ''}{' '}
                        · {report.colonia}
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
                <div className="border-t border-neutral-100 p-3">
                  <button
                    type="button"
                    onClick={() => acceptCase(report)}
                    disabled={acceptingId === report.id}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-naranja py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <Navigation className="h-4 w-4" />
                    {acceptingId === report.id ? 'Aceptando…' : 'VOY EN CAMINO'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
