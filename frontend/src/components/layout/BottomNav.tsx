import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { Map as MapIcon, Heart, Plus, Users, HeartHandshake } from 'lucide-react';
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
      className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="bottom-active-pill"
              className="absolute inset-x-1 inset-y-1 -z-0 rounded-2xl bg-cobalto/10"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Icon
            className={cn(
              'relative z-10 h-5 w-5 transition-colors',
              isActive ? 'text-cobalto' : 'text-neutral-400',
            )}
          />
          <span
            className={cn('relative z-10 transition-colors', isActive ? 'text-cobalto' : 'text-neutral-400')}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

type BottomNavProps = {
  onReportClick: () => void;
};

export function BottomNav({ onReportClick }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end rounded-[28px] border border-white/50 bg-white/80 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
        <NavItem to="/mapa" label="Mapa" icon={MapIcon} end />
        <NavItem to="/rehabilitacion" label="Rescates" icon={Heart} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onReportClick}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-naranja text-white shadow-lg shadow-naranja/40 ring-4 ring-lino transition-transform active:scale-95"
            aria-label="Reportar"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
        <NavItem to="/comunidad" label="Comunidad" icon={Users} />
        <NavItem to="/aliados" label="Aliados" icon={HeartHandshake} />
      </div>
    </nav>
  );
}
