import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { InteractiveDotBackground } from '../components/landing/InteractiveDotBackground';
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
  
  const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

  // Con sesión iniciada entra directo a la app, no a la portada.
  if (user) return <Navigate to="/mapa" replace />;

  return (
    <div className="relative bg-lino text-neutral-900">
      {/* Fondo animado de puntos interactivos */}
      <div className="fixed inset-0 z-0 pointer-events-auto" aria-hidden="true">
        <InteractiveDotBackground />
      </div>

      {/* Todo el contenido va por encima del fondo */}
      <div className="relative z-10">
        {/* HERO: ocupa toda la pantalla hasta hacer scroll */}
        <div className="relative flex min-h-screen flex-col overflow-hidden">
          {/* Velo suave solo en el hero para que el titular se lea sin competir
              con el fondo; se desvanece hacia la derecha (zona del video). */}
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
          <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-12 relative z-20">
            <div className="w-full lg:w-1/2 flex flex-col items-start text-left z-20">
              {/* Encabezado + párrafo + llamado a la acción */}
              <motion.h1
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.8, delay: 0.4, ease: cinematicEase }}
                className="font-display text-4xl font-bold leading-[1.05] text-cobalto sm:text-5xl lg:text-6xl"
              >
                Convertimos la empatía de Puebla en rescates coordinados.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.8, delay: 0.8, ease: cinematicEase }}
                className="mt-6 max-w-md text-lg leading-relaxed text-neutral-600 sm:text-xl pointer-events-auto"
              >
                Reportar un animal en la calle ya no se pierde entre mensajes: en Dasha se ve en el
                mapa, se coordinan voluntarios y aliados, y le das seguimiento hasta su rescate.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.8, delay: 1.2, ease: cinematicEase }}
                className="mt-8 pointer-events-auto"
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
          </div>
          
          {/* Figuras de Fondo Fijas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.5, delay: 1.0, ease: cinematicEase }}
            className="absolute bottom-[25vh] right-[22%] h-[350px] w-[350px] rounded-full bg-naranja z-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(white 15%, transparent 16%)', backgroundSize: '20px 20px' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: -15 }}
            transition={{ duration: 2.5, delay: 1.5, ease: cinematicEase }}
            className="absolute -bottom-[5vh] right-0 h-[550px] w-[500px] bg-cobalto/15 z-0 pointer-events-none"
            style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.5, delay: 2.0, ease: cinematicEase }}
            className="absolute bottom-[50vh] right-[35%] h-10 w-10 rounded-full bg-purpura z-10 pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.5, delay: 2.0, ease: cinematicEase }}
            className="absolute bottom-[15vh] right-[30%] h-5 w-5 rounded-full bg-naranja z-10 pointer-events-none"
          />

          {/* CONTENEDOR GRÁFICO (Perrita) */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 2.5, delay: 1.8, ease: cinematicEase }}
            className="absolute bottom-0 right-[-5%] md:right-[2%] lg:right-[8%] z-10 w-full max-w-[350px] md:max-w-[450px] lg:max-w-[500px] pointer-events-none"
          >
            <img 
              src="/brand/perrita-perfil-transparente.png" 
              alt="Perrita Dasha" 
              className="object-contain object-bottom w-full"
              style={{ maxHeight: '85vh' }}
            />
          </motion.div>
        </div>

          {/* Aliados: solo aparece cuando existan logos */}
          {allyLogos.length > 0 && (
            <div className="mx-auto w-full max-w-7xl px-6 pb-10 md:px-12 relative z-20">
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
            </div>
          )}
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
