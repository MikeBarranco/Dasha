import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Store,
  ArrowLeft,
  Eye,
  ChevronDown,
  LayoutDashboard,
  UserRound,
  Users,
  PawPrint,
  HeartHandshake,
  Home,
  Ambulance,
  HandHeart,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/useAuth';
import {
  getMyOrganization,
  getOrganizationForAdmin,
  isFullCycleOrg,
  type AllyContext,
} from '../../lib/api';
import { Onboarding } from '../onboarding/Onboarding';
import { allySteps } from '../onboarding/onboardingSteps';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  ONBOARDING_OPEN_EVENT,
} from '../../lib/onboarding';

// `fullCycleOnly`: secciones que solo aplican a veterinaria/refugio (reciben y
// rehabilitan animales). Un aliado de apoyo (asociación/educativo) no las ve.
const portalSections = [
  { to: '/portal', label: 'Inicio', icon: LayoutDashboard, end: true, fullCycleOnly: false },
  { to: '/portal/rescates', label: 'Rescates', icon: Ambulance, end: false, fullCycleOnly: true },
  { to: '/portal/perfil', label: 'Mi perfil', icon: UserRound, end: false, fullCycleOnly: false },
  { to: '/portal/equipo', label: 'Mi equipo', icon: Users, end: false, fullCycleOnly: false },
  { to: '/portal/perritos', label: 'Mis perritos', icon: PawPrint, end: false, fullCycleOnly: true },
  { to: '/portal/adopciones', label: 'Adopciones', icon: Home, end: false, fullCycleOnly: true },
  { to: '/portal/donaciones', label: 'Donaciones', icon: HeartHandshake, end: false, fullCycleOnly: false },
  { to: '/portal/necesidades', label: 'Necesidades', icon: HandHeart, end: false, fullCycleOnly: false },
  { to: '/portal/eventos', label: 'Eventos', icon: CalendarDays, end: false, fullCycleOnly: false },
];

export function PortalLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  // undefined = cargando; null = no es aliado; objeto = contexto de aliado.
  const [context, setContext] = useState<AllyContext | null | undefined>(undefined);
  const [showAllyOnboarding, setShowAllyOnboarding] = useState(false);

  // Un administrador puede abrir el portal de un aliado con ?orgId=. En ese caso
  // el portal se acota a esa organización (datos reales, no de ejemplo). Un aliado
  // normal no trae orgId y ve su propia organización desde la sesión.
  const isAdmin = user?.role === 'admin';
  const adminOrgId = isAdmin ? searchParams.get('orgId') : null;

  useEffect(() => {
    // Admin que aún no elige aliado: no cargamos nada; el render lo redirige a la
    // lista de aliados (no dejamos que vea datos de ejemplo).
    if (isAdmin && !adminOrgId) return;
    let active = true;
    const hint = (location.state as { name?: string; orgType?: string } | null) ?? undefined;
    const load = adminOrgId
      ? getOrganizationForAdmin(adminOrgId, hint)
      : getMyOrganization();
    load
      .then((ctx) => {
        if (!active) return;
        setContext(ctx);
        // El onboarding de aliado solo para el dueño real la primera vez, no cuando
        // un admin está inspeccionando el portal de alguien más.
        if (ctx && !ctx.adminOrgId && !hasSeenOnboarding('ally')) setShowAllyOnboarding(true);
      })
      .catch(() => {
        if (active) setContext(null);
      });
    return () => {
      active = false;
    };
  }, [adminOrgId, isAdmin, location.state]);

  useEffect(() => {
    const open = (event: Event) => {
      if ((event as CustomEvent).detail === 'ally') setShowAllyOnboarding(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
  }, []);

  const closeAllyOnboarding = () => {
    markOnboardingSeen('ally');
    setShowAllyOnboarding(false);
  };

  if (!user) return <Navigate to="/login" replace />;

  // Un admin sin aliado elegido no ve datos de ejemplo: lo mandamos a la lista de
  // aliados para que elija uno y abra su portal real.
  if (isAdmin && !adminOrgId) return <Navigate to="/admin/aliados" replace />;

  if (context === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lino">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-cobalto" />
      </div>
    );
  }

  // Copiar el link no basta: si no eres aliado, te regresa a la app. La seguridad
  // real la impone el backend (cada /me/organization/* valida rol y organización).
  if (context === null) return <Navigate to="/mapa" replace />;

  // Aliado de apoyo (asociación/educativo): se ocultan rescates, perritos y
  // adopciones; su portal se centra en perfil, equipo, donaciones y necesidades.
  const sections = isFullCycleOrg(context.orgType)
    ? portalSections
    : portalSections.filter((section) => !section.fullCycleOnly);

  const current = sections.find((section) => location.pathname === section.to) ?? sections[0];
  // Conservar ?orgId= al navegar entre secciones cuando un admin ve el portal.
  const linkSearch = adminOrgId ? `?orgId=${adminOrgId}` : '';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-lino">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto text-white">
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight text-cobalto">
                Portal de aliado
              </p>
              <p className="truncate text-xs text-neutral-400">{context.organizationName}</p>
            </div>
          </div>
          <Link
            to={context.adminOrgId ? '/admin/aliados' : '/mapa'}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {context.adminOrgId ? 'Volver a aliados' : 'Volver a la app'}
            </span>
          </Link>
        </div>
      </header>

      {context.adminOrgId && (
        <div className="border-b border-info/20 bg-info/5">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2 text-xs text-info md:px-6">
            <Eye className="h-3.5 w-3.5 flex-shrink-0" />
            Estás viendo el portal de {context.organizationName} como administrador.
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {/* Móvil: menú desplegable (como el panel de admin) */}
        <div className="relative z-30 mb-5 sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3"
          >
            <span className="flex items-center gap-2.5 font-medium text-neutral-800">
              <current.icon className="h-4 w-4 text-cobalto" />
              {current.label}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-neutral-400 transition-transform',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-20 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg"
                >
                  {sections.map((section) => (
                    <NavLink
                      key={section.to}
                      to={{ pathname: section.to, search: linkSearch }}
                      end={section.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                          isActive
                            ? 'bg-cobalto/10 font-medium text-cobalto'
                            : 'text-neutral-600 hover:bg-neutral-50',
                        )
                      }
                    >
                      <section.icon className="h-4 w-4 flex-shrink-0" />
                      {section.label}
                    </NavLink>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Escritorio: pastillas */}
        <nav className="mb-5 hidden gap-2 sm:flex">
          {sections.map((section) => (
            <NavLink
              key={section.to}
              to={{ pathname: section.to, search: linkSearch }}
              end={section.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-cobalto bg-cobalto text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
                )
              }
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </NavLink>
          ))}
        </nav>
        <Outlet context={context} />
      </main>

      <AnimatePresence>
        {showAllyOnboarding && <Onboarding steps={allySteps} onClose={closeAllyOnboarding} />}
      </AnimatePresence>
    </div>
  );
}
