import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { AnimalFormSheet } from '../../components/admin/AnimalFormSheet';
import {
  getAdminAnimals,
  deleteAdminAnimal,
  animalStatusOptions,
  type AdminAnimal,
} from '../../lib/adminApi';
import { getAllies } from '../../lib/api';

type OrgOption = { id: string; name: string };

export function AdminAnimalsPage() {
  const [animals, setAnimals] = useState<AdminAnimal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnimal | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Conteo por estatus para las pastillas de filtro. Un estatus fuera del
  // contrato (por si el backend agrega otro) igual se cuenta y aparece en "Todos".
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const option of animalStatusOptions) byStatus[option.value] = 0;
    for (const animal of animals ?? []) {
      byStatus[animal.status] = (byStatus[animal.status] ?? 0) + 1;
    }
    return { byStatus, total: animals?.length ?? 0 };
  }, [animals]);

  const visibleAnimals = useMemo(() => {
    if (!animals) return null;
    if (statusFilter === 'all') return animals;
    return animals.filter((animal) => animal.status === statusFilter);
  }, [animals, statusFilter]);

  const fetchAnimals = (reset: boolean) => {
    if (reset) {
      setAnimals(null);
      setError(null);
    }
    getAdminAnimals()
      .then((data) => {
        setAnimals(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los animales');
        setAnimals([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminAnimals()
      .then((data) => {
        if (!active) return;
        setAnimals(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los animales');
        setAnimals([]);
      });
    getAllies()
      .then((data) => {
        if (active) setOrganizations(data.map((ally) => ({ id: ally.id, name: ally.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (animal: AdminAnimal) => {
    setEditing(animal);
    setFormOpen(true);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminAnimal(id);
      setAnimals((current) => (current ? current.filter((animal) => animal.id !== id) : current));
      setConfirmId(null);
    } catch {
      alert('No se pudo eliminar el animal. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-cobalto">Rehabilitación</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {animals !== null && !error && animals.length > 0 && (
        <div className="mt-4">
          {/* Filtro: desplegable en móvil, pastillas con conteo en escritorio */}
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30 sm:hidden"
          >
            {[{ value: 'all', label: 'Todos' }, ...animalStatusOptions].map((option) => {
              const count =
                option.value === 'all' ? counts.total : (counts.byStatus[option.value] ?? 0);
              return (
                <option key={option.value} value={option.value}>
                  {option.label} ({count})
                </option>
              );
            })}
          </select>
          <div className="hidden flex-wrap gap-2 sm:flex">
            {[{ value: 'all', label: 'Todos' }, ...animalStatusOptions].map((option) => {
              const active = statusFilter === option.value;
              const count =
                option.value === 'all' ? counts.total : (counts.byStatus[option.value] ?? 0);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-cobalto bg-cobalto text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 text-xs font-semibold ${
                      active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {animals === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar los animales</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchAnimals(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {animals !== null && !error && animals.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">Aún no hay animales</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Agrega el primer caso de rehabilitación con el botón “Nuevo”.
          </p>
        </div>
      )}

      {animals !== null &&
        visibleAnimals !== null &&
        animals.length > 0 &&
        visibleAnimals.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <p className="font-semibold text-neutral-700">Sin casos en este estatus</p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="mt-3 text-sm font-semibold text-cobalto hover:underline"
            >
              Ver todos
            </button>
          </div>
        )}

      {visibleAnimals !== null && visibleAnimals.length > 0 && (
        <div className="mt-6 space-y-3">
          {visibleAnimals.map((animal) => (
            <div
              key={animal.id}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <img
                src={animal.photos[0] ?? '/placeholder-animal.svg'}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/placeholder-animal.svg';
                }}
                className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-800">{animal.name || 'Sin nombre'}</p>
                <p className="text-xs text-neutral-500">
                  {animal.species === 'gato' ? 'Gato' : 'Perro'} · {animal.statusLabel}
                </p>
                {animal.organizationName && (
                  <p className="truncate text-xs text-neutral-400">{animal.organizationName}</p>
                )}
              </div>

              {confirmId === animal.id ? (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(animal.id)}
                    disabled={deletingId === animal.id}
                    className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {deletingId === animal.id ? 'Eliminando…' : 'Sí'}
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
                    onClick={() => openEdit(animal)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-cobalto"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(animal.id)}
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
          <AnimalFormSheet
            animal={editing}
            organizations={organizations}
            onClose={() => setFormOpen(false)}
            onSaved={() => fetchAnimals(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
