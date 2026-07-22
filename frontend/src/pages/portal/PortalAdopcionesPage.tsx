import { useState, useEffect } from 'react';
import { Home, AlertCircle, Check, X, MessageCircle, PawPrint } from 'lucide-react';
import {
  getMyOrgAdoptionRequests,
  updateMyOrgAdoptionRequest,
  type AdoptionRequest,
} from '../../lib/api';
import { mockAllies as allies } from '../../data/mockAllies';
import { whatsappUrl } from '../../lib/whatsapp';
import { useAllyPortal } from '../../lib/useAllyPortal';

// Datos de ejemplo para la vista previa (sin backend).
function previewRequests(orgId: string): AdoptionRequest[] {
  const ally = allies.find((item) => item.id === orgId);
  const animals = ally?.animals ?? [];
  const nameOf = (index: number) => animals[index]?.name ?? 'un perrito';
  return [
    {
      id: 'ar1',
      applicantName: 'Laura Méndez',
      whatsapp: '2211234567',
      animalName: nameOf(0),
      housingLabel: 'Casa con patio',
      hasHadPets: true,
      otherPets: 'Un perro adulto',
      reason: 'Queremos darle un hogar tranquilo y con espacio para correr.',
      status: 'pending',
      createdAgo: 'hace 3 h',
    },
    {
      id: 'ar2',
      applicantName: 'Diego Fuentes',
      whatsapp: '2217654321',
      animalName: nameOf(1),
      housingLabel: 'Departamento',
      hasHadPets: false,
      otherPets: '',
      reason: 'Vivo solo y quiero una compañía para cuidar y consentir.',
      status: 'pending',
      createdAgo: 'ayer',
    },
  ];
}

const statusMeta: Record<AdoptionRequest['status'], { label: string; className: string }> = {
  pending: { label: 'Nueva', className: 'bg-naranja/10 text-naranja' },
  accepted: { label: 'Aceptada', className: 'bg-exito/10 text-exito' },
  rejected: { label: 'Rechazada', className: 'bg-neutral-100 text-neutral-500' },
};

export function PortalAdopcionesPage() {
  const ctx = useAllyPortal();
  const [requests, setRequests] = useState<AdoptionRequest[] | null>(() =>
    ctx.preview ? previewRequests(ctx.organizationId) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getMyOrgAdoptionRequests(ctx.adminOrgId)
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
        setRequests([]);
      });
    return () => {
      active = false;
    };
  }, [ctx.preview, ctx.adminOrgId]);

  const decide = async (id: string, status: 'accepted' | 'rejected') => {
    if (ctx.preview) {
      setRequests((current) =>
        current ? current.map((item) => (item.id === id ? { ...item, status } : item)) : current,
      );
      return;
    }
    setBusyId(id);
    try {
      await updateMyOrgAdoptionRequest(id, status, ctx.adminOrgId);
      setRequests((current) =>
        current ? current.map((item) => (item.id === id ? { ...item, status } : item)) : current,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo actualizar: ${detail}` : 'No se pudo actualizar la solicitud.');
    } finally {
      setBusyId(null);
    }
  };

  const list = requests
    ? [...requests].sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending'))
    : requests;
  const pending = (requests ?? []).filter((item) => item.status === 'pending').length;

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-cobalto">Solicitudes de adopción</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Personas interesadas en adoptar a tus perritos. Contáctalas por WhatsApp y define con
        ellas el proceso y los requisitos de tu refugio.
      </p>

      {requests !== null && pending > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-naranja/10 px-3 py-1 text-sm font-medium text-naranja">
          <PawPrint className="h-4 w-4" />
          {pending} {pending === 1 ? 'solicitud nueva' : 'solicitudes nuevas'}
        </div>
      )}

      <div className="mt-5">
        {requests === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">
              No se pudieron cargar las solicitudes
            </p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {requests !== null && !error && requests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <Home className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">Aún no hay solicitudes</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando alguien quiera adoptar a un perrito tuyo, su solicitud aparecerá aquí.
            </p>
          </div>
        )}

        {list !== null && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((request) => {
              const meta = statusMeta[request.status];
              const wa = whatsappUrl(
                request.whatsapp,
                `Hola ${request.applicantName}, te contactamos de ${ctx.organizationName} por tu solicitud para adoptar a ${request.animalName}.`,
              );
              return (
                <li key={request.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-800">{request.applicantName}</p>
                      <p className="text-xs text-neutral-500">
                        Para {request.animalName} · {request.createdAgo}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1 text-sm text-neutral-600">
                    <div className="flex gap-2">
                      <dt className="text-neutral-400">Vivienda:</dt>
                      <dd>{request.housingLabel || 'No especificada'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-neutral-400">¿Ha tenido mascotas?:</dt>
                      <dd>
                        {request.hasHadPets ? 'Sí' : 'No'}
                        {request.otherPets ? ` · ${request.otherPets}` : ''}
                      </dd>
                    </div>
                  </dl>

                  {request.reason && (
                    <p className="mt-2 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
                      “{request.reason}”
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-exito px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <MessageCircle className="h-4 w-4" /> Contactar
                      </a>
                    )}

                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => decide(request.id, 'accepted')}
                          disabled={busyId === request.id}
                          className="flex items-center gap-1.5 rounded-xl border border-cobalto px-3 py-2 text-sm font-semibold text-cobalto transition-colors hover:bg-cobalto/5 disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" /> Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(request.id, 'rejected')}
                          disabled={busyId === request.id}
                          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                        >
                          <X className="h-4 w-4" /> Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {ctx.preview && requests !== null && requests.length > 0 && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          En vista previa los cambios no se guardan de verdad.
        </p>
      )}
    </div>
  );
}
