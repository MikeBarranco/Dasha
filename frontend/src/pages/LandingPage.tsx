import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { ShapeGrid } from '../components/landing/ShapeGrid';
import { ProblemSection } from '../components/landing/ProblemSection';
import { SolutionSection } from '../components/landing/SolutionSection';
import { StoriesSection } from '../components/landing/StoriesSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { FaqSection } from '../components/landing/FaqSection';
import { CtaSection } from '../components/landing/CtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';

// Logos de aliados: mientras no haya, el espacio no se muestra. Cuando existan,
// aparecen al pie del hero.
const allyLogos: { src: string; name: string }[] = [];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Con sesión iniciada entra directo a la app, no a la portada.
  if (user) return <Navigate to="/mapa" replace />;

  return (
    <div className="relative bg-lino text-neutral-900">
      {/* Fondo animado (rejilla de hexágonos) fijo detrás de TODA la landing */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <ShapeGrid
          speed={0.1}
          squareSize={40}
          direction="diagonal"
          borderColor="#16497c"
          hoverFillColor="#f2780b"
          shape="hexagon"
          hoverTrailAmount={0}
        />
      </div>

      {/* Todo el contenido va por encima de la rejilla */}
      <div className="relative z-10">
        {/* HERO: ocupa toda la pantalla hasta hacer scroll */}
        <div className="relative flex min-h-screen flex-col overflow-hidden">
          {/* Velo suave solo en el hero para que el titular se lea sin competir
              con la rejilla; se desvanece hacia la derecha (zona del video). */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-lino via-lino/60 to-transparent"
            aria-hidden="true"
          />

          <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-mark.png" alt="Dasha" className="h-9 w-9 rounded-full" />
            <span className="font-display text-xl font-bold text-cobalto">Dasha</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-cobalto"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => navigate('/mapa')}
              className="rounded-lg bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ver el mapa
            </button>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
              {/* Izquierda: encabezado + párrafo + llamado a la acción */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="font-display text-4xl font-bold leading-[1.05] text-cobalto sm:text-5xl lg:text-6xl"
                >
                  Convertimos la empatía de Puebla en rescates coordinados.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                  className="mt-5 max-w-md text-lg leading-relaxed text-neutral-600 sm:text-xl"
                >
                  Reportar un animal en la calle ya no se pierde entre mensajes: en Dasha se ve en el
                  mapa, se coordinan voluntarios y aliados, y le das seguimiento hasta su rescate.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                  className="mt-8"
                >
                  <button
                    type="button"
                    onClick={() => navigate('/mapa')}
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-naranja px-6 py-3.5 font-semibold text-white shadow-lg shadow-naranja/20 transition-opacity hover:opacity-90"
                  >
                    Ver el mapa de rescates
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </motion.div>
              </div>

              {/* Derecha: espacio para el video, con marco estilo iOS */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                className="rounded-[1.75rem] border border-white/60 bg-white/70 p-2 shadow-2xl shadow-cobalto/10 backdrop-blur-md ring-1 ring-black/5"
              >
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-cobalto/5 to-naranja/5">
                  <div className="flex flex-col items-center gap-3 text-neutral-400">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
                      <Play className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-medium">Video del mapa en acción</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Aliados: solo aparece cuando existan logos */}
            {allyLogos.length > 0 && (
              <div className="mt-14 border-t border-neutral-200/70 pt-8">
                <p className="text-center text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Con el apoyo de aliados de Puebla
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                  {allyLogos.map((logo) => (
                    <img
                      key={logo.name}
                      src={logo.src}
                      alt={logo.name}
                      className="h-8 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        <ProblemSection />
        <SolutionSection />
        <StoriesSection />
        <FeaturesSection />
        <FaqSection />
        <CtaSection />
        <LandingFooter />
      </div>
    </div>
  );
}
