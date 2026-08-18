import { useEffect, useState } from 'react';
import { UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import {
  getMyOrgTeam,
  addMyOrgTeamMember,
  updateMyOrgTeamMember,
  removeMyOrgTeamMember,
  teamRoleLabels,
  teamTitleOptions,
  type TeamMember,
  type TeamRole,
} from '../../lib/api';
import { mockAllies } from '../../data/mockAllies';
import { useAllyPortal } from '../../lib/useAllyPortal';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Color del badge según el rol dentro del aliado.
const roleBadge: Record<TeamRole, string> = {
  admin: 'bg-cobalto/10 text-cobalto',
  veterinarian: 'bg-emerald-50 text-emerald-700',
  assistant: 'bg-neutral-100 text-neutral-600',
};

// Datos de ejemplo para la vista previa (mientras el backend no exista).
function previewTeam(orgId: string): TeamMember[] {
  const ally = mockAllies.find((item) => item.id === orgId);
  return (ally?.team ?? []).map((member, index) => ({
    userId: `preview-${index}`,
    name: member.name,
    email: '',
    role: 'veterinarian',
    title: member.title,
    photoUrl: member.photoUrl ?? null,
  }));
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : email;
}

export function PortalEquipoPage() {
  const ctx = useAllyPortal();
  // En vista previa el equipo se inicializa con datos de ejemplo (sin backend).
  const [team, setTeam] = useState<TeamMember[] | null>(() =>
    ctx.preview ? previewTeam(ctx.organizationId) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getMyOrgTeam(ctx.adminOrgId)
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
  }, [ctx.preview, ctx.organizationId, ctx.adminOrgId]);

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!emailPattern.test(clean)) {
      setFormError('Escribe un correo válido.');
      return;
    }
    setFormError(null);

    if (ctx.preview) {
      setTeam((current) => [
        ...(current ?? []),
        {
          userId: `preview-${Date.now()}`,
          name: nameFromEmail(clean),
          email: clean,
          role: 'veterinarian',
          title: newTitle || 'Veterinario',
          positionTitle: newTitle || undefined,
          photoUrl: null,
        },
      ]);
      setEmail('');
      setNewTitle('');
      return;
    }

    setAdding(true);
    try {
      await addMyOrgTeamMember(clean, newTitle || undefined, ctx.adminOrgId);
      setEmail('');
      setNewTitle('');
      const data = await getMyOrgTeam(ctx.adminOrgId);
      setTeam(data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo vincular. Intenta de nuevo.');
    } finally {
      setAdding(false);
    }
  };

  // Cambiar el puesto/título de un miembro (optimista; el backend valida la lista).
  const changeTitle = async (userId: string, title: string) => {
    setTeam((current) =>
      current
        ? current.map((m) => (m.userId === userId ? { ...m, positionTitle: title || undefined } : m))
        : current,
    );
    if (ctx.preview) return;
    try {
      await updateMyOrgTeamMember(userId, title, ctx.adminOrgId);
    } catch {
      // Si falla, recargamos para volver al estado real del servidor.
      getMyOrgTeam(ctx.adminOrgId)
        .then(setTeam)
        .catch(() => {});
    }
  };

  const remove = async (userId: string) => {
    if (ctx.preview) {
      setTeam((current) => (current ? current.filter((m) => m.userId !== userId) : current));
      setConfirmId(null);
      return;
    }
    try {
      await removeMyOrgTeamMember(userId, ctx.adminOrgId);
      setTeam((current) => (current ? current.filter((m) => m.userId !== userId) : current));
      setConfirmId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo quitar: ${detail}` : 'No se pudo quitar al veterinario.');
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-cobalto">Mi equipo</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Vincula a tus veterinarios por su correo. Cada uno debe tener su cuenta en Dasha.
      </p>

      <form onSubmit={submitAdd} className="mt-4 space-y-2">
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
        {/* Puesto (opcional): lista cerrada, para equipos con distintos roles. */}
        <select
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
        >
          <option value="">Puesto (opcional)</option>
          {teamTitleOptions.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
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
            <p className="mt-1 text-sm text-neutral-500">Agrega al primero con su correo arriba.</p>
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
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-800">{member.name}</p>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge[member.role]}`}
                    >
                      {teamRoleLabels[member.role]}
                    </span>
                  </div>
                  {/* Puesto editable (lista cerrada). Sin puesto = se muestra la
                      etiqueta del rol arriba. */}
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={member.positionTitle ?? ''}
                      onChange={(event) => changeTitle(member.userId, event.target.value)}
                      aria-label={`Puesto de ${member.name}`}
                      className="max-w-[11rem] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 outline-none focus:ring-2 focus:ring-cobalto/30"
                    >
                      <option value="">Sin puesto</option>
                      {teamTitleOptions.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {member.email && (
                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">{member.email}</p>
                  )}
                </div>

                {confirmId === member.userId ? (
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

      {ctx.preview && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          En vista previa los cambios no se guardan de verdad; funcionará cuando el backend esté
          listo.
        </p>
      )}
    </div>
  );
}
