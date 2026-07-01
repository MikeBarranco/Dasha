import { Link, NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { NotificationsBell } from './NotificationsBell';
import { useAvatar } from '../../lib/useAvatar';
import { useAuth } from '../../lib/useAuth';

const navItems = [
  { to: '/', label: 'Mapa', end: true },
  { to: '/rehabilitacion', label: 'Rehabilitación', end: false },
  { to: '/comunidad', label: 'Comunidad', end: false },
  { to: '/aliados', label: 'Aliados', end: false },
];

type TopBarProps = {
  onReportClick: () => void;
};

export function TopBar({ onReportClick }: TopBarProps) {
  const { avatar } = useAvatar();
  const { user: account } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-lino/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src="/brand/logo-mark.png" alt="Dasha" className="h-9 w-9 rounded-full" />
          <span className="font-display text-xl font-bold text-cobalto">Dasha</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-cobalto/10 text-cobalto' : 'text-neutral-500 hover:text-cobalto',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReportClick}
            className="hidden rounded-lg bg-naranja px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:inline-flex"
          >
            Reportar
          </button>
          <NotificationsBell />
          {account ? (
            <Link to="/perfil" aria-label="Mi perfil">
              <Avatar name={account.name} src={avatar} className="h-9 w-9 text-sm" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
