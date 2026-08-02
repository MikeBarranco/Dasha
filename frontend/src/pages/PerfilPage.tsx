import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Settings,
  LogOut,
  UserRound,
  Camera,
  Sparkles,
  ShieldCheck,
  Store,
  HelpCircle,
  Compass,
  Download,
  Radio,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { AvatarPicker } from '../components/perfil/AvatarPicker';
import { MyReports } from '../components/perfil/MyReports';
import { MyContributions } from '../components/perfil/MyContributions';
import { PushToggle } from '../components/perfil/PushToggle';
import { MedalsSheet } from '../components/perfil/MedalsSheet';
import { AccountSettingsSheet } from '../components/perfil/AccountSettingsSheet';
import { openOnboarding } from '../lib/onboarding';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import { InstallInstructions } from '../components/pwa/InstallInstructions';
import { SocialLinks } from '../components/ui/SocialLinks';
import { cn } from '../lib/cn';
import { buildMedals } from '../data/medals';
import { useAvatar, setStoredAvatar } from '../lib/useAvatar';
import { useAuth } from '../lib/useAuth';
import { useVolunteerStatus } from '../lib/useVolunteerStatus';
import {
  getMe,
  updateMe,
  getMyOrganization,
  getAvailableAchievements,
  type MeProfile,
  type AllyContext,
  type AvailableAchievement,
} from '../lib/api';

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
  const { avatar, setAvatar } = useAvatar();
  const { user: account, logout } = useAuth();
  const { status: volunteerStatus, clear: clearVolunteer } = useVolunteerStatus();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [medalsOpen, setMedalsOpen] = useState(false);
  const [focusMedalId, setFocusMedalId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allyContext, setAllyContext] = useState<AllyContext | null>(null);
  const [availableAchievements, setAvailableAchievements] = useState<AvailableAchievement[]>([]);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const { canPrompt, isIOS, isStandalone, promptInstall } = useInstallPrompt();

  const handleInstall = () => {
    if (canPrompt && !isIOS) {
      promptInstall();
      return;
    }
    setShowInstallHelp(true);
  };

  useEffect(() => {
    if (!account) return;
    let active = true;
    getMe()
      .then((data) => {
        if (!active) return;
        setMe(data);
        // Sincroniza el avatar elegido en otro dispositivo.
        if (data.avatarUrl) setStoredAvatar(data.id, data.avatarUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;
    let active = true;
    getMyOrganization()
      .then((ctx) => {
        if (active) setAllyContext(ctx);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [account]);

  // Catálogo real de logros (los que de verdad existen y se pueden desbloquear).
  useEffect(() => {
    if (!account) return;
    let active = true;
    getAvailableAchievements()
      .then((list) => {
        if (active) setAvailableAchievements(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [account]);

  // Reconcilia la bandera local "pendiente" con la realidad: si ya es voluntario/
  // admin, o el backend dice que la solicitud ya no está pendiente, la limpiamos
  // para no quedar atorados en "Solicitud en revisión".
  useEffect(() => {
    if (!me || volunteerStatus !== 'pending') return;
    const backendResolved = me.volunteerStatus !== null && me.volunteerStatus !== 'pending';
    if (me.role !== 'citizen' || backendResolved) clearVolunteer();
  }, [me, volunteerStatus, clearVolunteer]);
  // Sin usuario de ejemplo: si /me aún no manda gamificación, arranca en 0 (honesto),
  // nunca números inventados. Se llena solo cuando el backend incluya estos campos.
  const level = me?.level ?? 1;
  const xp = me?.experience ?? 0;
  const xpToNext = me ? Math.max(1, me.level * 100) : 100;
  const xpPercent = Math.min(100, Math.round((xp / xpToNext) * 100));
  // Catálogo REAL de medallas (las que existen en el backend); se encienden las
  // que el usuario ya ganó. Antes usábamos un catálogo nuestro con medallas que
  // nunca se podían desbloquear.
  const medals = buildMedals(availableAchievements, me?.achievements ?? []);
  const unlockedCount = medals.filter((medal) => medal.unlocked).length;

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

  const realRole = me?.role ?? account.role;
  // Quien pertenece a una organización (responsable o veterinario) es "Aliado"
  // aunque su rol global siga siendo ciudadano: si no, su perfil decía "Ciudadano"
  // pese a tener el portal de aliado.
  const roleLabel =
    realRole === 'admin'
      ? 'Administrador'
      : realRole === 'volunteer'
        ? 'Voluntario'
        : allyContext
          ? allyContext.role === 'owner'
            ? 'Responsable de aliado'
            : 'Aliado'
          : 'Ciudadano';
  // El estado real del backend manda; si aún no lo envía, usamos la bandera local.
  const volunteerPending =
    me?.volunteerStatus != null ? me.volunteerStatus === 'pending' : volunteerStatus === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="relative flex-shrink-0"
          aria-label="Cambiar avatar"
        >
          <Avatar name={me?.name ?? account.name} src={avatar} className="h-20 w-20 text-2xl" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-lino bg-cobalto text-white">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-cobalto">
            {me?.name ?? account.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
              {roleLabel}
            </span>
            <span className="text-xs text-neutral-400">Nivel {level}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500">
          <span>Experiencia</span>
          <span>
            {xp} / {xpToNext} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-cobalto" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard value={me?.reportsCount ?? 0} label="Reportes" />
        <StatCard value={me?.rescuesCount ?? 0} label="Rescates apoyados" />
        <StatCard value={unlockedCount} label="Medallas" />
      </div>

      {/* Un responsable/veterinario de aliado tiene rol global "citizen", pero su
          identidad es el portal de aliado: no le mostramos "conviértete en
          voluntario". */}
      {realRole === 'citizen' &&
        !allyContext &&
        (volunteerPending ? (
          <div className="rounded-2xl border border-purpura/20 bg-purpura/5 p-5">
            <h2 className="font-display text-lg font-bold text-purpura">Solicitud en revisión</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Recibimos tu solicitud para ser voluntario. Estamos validando tu identidad y te
              contactaremos pronto.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-purpura to-cobalto p-5 text-white">
            <h2 className="font-display text-lg font-bold">Conviértete en voluntario</h2>
            <p className="mt-1 text-sm text-white/85">
              Responde reportes cercanos, rescata animalitos y gana medallas. Validamos tu identidad
              para mantener la comunidad segura.
            </p>
            <button
              type="button"
              onClick={() => navigate('/ser-voluntario')}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purpura transition-opacity hover:opacity-90"
            >
              Quiero ser voluntario
            </button>
          </div>
        ))}

      {realRole === 'volunteer' && (
        <button
          type="button"
          onClick={() => navigate('/voluntario')}
          className="w-full rounded-2xl bg-gradient-to-br from-cobalto to-purpura p-5 text-left text-white transition-opacity hover:opacity-95"
        >
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Tu panel de voluntario</h2>
          </div>
          <p className="mt-1 text-sm text-white/85">
            Actívate como disponible para recibir emergencias cercanas y seguir tus rescates en
            curso. Aquí es donde recibes los avisos.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-cobalto">
            Abrir mi panel <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      )}

      <MyReports />

      <MyContributions />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-cobalto">Medallas</h2>
          <button
            type="button"
            onClick={() => {
              setFocusMedalId(null);
              setMedalsOpen(true);
            }}
            className="text-sm font-medium text-cobalto hover:underline"
          >
            Ver todas
          </button>
        </div>

        {unlockedCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-5 text-center">
            <p className="text-sm text-neutral-500">Aún no tienes medallas.</p>
            <button
              type="button"
              onClick={() => {
                setFocusMedalId(null);
                setMedalsOpen(true);
              }}
              className="mt-1 text-sm font-medium text-cobalto hover:underline"
            >
              Ve todas las que puedes conseguir
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {medals
              .filter((medal) => medal.unlocked)
              .map((medal) => (
                <button
                  key={medal.id}
                  type="button"
                  onClick={() => {
                    setFocusMedalId(medal.id);
                    setMedalsOpen(true);
                  }}
                  title={medal.description}
                  className="flex flex-col items-center text-center"
                >
                  <img src={medal.image} alt={medal.name} className="h-16 w-16 object-contain" />
                  <p className="mt-1 text-[11px] font-medium text-neutral-600">{medal.name}</p>
                </button>
              ))}
          </div>
        )}
      </div>

      <PushToggle />

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {account.role === 'admin' && (
          <RowButton
            icon={ShieldCheck}
            label="Panel de administración"
            onClick={() => navigate('/admin')}
          />
        )}
        {allyContext && (
          <RowButton
            icon={Store}
            label="Portal de aliado"
            onClick={() => navigate('/portal')}
          />
        )}
        <RowButton
          icon={Settings}
          label="Ajustes de la cuenta"
          onClick={() => setSettingsOpen(true)}
        />
        <RowButton
          icon={Sparkles}
          label="Novedades"
          onClick={() => navigate('/novedades')}
        />
        <RowButton
          icon={BarChart3}
          label="Nuestro impacto"
          onClick={() => navigate('/impacto')}
        />
        {!isStandalone && (
          <RowButton icon={Download} label="Instalar app" onClick={handleInstall} />
        )}
        <RowButton
          icon={HelpCircle}
          label="¿Cómo funciona Dasha?"
          onClick={() => openOnboarding()}
        />
        {realRole === 'volunteer' && (
          <RowButton
            icon={Radio}
            label="Panel de voluntario"
            onClick={() => navigate('/voluntario')}
          />
        )}
        {realRole === 'volunteer' && (
          <RowButton
            icon={Compass}
            label="Ver guía de voluntario"
            onClick={() => openOnboarding('volunteer')}
          />
        )}
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
        <div className="mt-4 flex items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-400">
          <Link to="/terminos" className="transition-colors hover:text-cobalto">
            Términos
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/aviso-privacidad" className="transition-colors hover:text-cobalto">
            Aviso de Privacidad
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showInstallHelp && <InstallInstructions onClose={() => setShowInstallHelp(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {pickerOpen && (
          <AvatarPicker
            current={avatar}
            onSelect={(url) => {
              setAvatar(url);
              updateMe({ avatarUrl: url }).catch(() => {});
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {medalsOpen && (
          <MedalsSheet
            medals={medals}
            initialSelectedId={focusMedalId}
            onClose={() => setMedalsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <AccountSettingsSheet
            initialName={me?.name ?? account.name}
            initialPhone={me?.phone ?? ''}
            email={me?.email ?? account.email}
            canChangePassword={me?.hasPassword ?? true}
            onSaved={({ name, phone }) => {
              setMe((prev) => (prev ? { ...prev, name, phone } : prev));
            }}
            onDeleted={() => {
              setSettingsOpen(false);
              logout();
              navigate('/');
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
