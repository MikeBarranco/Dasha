import { Map, Camera, Search, Building2, Activity, Users } from 'lucide-react';
import { Reveal } from './Reveal';

// Quinta sección: las características de la plataforma. Cada tarjeta describe
// una función real de Dasha.
const features = [
  {
    icon: Map,
    title: 'Mapa interactivo',
    text: 'Todos los reportes activos de Puebla en un mapa, con filtros por tipo y zona.',
  },
  {
    icon: Camera,
    title: 'Reportar en segundos',
    text: 'Ubicación, foto y descripción. Sin cuenta para casos urgentes.',
  },
  {
    icon: Search,
    title: 'Mascotas perdidas',
    text: 'Publica y encuentra animales extraviados con su zona de búsqueda.',
  },
  {
    icon: Building2,
    title: 'Aliados y veterinarias',
    text: 'Directorio de refugios y clínicas que colaboran en los rescates.',
  },
  {
    icon: Activity,
    title: 'Rehabilitación con seguimiento',
    text: 'El avance de cada animal, del rescate a la adopción, con su historia.',
  },
  {
    icon: Users,
    title: 'Comunidad',
    text: 'Voluntarios organizados y un espacio para coordinarse y apoyar.',
  },
];

export function FeaturesSection() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-naranja sm:text-base">
            Qué incluye
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cobalto sm:text-4xl lg:text-5xl">
            Todo lo que un rescate necesita, en un solo lugar.
          </h2>
          <p className="mt-4 text-lg text-neutral-500">
            Y sigue creciendo: nuevas funciones cada semana.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 0.08}>
              <div className="h-full rounded-3xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalto/10 text-cobalto">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-cobalto">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
                  {feature.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
