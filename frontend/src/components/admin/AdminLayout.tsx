import { useState } from 'react';
import { NavLink, Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/useAuth';
import { adminSections } from '../../lib/adminSections';

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const current =
    adminSections.find((section) => location.pathname === section.to) ?? adminSections[0];

  return (
    <div className="flex min-h-screen flex-col bg-lino">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight text-cobalto">
                Panel de administración
              </p>
              <p className="truncate text-xs text-neutral-400">{user.name}</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver a la app</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="md:flex md:gap-8">
          <aside className="hidden md:block md:w-60 md:flex-shrink-0">
            <nav className="sticky top-24 space-y-1 rounded-2xl border border-neutral-200 bg-white p-2">
              {adminSections.map((section) => (
                <NavLink
                  key={section.to}
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-cobalto text-white'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-cobalto',
                    )
                  }
                >
                  <section.icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="relative z-30 mb-4 md:hidden">
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
                    {adminSections.map((section) => (
                      <NavLink
                        key={section.to}
                        to={section.to}
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

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
