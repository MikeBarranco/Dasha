import { useEffect, useState } from 'react';
import { Flag, AlertCircle, RefreshCw, Trash2, Check } from 'lucide-react';
import {
  getAdminForumReports,
  dismissAdminForumReport,
  deleteAdminForumPost,
  type AdminForumReport,
} from '../../lib/adminApi';

export function AdminDenunciasPage() {
  const [reports, setReports] = useState<AdminForumReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchReports = (reset: boolean) => {
    if (reset) {
      setReports(null);
      setError(null);
    }
    getAdminForumReports()
      .then((data) => {
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las denuncias');
        setReports([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminForumReports()
      .then((data) => {
        if (!active) return;
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las denuncias');
        setReports([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const removePost = async (report: AdminForumReport) => {
    setBusyId(report.id);
    try {
      await deleteAdminForumPost(report.postId);
      setReports((current) => (current ? current.filter((item) => item.id !== report.id) : current));
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo eliminar: ${detail}` : 'No se pudo eliminar la publicación.');
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (id: string) => {
    setBusyId(id);
    try {
      await dismissAdminForumReport(id);
      setReports((current) => (current ? current.filter((item) => item.id !== id) : current));
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo descartar: ${detail}` : 'No se pudo descartar la denuncia.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">Denuncias</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Publicaciones del foro reportadas por la comunidad. Revisa el motivo y decide.
      </p>

      {reports === null && (
        <div className="mt-6 space-y-3">
          {[0, 1].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar las denuncias</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchReports(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {reports !== null && !error && reports.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <Flag className="h-7 w-7 text-neutral-300" />
          <p className="mt-2 font-semibold text-neutral-700">Sin denuncias</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Cuando alguien reporte una publicación, aparecerá aquí para revisarla.
          </p>
        </div>
      )}

      {reports !== null && reports.length > 0 && (
        <div className="mt-6 space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-alerta/10 px-2.5 py-0.5 text-xs font-medium text-alerta">
                  <Flag className="h-3.5 w-3.5" /> {report.reason || 'Sin motivo'}
                </span>
                <span className="text-xs text-neutral-400">
                  Reportó {report.reporter} · {report.reportedAgo}
                </span>
              </div>

              <div className="mt-3 flex gap-3 rounded-xl bg-neutral-50 p-3">
                {report.postImageUrl && (
                  <img
                    src={report.postImageUrl}
                    alt="Foto de la publicación denunciada"
                    loading="lazy"
                    className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-500">{report.postAuthor}</p>
                  <p className="mt-1 break-words text-sm text-neutral-700">
                    {report.postContent || '(sin contenido)'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => removePost(report)}
                  disabled={busyId === report.id}
                  className="flex items-center gap-1.5 rounded-xl bg-alerta px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" /> Borrar publicación
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(report.id)}
                  disabled={busyId === report.id}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
