import { Lock, ChevronRight, Settings, LogOut, type LucideIcon } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';
import { mockUser } from '../data/mockUser';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-center">
      <p className="font-display text-xl font-bold text-cobalto">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function RowButton({ icon: Icon, label, danger }: { icon: LucideIcon; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-neutral-50',
        danger ? 'text-alerta' : 'text-neutral-700',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-neutral-300" />
    </button>
  );
}

export function PerfilPage() {
  const user = mockUser;
  const xpPercent = Math.min(100, Math.round((user.xp / user.xpToNext) * 100));
  const unlockedCount = user.medals.filter((medal) => medal.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} className="h-20 w-20 text-2xl" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-cobalto">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
              {user.role}
            </span>
            <span className="text-xs text-neutral-400">
              Nivel {user.level} · {user.levelName}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500">
          <span>Experiencia</span>
          <span>
            {user.xp} / {user.xpToNext} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-cobalto" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard value={user.stats.reportes} label="Reportes" />
        <StatCard value={user.stats.rescates} label="Rescates apoyados" />
        <StatCard value={user.stats.seguidos} label="Siguiendo" />
      </div>

      {user.role === 'Ciudadano' && (
        <div className="rounded-2xl bg-gradient-to-br from-purpura to-cobalto p-5 text-white">
          <h2 className="font-display text-lg font-bold">Conviértete en voluntario</h2>
          <p className="mt-1 text-sm text-white/85">
            Responde reportes cercanos, rescata animalitos y gana medallas. Validamos tu identidad
            para mantener la comunidad segura.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purpura transition-opacity hover:opacity-90"
          >
            Quiero ser voluntario
          </button>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-cobalto">Medallas</h2>
          <span className="text-xs text-neutral-400">
            {unlockedCount} de {user.medals.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {user.medals.map((medal) => (
            <div key={medal.id} className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20">
                <img
                  src={medal.image}
                  alt={medal.name}
                  className={cn(
                    'h-full w-full object-contain',
                    !medal.unlocked && 'opacity-40 grayscale',
                  )}
                />
                {!medal.unlocked && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-neutral-600">{medal.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <RowButton icon={Settings} label="Ajustes de la cuenta" />
        <RowButton icon={LogOut} label="Cerrar sesión" danger />
      </div>
    </div>
  );
}
