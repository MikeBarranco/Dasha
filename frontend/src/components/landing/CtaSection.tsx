import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

// Séptima sección: llamado a la acción final para convertir al visitante.
export function CtaSection() {
  const navigate = useNavigate();

  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <Reveal className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-cobalto px-6 py-16 text-center shadow-xl shadow-cobalto/20 sm:px-12">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-naranja/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-purpura/20 blur-3xl"
            aria-hidden="true"
          />
          <h2 className="relative font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Cada reporte puede cambiar una vida.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-lg leading-relaxed text-white/80 sm:text-xl">
            Sé parte de la red que está ordenando el rescate animal en Puebla.
          </p>
          <button
            type="button"
            onClick={() => navigate('/mapa')}
            className="group relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-naranja px-7 py-3.5 font-semibold text-white shadow-lg shadow-naranja/25 transition-opacity hover:opacity-90"
          >
            Ver el mapa de rescates
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </Reveal>
    </section>
  );
}
