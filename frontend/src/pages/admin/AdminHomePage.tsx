import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { adminSections } from '../../lib/adminSections';

export function AdminHomePage() {
  const { user } = useAuth();
  const sections = adminSections.filter((section) => section.to !== '/admin');
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">
        Hola{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Desde aquí gestionas el contenido de Dasha. Elige una sección para empezar.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-cobalto/40 hover:bg-neutral-50"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto/10 text-cobalto">
              <section.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-800">{section.label}</p>
              <p className="truncate text-xs text-neutral-500">{section.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
