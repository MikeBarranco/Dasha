import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, AlertCircle, RefreshCw, BadgeCheck, Building2 } from 'lucide-react';
import { OrgFormSheet } from '../../components/admin/OrgFormSheet';
import {
  getAdminOrganizations,
  deleteAdminOrganization,
  type AdminOrg,
} from '../../lib/adminApi';

export function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOrg | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrgs = (reset: boolean) => {
    if (reset) {
      setOrgs(null);
      setError(null);
    }
    getAdminOrganizations()
      .then((data) => {
        setOrgs(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los aliados');
        setOrgs([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminOrganizations()
      .then((data) => {
        if (!active) return;
        setOrgs(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los aliados');
        setOrgs([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (org: AdminOrg) => {
    setEditing(org);
    setFormOpen(true);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminOrganization(id);
      setOrgs((current) => (current ? current.filter((org) => org.id !== id) : current));
      setConfirmId(null);
    } catch {
      alert('No se pudo eliminar el aliado. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-cobalto">Aliados</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {orgs === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar los aliados</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchOrgs(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {orgs !== null && !error && orgs.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">Aún no hay aliados</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Registra veterinarias, refugios y asociaciones con el botón “Nuevo”.
          </p>
        </div>
      )}

      {orgs !== null && orgs.length > 0 && (
        <div className="mt-6 space-y-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-neutral-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium text-neutral-800">
                  {org.name || 'Sin nombre'}
                  {org.isVerified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-cobalto" />}
                </p>
                <p className="text-xs text-neutral-500">{org.orgTypeLabel}</p>
                {org.address && <p className="truncate text-xs text-neutral-400">{org.address}</p>}
              </div>

              {confirmId === org.id ? (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(org.id)}
                    disabled={deletingId === org.id}
                    className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {deletingId === org.id ? 'Eliminando…' : 'Sí'}
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
                    onClick={() => openEdit(org)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-cobalto"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(org.id)}
                    aria-label="Eliminar"
                    className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-alerta/5 hover:text-alerta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <OrgFormSheet
            org={editing}
            onClose={() => setFormOpen(false)}
            onSaved={() => fetchOrgs(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
