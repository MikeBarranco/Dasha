import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Lock, ChevronRight, Settings, LogOut, UserRound, Camera, type LucideIcon } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { AvatarPicker } from '../components/perfil/AvatarPicker';
import { SocialLinks } from '../components/ui/SocialLinks';
import { cn } from '../lib/cn';
import { mockUser } from '../data/mockUser';
import { useAvatar } from '../lib/useAvatar';
import { useAuth } from '../lib/useAuth';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-center">
      <p className="font-display text-xl font-bold text-cobalto">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function RowButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  const navigate = useNavigate();
  const user = mockUser;
  const { avatar, setAvatar } = useAvatar();
  const { user: account, logout } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const xpPercent = Math.min(100, Math.round((user.xp / user.xpToNext) * 100));
  const unlockedCount = user.medals.filter((medal) => medal.unlocked).length;

  if (!account) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cobalto/10">
          <UserRound className="h-9 w-9 text-cobalto" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Tu perfil te espera</h1>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          Crea tu cuenta para reportar, ganar medallas y seguir tus rescates.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-xl border border-neutral-200 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="relative flex-shrink-0"
          aria-label="Cambiar avatar"
        >
          <Avatar name={account.name} src={avatar} className="h-20 w-20 text-2xl" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-lino bg-cobalto text-white">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-cobalto">{account.name}</h1>
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
        <RowButton
          icon={LogOut}
          label="Cerrar sesión"
          danger
          onClick={() => {
            logout();
            navigate('/login');
          }}
        />
      </div>

      <div className="pt-2 text-center">
        <p className="mb-3 text-xs text-neutral-400">Síguenos en redes</p>
        <SocialLinks />
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <AvatarPicker
            current={avatar}
            onSelect={(url) => {
              setAvatar(url);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
