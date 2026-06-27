import { useEffect, useState } from 'react';
import { Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  getAdminReports,
  updateAdminReportStatus,
  deleteAdminReport,
  reportStatusOptions,
  type AdminReport,
} from '../../lib/adminApi';

const urgencyDot: Record<string, string> = {
  critical: 'bg-alerta',
  high: 'bg-alerta',
  medium: 'bg-naranja',
  low: 'bg-exito',
};

function ReportCard({
  report,
  onStatusChange,
  onDelete,
}: {
  report: AdminReport;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(report.status);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const changeStatus = async (next: string) => {
    const previous = status;
    setStatus(next);
    setSaving(true);
    try {
      await onStatusChange(report.id, next);
    } catch {
      setStatus(previous);
      alert('No se pudo actualizar el estado. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete(report.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
      alert('No se pudo eliminar el reporte. Intenta de nuevo.');
    }
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <img
        src={report.photo}
        alt=""
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/placeholder-animal.svg';
        }}
        className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
            {report.species === 'gato' ? 'Gato' : 'Perro'}
          </span>
          {report.condition && (
            <span className="text-xs text-neutral-500">{report.condition}</span>
          )}
          {report.urgencyLabel && (
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <span
                className={cn('h-2 w-2 rounded-full', urgencyDot[report.urgency] ?? 'bg-neutral-300')}
              />
              {report.urgencyLabel}
            </span>
          )}
        </div>

        <p className="mt-1 text-sm font-medium text-neutral-800">{report.colonia}</p>
        {report.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{report.description}</p>
        )}
        <p className="mt-1 text-xs text-neutral-400">
          {report.createdAgo}
          {report.reporter ? ` · ${report.reporter}` : ''}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={status}
            disabled={saving || deleting}
            onChange={(event) => changeStatus(event.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30 disabled:opacity-60"
          >
            {reportStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {confirming ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">¿Eliminar?</span>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Eliminar reporte"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-alerta transition-colors hover:bg-alerta/5"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminReports()
      .then((data) => {
        if (!active) return;
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes');
        setReports([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const reload = () => {
    setReports(null);
    setError(null);
    getAdminReports()
      .then((data) => {
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes');
        setReports([]);
      });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateAdminReportStatus(id, status);
    setReports((current) =>
      current ? current.map((report) => (report.id === id ? { ...report, status } : report)) : current,
    );
  };

  const handleDelete = async (id: string) => {
    await deleteAdminReport(id);
    setReports((current) => (current ? current.filter((report) => report.id !== id) : current));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cobalto">Reportes</h1>
        {reports !== null && reports.length > 0 && (
          <span className="text-sm text-neutral-400">{reports.length}</span>
        )}
      </div>

      {reports === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar los reportes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {reports !== null && !error && reports.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">No hay reportes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Cuando lleguen reportes de calle, aparecerán aquí para gestionarlos.
          </p>
        </div>
      )}

      {reports !== null && reports.length > 0 && (
        <div className="mt-6 space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
