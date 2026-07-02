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

        {/* Imagen centrada del producto (Miguel colocará la captura del mapa) */}
        <Reveal delay={0.1} className="mt-12">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-neutral-200 bg-white p-2 shadow-xl shadow-cobalto/5">
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-cobalto/5 to-naranja/5">
              <div className="flex flex-col items-center gap-3 text-neutral-400">
                <MapPin className="h-8 w-8 text-cobalto/40" />
                <span className="text-sm font-medium">Captura del mapa de Dasha</span>
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
