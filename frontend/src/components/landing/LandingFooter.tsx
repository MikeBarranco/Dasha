import { Link } from 'react-router-dom';

// Pie de página de la portada. Sobrio: marca, una línea y accesos rápidos.
export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 md:flex-row md:px-8">
        <div className="flex items-center gap-2">
          <img src="/brand/logo-mark.png" alt="Dasha" className="h-8 w-8 rounded-full" />
          <span className="font-display text-lg font-bold text-cobalto">Dasha</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500">
          <Link to="/mapa" className="transition-colors hover:text-cobalto">
            Mapa
          </Link>
          <Link to="/rehabilitacion" className="transition-colors hover:text-cobalto">
            Rehabilitación
          </Link>
          <Link to="/aliados" className="transition-colors hover:text-cobalto">
            Aliados
          </Link>
          <Link to="/login" className="transition-colors hover:text-cobalto">
            Iniciar sesión
          </Link>
        </nav>

        <p className="text-xs text-neutral-400">© 2026 Dasha · Puebla, México</p>
      </div>
    </footer>
  );
}
