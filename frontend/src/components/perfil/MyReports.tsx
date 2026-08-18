import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, PawPrint } from 'lucide-react';
import { getMyReports, markLostPetFound } from '../../lib/api';
import { EmptyState } from '../ui/EmptyState';
import type { Report } from '../../data/mockReports';

const PREVIEW_COUNT = 4;

export function MyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Mascota perdida que se está marcando como encontrada (para el spinner) y error.
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  // Perdidos del usuario que siguen activos (con id y sin marcar encontrados).
  const activeLost = (reports ?? []).filter(
    (report) => report.isLostPet && report.lostPetId && !report.lostPetFound,
  );

  const markFound = async (report: Report) => {
    if (!report.lostPetId || markingId) return;
    setMarkingId(report.lostPetId);
    setMarkError(null);
    try {
      await markLostPetFound(report.lostPetId);
      // Reflejamos el cambio en la lista: deja de aparecer como activo.
      setReports((current) =>
        (current ?? []).map((item) =>
          item.lostPetId === report.lostPetId ? { ...item, lostPetFound: true } : item,
        ),
      );
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : 'No se pudo marcar. Intenta de nuevo.');
    } finally {
      setMarkingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    getMyReports()
      .then((data) => {
        if (active) setReports(data);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setReports([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Si falla la carga, no mostramos la sección (no estorba el perfil).
  if (failed) return null;

  const shown = reports ? (showAll ? reports : reports.slice(0, PREVIEW_COUNT)) : [];
  const hasMore = reports ? reports.length > PREVIEW_COUNT : false;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-cobalto">Mis reportes</h2>
        {reports && reports.length > 0 && (
          <span className="text-xs text-neutral-400">{reports.length}</span>
        )}
      </div>

      {reports === null && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      )}

      {reports !== null && reports.length === 0 && (
        <EmptyState
          image="/illustrations/vacio-reportes.webp"
          title="Aún no has hecho reportes"
          message="Cuando reportes un animalito, aquí verás tu historial."
        />
      )}

      {/* Acción para el dueño: marcar su mascota perdida como encontrada. Solo
          aparece si tiene perdidos activos (es su lista, así que es el dueño). */}
      {activeLost.length > 0 && (
        <div className="mb-4 rounded-2xl border border-cobalto/20 bg-cobalto/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cobalto">
            <PawPrint className="h-4 w-4" /> ¿Ya encontraste a tu mascota?
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Márcala como encontrada para quitarla del mapa. ¡Nos ayuda a saber cuántas se reúnen con
            su familia!
          </p>
          <ul className="mt-3 space-y-2">
            {activeLost.map((report) => (
              <li
                key={report.lostPetId}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2"
              >
                <img
                  src={report.photo}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-11 w-11 flex-shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                  {report.colonia}
                </span>
                <button
                  type="button"
                  onClick={() => markFound(report)}
                  disabled={Boolean(markingId)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-cobalto px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {markingId === report.lostPetId ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Marcando…
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Ya la encontré
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {markError && <p className="mt-2 text-xs text-alerta">{markError}</p>}
        </div>
      )}

      {reports !== null && reports.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {shown.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() =>
                  navigate(report.isLostPet ? `/mapa?perdido=${report.id}` : `/mapa?reporte=${report.id}`)
                }
                title={`${report.colonia} · ${report.condition}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
              >
                <img
                  src={report.photo}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Etiqueta para distinguir un perdido de un reporte de calle (los de
                    calle no llevan etiqueta = caso por defecto). */}
                {report.isLostPet && (
                  <span
                    className={
                      'pointer-events-none absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-white ' +
                      (report.lostPetFound ? 'bg-exito' : 'bg-naranja')
                    }
                  >
                    {report.lostPetFound ? 'Encontrado' : 'Perdido'}
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                  <span className="block truncate text-[10px] font-medium text-white">
                    {report.colonia}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-3 text-sm font-medium text-cobalto hover:underline"
            >
              {showAll ? 'Ver menos' : `Ver más (${reports.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
