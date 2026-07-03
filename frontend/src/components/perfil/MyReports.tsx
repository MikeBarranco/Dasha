import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyReports } from '../../lib/api';
import { EmptyState } from '../ui/EmptyState';
import type { Report } from '../../data/mockReports';

const PREVIEW_COUNT = 4;

export function MyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

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

      {reports !== null && reports.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {shown.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate(`/mapa?reporte=${report.id}`)}
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
