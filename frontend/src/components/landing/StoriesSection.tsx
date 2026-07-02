import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { getAnimals } from '../../lib/api';
import { mockAnimals, type Animal } from '../../data/mockAnimals';

// Cuarta sección: historias reales. Se alimenta de los animales que realmente
// tengamos en rehabilitación (mismo origen que la página de Rehabilitación),
// con los casos de ejemplo como respaldo. Muestra hasta 3; si hay más, se
// enlaza a la página completa (pendiente: carrusel, anotado en el roadmap).
export function StoriesSection() {
  const [animals, setAnimals] = useState<Animal[] | null>(null);

  useEffect(() => {
    let active = true;
    getAnimals()
      .then((data) => {
        if (active) setAnimals(data);
      })
      .catch(() => {
        if (active) setAnimals(mockAnimals);
      });
    return () => {
      active = false;
    };
  }, []);

  // Prioriza los que ya buscan hogar (historias con final feliz) y completa
  // con el resto hasta tener tres.
  const featured = useMemo(() => {
    const list = animals ?? [];
    const adoptable = list.filter((animal) => animal.status === 'Buscando hogar');
    const rest = list.filter((animal) => animal.status !== 'Buscando hogar');
    return [...adoptable, ...rest].slice(0, 3);
  }, [animals]);

  if (featured.length === 0) return null;

  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-naranja sm:text-base">
            Historias reales
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cobalto sm:text-4xl lg:text-5xl">
            No son casos hipotéticos: son perritos de Puebla.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featured.map((animal, index) => (
            <Reveal key={animal.id} delay={index * 0.12}>
              <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <img
                  src={animal.photos[animal.photos.length - 1]}
                  alt={animal.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="h-52 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-cobalto">{animal.name}</h3>
                    <span className="rounded-full bg-exito/10 px-2.5 py-0.5 text-[11px] font-medium text-exito">
                      {animal.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
                    {animal.story}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <Link
            to="/rehabilitacion"
            className="group inline-flex items-center gap-2 text-base font-semibold text-cobalto hover:underline"
          >
            Conoce a todos los rescatados
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
