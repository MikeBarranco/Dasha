import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, UserPlus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { Avatar } from '../ui/Avatar';
import {
  getAdminOrgTeam,
  addAdminOrgTeamMember,
  removeAdminOrgTeamMember,
  type AdminOrg,
  type AdminOrgMember,
} from '../../lib/adminApi';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrgTeamSheetProps = {
  org: AdminOrg;
  onClose: () => void;
};

export function OrgTeamSheet({ org, onClose }: OrgTeamSheetProps) {
  useLockBodyScroll();
  const [team, setTeam] = useState<AdminOrgMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminOrgTeam(org.id)
      .then((data) => {
        if (!active) return;
        setTeam(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo');
        setTeam([]);
      });
    return () => {
      active = false;
    };
  }, [org.id]);

  const refetch = () => {
    getAdminOrgTeam(org.id)
      .then((data) => {
        setTeam(data);
        setError(null);
      })
      .catch(() => {
        /* dejamos el equipo actual si el refetch falla */
      });
  };

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!emailPattern.test(clean)) {
      setFormError('Escribe un correo válido.');
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      await addAdminOrgTeamMember(org.id, clean);
      setEmail('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo vincular. Intenta de nuevo.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (userId: string) => {
    try {
      await removeAdminOrgTeamMember(org.id, userId);
      setTeam((current) => (current ? current.filter((m) => m.userId !== userId) : current));
      setConfirmId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo quitar: ${detail}` : 'No se pudo quitar al veterinario.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-cobalto">Equipo</h2>
            <p className="truncate text-xs text-neutral-400">{org.name || 'Aliado'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={submitAdd} className="space-y-2">
            <p className="text-sm text-neutral-600">
              Vincula veterinarios por su correo. Cada uno debe tener su cuenta en Dasha.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={120}
                placeholder="correo@ejemplo.com"
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
              <button
                type="submit"
                disabled={adding}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-cobalto px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {adding ? 'Vinculando…' : 'Agregar'}
              </button>
            </div>
            {formError && <p className="text-sm text-alerta">{formError}</p>}
          </form>

          <div className="mt-5">
            {team === null && (
              <div className="space-y-3">
                {[0, 1].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
                ))}
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
                <AlertCircle className="h-7 w-7 text-alerta" />
                <p className="mt-2 font-semibold text-neutral-700">No se pudo cargar el equipo</p>
                <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
              </div>
            )}

            {team !== null && !error && team.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
                <p className="font-semibold text-neutral-700">Sin veterinarios aún</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Agrega al primero con su correo arriba.
                </p>
              </div>
            )}

            {team !== null && team.length > 0 && (
              <ul className="space-y-2">
                {team.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
                  >
                    <Avatar
                      name={member.name}
                      src={member.photoUrl ?? undefined}
                      className="h-10 w-10 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-800">{member.name}</p>
                      {member.email && (
                        <p className="truncate text-xs text-neutral-500">{member.email}</p>
                      )}
                    </div>
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-cobalto/10 px-2 py-0.5 text-xs font-medium text-cobalto">
                      {member.role === 'owner' && <ShieldCheck className="h-3 w-3" />}
                      {member.roleLabel}
                    </span>

                    {member.role === 'owner' ? null : confirmId === member.userId ? (
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => remove(member.userId)}
                          className="rounded-lg bg-alerta px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Quitar
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
                      <button
                        type="button"
                        onClick={() => setConfirmId(member.userId)}
                        aria-label="Quitar veterinario"
                        className="flex-shrink-0 rounded-lg p-2 text-neutral-500 transition-colors hover:bg-alerta/5 hover:text-alerta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
