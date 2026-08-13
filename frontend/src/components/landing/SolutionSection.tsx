import { MapPin, HeartHandshake, Route } from 'lucide-react';
import { Reveal } from './Reveal';

// Tercera sección: presenta la solución que ofrece Dasha. Todo centrado:
// título, párrafo, imagen del producto y, debajo, tres beneficios con icono.
const benefits = [
  {
    icon: MapPin,
    title: 'Todo en el mapa',
    text: 'Cada reporte aparece con su ubicación exacta, foto y descripción. Nada se pierde entre mensajes.',
  },
  {
    icon: HeartHandshake,
    title: 'Voluntarios y aliados',
    text: 'Quien puede ayudar ve el reporte, se coordina y evita que varios vayan al mismo lugar.',
  },
  {
    icon: Route,
    title: 'Seguimiento real',
    text: 'Del rescate a la recuperación: el estado de cada caso queda registrado y a la vista de todos.',
  },
];

export function SolutionSection() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-naranja sm:text-base">
            La solución
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cobalto sm:text-4xl lg:text-5xl">
            Dasha convierte esa empatía en un rescate coordinado.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-neutral-600 sm:text-xl">
            Una plataforma donde cualquier persona reporta, los voluntarios responden
            y toda la comunidad ve lo que pasa en Puebla, en un solo lugar.
          </p>
        </Reveal>

        {/* Vista estilizada del mapa (mientras no haya una captura real con datos):
            cuadrícula tipo mapa + ruta punteada + pines + chip "en vivo". */}
        <Reveal delay={0.1} className="mt-12">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-neutral-200 bg-white p-2 shadow-xl shadow-cobalto/5">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-cobalto/5 to-naranja/5">
              {/* Cuadrícula de calles */}
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #1C4E80 1px, transparent 1px), linear-gradient(to bottom, #1C4E80 1px, transparent 1px)',
                  backgroundSize: '38px 38px',
                }}
                aria-hidden="true"
              />
              {/* Ruta del rescate */}
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 400 225"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M64 168 C 140 130, 175 96, 250 78 S 330 64, 344 62"
                  stroke="#F2780B"
                  strokeWidth="2.5"
                  strokeDasharray="6 8"
                  strokeLinecap="round"
                />
              </svg>
              {/* Pines de reportes */}
              <MapPin className="absolute left-[16%] top-[70%] h-7 w-7 -translate-x-1/2 -translate-y-full text-cobalto drop-shadow-sm" />
              <MapPin className="absolute left-[62%] top-[34%] h-9 w-9 -translate-x-1/2 -translate-y-full text-naranja drop-shadow" />
              <MapPin className="absolute left-[86%] top-[28%] h-6 w-6 -translate-x-1/2 -translate-y-full text-cobalto drop-shadow-sm" />
              {/* Chip en vivo */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-cobalto shadow-sm backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-naranja/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-naranja" />
                </span>
                Rescates en Puebla, en vivo
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
          {benefits.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.1} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalto/10 text-cobalto">
                <benefit.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-cobalto">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
                {benefit.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
