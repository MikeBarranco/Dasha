import { NavLink, Outlet, Link, Navigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/useAuth';
import { adminSections } from '../../lib/adminSections';

export function AdminLayout() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-lino">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
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
          <aside className="hidden md:block md:w-56 md:flex-shrink-0">
            <nav className="space-y-1">
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
                        : 'text-neutral-600 hover:bg-white hover:text-cobalto',
                    )
                  }
                >
                  <section.icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
            {adminSections.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-cobalto bg-cobalto text-white'
                      : 'border-neutral-200 bg-white text-neutral-600',
                  )
                }
              >
                <section.icon className="h-4 w-4 flex-shrink-0" />
                {section.label}
              </NavLink>
            ))}
          </nav>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
