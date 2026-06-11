import { NavLink } from 'react-router-dom';
import { Map as MapIcon, Heart, Plus, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type NavItemProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

function NavItem({ to, label, icon: Icon, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
          isActive ? 'text-cobalto' : 'text-neutral-400',
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        <NavItem to="/" label="Mapa" icon={MapIcon} end />
        <NavItem to="/rehabilitacion" label="Rescates" icon={Heart} />
        <div className="flex justify-center">
          <NavLink
            to="/reportar"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-naranja text-white shadow-lg shadow-naranja/40 ring-4 ring-lino"
            aria-label="Reportar"
          >
            <Plus className="h-7 w-7" />
          </NavLink>
        </div>
        <NavItem to="/comunidad" label="Comunidad" icon={Users} />
        <NavItem to="/perfil" label="Perfil" icon={User} />
      </div>
    </nav>
  );
}
