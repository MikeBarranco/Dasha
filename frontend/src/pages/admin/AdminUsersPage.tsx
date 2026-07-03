import { useEffect, useState } from 'react';
import { Trash2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../lib/useAuth';
import {
  getAdminUsers,
  deleteAdminUser,
  updateAdminUserRole,
  roleOptions,
  type AdminUser,
} from '../../lib/adminApi';

const roleStyles: Record<string, string> = {
  admin: 'bg-purpura/10 text-purpura',
  volunteer: 'bg-cobalto/10 text-cobalto',
  citizen: 'bg-neutral-100 text-neutral-500',
};

// Cuentas del equipo core: no se les puede cambiar el rol ni eliminarlas desde
// el panel. Es una salvaguarda del front; lo ideal es que el backend también lo
// impida (ver mensaje a Isabel).
const PROTECTED_EMAILS = [
  'isarumachorro.742@gmail.com',
  'espartan1047@gmail.com',
  'mike.11.barranco@gmail.com',
  'monicatapia1002@gmail.com',
  'sumayramontserrat@gmail.com',
];

function isProtected(email: string): boolean {
  return PROTECTED_EMAILS.includes(email.trim().toLowerCase());
}

// Orden de despliegue: primero admins, luego voluntarios, luego ciudadanos.
const roleOrder: Record<string, number> = { admin: 0, volunteer: 1, citizen: 2 };

const roleFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Administradores' },
  { value: 'volunteer', label: 'Voluntarios' },
  { value: 'citizen', label: 'Ciudadanos' },
];

export function AdminUsersPage() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = (reset: boolean) => {
    if (reset) {
      setUsers(null);
      setError(null);
    }
    getAdminUsers()
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
        setUsers([]);
      });
  };

  useEffect(() => {
    let active = true;
    getAdminUsers()
      .then((data) => {
        if (!active) return;
        setUsers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
        setUsers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminUser(id);
      setUsers((list) => (list ? list.filter((user) => user.id !== id) : list));
      setConfirmId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(
        detail
          ? `No se pudo eliminar: ${detail}`
          : 'No se pudo eliminar el usuario. Intenta de nuevo.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const changeRole = async (id: string, role: string) => {
    const target = users?.find((user) => user.id === id);
    if (!target || target.role === role) return;
    if (isProtected(target.email)) return;
    // Al quitarle el rol de administrador a alguien, pedir confirmación.
    if (target.role === 'admin' && role !== 'admin') {
      const ok = window.confirm(
        `¿Seguro que quieres quitarle el rol de administrador a ${target.name}?`,
      );
      if (!ok) return;
    }
    const label = roleOptions.find((option) => option.value === role)?.label ?? role;
    let previous: AdminUser[] | null = null;
    setSavingRoleId(id);
    setUsers((list) => {
      previous = list;
      return list
        ? list.map((user) => (user.id === id ? { ...user, role, roleLabel: label } : user))
        : list;
    });
    try {
      await updateAdminUserRole(id, role);
    } catch (err) {
      setUsers(previous);
      const detail = err instanceof Error ? err.message : '';
      alert(
        detail
          ? `No se pudo cambiar el rol: ${detail}`
          : 'No se pudo cambiar el rol. Intenta de nuevo.',
      );
    } finally {
      setSavingRoleId(null);
    }
  };

  const visibleUsers = (users ?? [])
    .filter((user) => roleFilter === 'all' || user.role === roleFilter)
    .sort((a, b) => {
      const order = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
      return order !== 0 ? order : a.name.localeCompare(b.name, 'es');
    });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cobalto">Usuarios</h1>
        {users !== null && users.length > 0 && (
          <span className="text-sm text-neutral-400">{users.length}</span>
        )}
      </div>

      {users !== null && !error && users.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {roleFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setRoleFilter(filter.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                roleFilter === filter.value
                  ? 'bg-cobalto text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {users === null && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar los usuarios</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchUsers(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {users !== null && !error && users.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">No hay usuarios</p>
        </div>
      )}

      {users !== null && !error && users.length > 0 && visibleUsers.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
          <p className="font-semibold text-neutral-700">Sin usuarios con ese rol</p>
        </div>
      )}

      {users !== null && visibleUsers.length > 0 && (
        <div className="mt-6 space-y-3">
          {visibleUsers.map((user) => {
            const isSelf = current?.id === user.id;
            const protectedAccount = isProtected(user.email);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <Avatar name={user.name} className="h-11 w-11 text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-neutral-800">{user.name}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        roleStyles[user.role] ?? 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {user.roleLabel}
                    </span>
                  </div>
                  {user.email && <p className="truncate text-xs text-neutral-500">{user.email}</p>}
                  <p className="text-xs text-neutral-400">
                    {user.reportsCount !== null ? `${user.reportsCount} reportes` : ''}
                    {user.reportsCount !== null && user.joined ? ' · ' : ''}
                    {user.joined ? `Desde ${user.joined}` : ''}
                  </p>
                </div>

                {isSelf ? (
                  <span className="flex-shrink-0 text-xs text-neutral-400">Tú</span>
                ) : protectedAccount ? (
                  <span
                    className="flex flex-shrink-0 items-center gap-1 text-xs text-neutral-400"
                    title="Cuenta protegida del equipo"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Equipo
                  </span>
                ) : confirmId === user.id ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(user.id)}
                      disabled={deletingId === user.id}
                      className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {deletingId === user.id ? 'Eliminando…' : 'Sí'}
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
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(event) => changeRole(user.id, event.target.value)}
                      disabled={savingRoleId === user.id}
                      aria-label="Cambiar rol"
                      className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30 disabled:opacity-60"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setConfirmId(user.id)}
                      aria-label="Eliminar usuario"
                      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-alerta/5 hover:text-alerta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
