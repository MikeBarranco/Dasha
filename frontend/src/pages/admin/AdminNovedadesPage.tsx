import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { NovedadFormSheet } from '../../components/admin/NovedadFormSheet';
import { getAdminNovedades, deleteAdminNovedad, type AdminNovedad } from '../../lib/adminApi';

export function AdminNovedadesPage() {
  const [novedades, setNovedades] = useState<AdminNovedad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNovedad | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNovedades = (reset: boolean) => {
    if (reset) {
      setNovedades(null);
      setError(null);
    }
    getAdminNovedades()
      .then((data) => {
        setNovedades(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las novedades');
        setNovedades([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminNovedades()
      .then((data) => {
        if (!active) return;
        setNovedades(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las novedades');
        setNovedades([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (novedad: AdminNovedad) => {
    setEditing(novedad);
    setFormOpen(true);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminNovedad(id);
      setNovedades((current) => (current ? current.filter((item) => item.id !== id) : current));
      setConfirmId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo eliminar: ${detail}` : 'No se pudo eliminar la novedad.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cobalto">Novedades</h1>
          <p className="mt-1 text-sm text-neutral-500">
            El changelog que ve la comunidad. Lo que publiques aquí aparece en la página de
            Novedades.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </button>
      </div>

      {novedades === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar las novedades</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchNovedades(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {novedades !== null && !error && novedades.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <Sparkles className="h-7 w-7 text-neutral-300" />
          <p className="mt-2 font-semibold text-neutral-700">Aún no hay novedades publicadas</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Registra cada versión con el botón “Nueva” para mantener al día a la comunidad.
          </p>
        </div>
      )}

      {novedades !== null && novedades.length > 0 && (
        <div className="mt-6 space-y-3">
          {novedades.map((novedad) => (
            <div key={novedad.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cobalto px-2.5 py-0.5 text-xs font-semibold text-white">
                      {novedad.version || 'Sin versión'}
                    </span>
                    {novedad.dateLabel && (
                      <span className="text-xs text-neutral-400">{novedad.dateLabel}</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium text-neutral-800">
                    {novedad.title || 'Sin título'}
                  </p>
                </div>

                {confirmId === novedad.id ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(novedad.id)}
                      disabled={deletingId === novedad.id}
                      className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {deletingId === novedad.id ? 'Eliminando…' : 'Sí'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(novedad)}
                      aria-label="Editar"
                      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-cobalto"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(novedad.id)}
                      aria-label="Eliminar"
                      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-alerta/5 hover:text-alerta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {novedad.changes.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
                  {novedad.changes.map((change, index) => (
                    <li key={index} className="flex gap-2 text-sm text-neutral-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-naranja" />
                      {change}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <NovedadFormSheet
            novedad={editing}
            onClose={() => setFormOpen(false)}
            onSaved={() => fetchNovedades(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
