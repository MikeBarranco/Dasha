import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ambulance, AlertCircle, MapPin, Radio, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { getIncomingRescues, intakeReport, type IncomingRescue } from '../../lib/api';
import { useAllyPortal } from '../../lib/useAllyPortal';

// Datos de ejemplo para la vista previa del portal (sin backend real).
const previewRescues: IncomingRescue[] = [
  {
    reportId: 'preview-1',
    assignmentId: 'preview-assignment-1',
    status: 'on_the_way',
    statusLabel: 'En camino',
    species: 'perro',
    condition: 'Herido',
    description: 'Perrito con una pata lastimada cerca del mercado. Está asustado pero tranquilo.',
    colonia: 'Centro',
    photos: ['/placeholder-animal.svg'],
    volunteer: { name: 'Ana Torres', photoUrl: null },
    reportedAgo: 'hace 25 min',
  },
  {
    reportId: 'preview-2',
    assignmentId: null,
    status: 'arrived',
    statusLabel: 'Llegó al destino',
    species: 'gato',
    condition: 'Desnutrido',
    description: 'Gatito muy delgado encontrado en un baldío.',
    colonia: 'La Paz',
    photos: ['/placeholder-animal.svg'],
    volunteer: { name: 'Luis Márquez', photoUrl: null },
    reportedAgo: 'hace 1 h',
  },
];

const statusStyles: Record<string, string> = {
  accepted: 'bg-neutral-100 text-neutral-600',
  on_the_way: 'bg-naranja/10 text-naranja',
  arrived: 'bg-info/10 text-info',
  completed: 'bg-exito/10 text-exito',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

export function PortalRescatesPage() {
  const ctx = useAllyPortal();
  const [rescues, setRescues] = useState<IncomingRescue[] | null>(() =>
    ctx.preview ? previewRescues : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [intakingId, setIntakingId] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getIncomingRescues()
      .then((data) => {
        if (!active) return;
        setRescues(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los rescates');
        setRescues([]);
      });
    return () => {
      active = false;
    };
  }, [ctx.preview]);

  const ingresar = async (rescue: IncomingRescue) => {
    if (ctx.preview) {
      setRescues((current) => current?.filter((item) => item.reportId !== rescue.reportId) ?? null);
      setConfirmingId(null);
      setDoneName(rescue.species === 'gato' ? 'el gatito' : 'el perrito');
      return;
    }
    setIntakingId(rescue.reportId);
    try {
      await intakeReport(rescue.reportId);
      setRescues((current) => current?.filter((item) => item.reportId !== rescue.reportId) ?? null);
      setConfirmingId(null);
      setDoneName(rescue.species === 'gato' ? 'el gatito' : 'el perrito');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo ingresar al animalito.');
    } finally {
      setIntakingId(null);
    }
  };

  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-xl font-bold text-cobalto">
        <Ambulance className="h-5 w-5" /> Rescates entrantes
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Animalitos que un voluntario lleva en camino a tu organización. Cuando llegue, confirma la
        recepción con <span className="font-medium text-neutral-700">Ingresar</span> para abrir su
        ficha de rehabilitación.
      </p>

      {doneName && (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-exito/20 bg-exito/5 px-4 py-3 text-sm text-exito">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>
            Ingresaste a {doneName}. Ya aparece en{' '}
            <Link to="/portal/perritos" className="font-semibold underline">
              Mis perritos
            </Link>
            .
          </span>
        </div>
      )}

      <div className="mt-5">
        {rescues === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No se pudieron cargar los rescates</p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {rescues !== null && !error && rescues.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <Ambulance className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">No hay rescates en camino</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando un voluntario acepte un caso con destino a tu organización, lo verás aquí.
            </p>
          </div>
        )}

        {rescues !== null && rescues.length > 0 && (
          <div className="space-y-3">
            {rescues.map((rescue) => (
              <article
                key={rescue.reportId}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                <div className="flex gap-3 p-3">
                  <img
                    src={rescue.photos[0]}
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
                          statusStyles[rescue.status] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {rescue.statusLabel}
                      </span>
                      {rescue.condition && (
                        <span className="text-xs font-medium text-neutral-500">
                          {rescue.species === 'gato' ? 'Gato' : 'Perro'} · {rescue.condition}
                        </span>
                      )}
                    </div>
                    {rescue.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-neutral-700">
                        {rescue.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                        {rescue.colonia}
                      </span>
                      {rescue.reportedAgo && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {rescue.reportedAgo}
                        </span>
                      )}
                    </div>
                    {rescue.volunteer && (
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar
                          name={rescue.volunteer.name}
                          src={rescue.volunteer.photoUrl ?? undefined}
                          className="h-6 w-6 text-[10px]"
                        />
                        <span className="truncate text-xs text-neutral-600">
                          Lo trae {rescue.volunteer.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-neutral-100 p-3">
                  {rescue.assignmentId && (
                    <Link
                      to={`/rescate/${rescue.assignmentId}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-cobalto transition-colors hover:bg-neutral-50"
                    >
                      <Radio className="h-4 w-4" /> Ver en vivo
                    </Link>
                  )}
                  {confirmingId === rescue.reportId ? (
                    <div className="flex flex-1 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => ingresar(rescue)}
                        disabled={intakingId === rescue.reportId}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-exito py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {intakingId === rescue.reportId ? 'Ingresando…' : 'Sí, confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={intakingId === rescue.reportId}
                        className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(rescue.reportId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Ingresar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {ctx.preview && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <Eye className="h-3.5 w-3.5" />
          En vista previa los cambios no se guardan de verdad.
        </p>
      )}
    </div>
  );
}
