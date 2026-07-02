import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getMyReports } from '../../lib/api';
import { EmptyState } from '../ui/EmptyState';
import type { Report } from '../../data/mockReports';

export function MyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);

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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-cobalto">Mis reportes</h2>
        {reports && reports.length > 0 && (
          <span className="text-xs text-neutral-400">{reports.length}</span>
        )}
      </div>

      {reports === null && (
        <div className="space-y-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
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
        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => navigate(`/mapa?reporte=${report.id}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-cobalto/40 hover:bg-neutral-50"
            >
              <img
                src={report.photo}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/placeholder-animal.svg';
                }}
                className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">{report.colonia}</p>
                <p className="text-xs text-neutral-500">
                  {report.species === 'gato' ? 'Gato' : 'Perro'} · {report.condition} ·{' '}
                  {report.status}
                </p>
                <p className="text-xs text-neutral-400">{report.reportedAgo}</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
