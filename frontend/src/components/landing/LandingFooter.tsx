import { Link } from 'react-router-dom';
import { SocialLinks } from '../ui/SocialLinks';

// Pie de página de la portada. Marca + redes de un lado; navegación y enlaces
// legales del otro; una línea final con el aviso de proyecto estudiantil.
export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <div className="flex items-center gap-2">
              <img src="/brand/logo-mark.png" alt="Dasha" className="h-8 w-8 rounded-full" />
              <span className="font-display text-lg font-bold text-cobalto">Dasha</span>
            </div>
            <p className="max-w-xs text-center text-sm text-neutral-500 md:text-left">
              Rescate animal comunitario en Puebla.
            </p>
            <SocialLinks />
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500 md:justify-end">
            <Link to="/mapa" className="transition-colors hover:text-cobalto">
              Mapa
            </Link>
            <Link to="/rehabilitacion" className="transition-colors hover:text-cobalto">
              Rehabilitación
            </Link>
            <Link to="/aliados" className="transition-colors hover:text-cobalto">
              Aliados
            </Link>
            <Link to="/impacto" className="transition-colors hover:text-cobalto">
              Impacto
            </Link>
            <Link to="/login" className="transition-colors hover:text-cobalto">
              Iniciar sesión
            </Link>
            <Link to="/terminos" className="transition-colors hover:text-cobalto">
              Términos
            </Link>
            <Link to="/aviso-privacidad" className="transition-colors hover:text-cobalto">
              Aviso de Privacidad
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-neutral-200/70 pt-6 text-center">
          <p className="text-xs text-neutral-400">
            © 2026 Dasha · Proyecto estudiantil sin fines de lucro · Puebla, México
          </p>
        </div>
      </div>
    </footer>
  );
}
