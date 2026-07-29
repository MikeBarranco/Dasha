import { useEffect, useState } from 'react';
import { Flower2, AlertCircle, RefreshCw } from 'lucide-react';
import { getDeceasedAnimals } from '../lib/api';
import type { Animal } from '../data/mockAnimals';

// "Los que recordamos": memorial de los animalitos que no lograron salir
// adelante. Es una vitrina respetuosa, sin barras de apadrinamiento ni acciones;
// solo su foto, su nombre y su historia.
export function MemorialPage() {
  const [animals, setAnimals] = useState<Animal[] | null>(null);
  const [error, setError] = useState(false);

  // Solo actualiza estado en el .then/.catch (no de forma síncrona), para no
  // disparar setState dentro del cuerpo del efecto.
  const fetchAnimals = (isActive: () => boolean) => {
    getDeceasedAnimals()
      .then((data) => {
        if (isActive()) setAnimals(data);
      })
      .catch(() => {
        if (isActive()) {
          setAnimals([]);
          setError(true);
        }
      });
  };

  useEffect(() => {
    let active = true;
    fetchAnimals(() => active);
    return () => {
      active = false;
    };
  }, []);

  // Reintento: el reset síncrono va aquí (event handler), no en el efecto.
  const retry = () => {
    setError(false);
    setAnimals(null);
    fetchAnimals(() => true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-cobalto">
        <Flower2 className="h-6 w-6 text-purpura" /> Los que recordamos
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        No todos lograron salir adelante. Aquí honramos a los animalitos que se nos adelantaron;
        gracias a quienes intentaron ayudarlos, no estuvieron solos.
      </p>

      {animals === null && !error && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="aspect-square animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
          <AlertCircle className="h-7 w-7 text-alerta" />
          <p className="mt-2 font-semibold text-neutral-700">No pudimos cargar el memorial</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      )}

      {animals !== null && !error && animals.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
          <Flower2 className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-semibold text-neutral-700">Aún no hay memorias aquí</p>
          <p className="mt-1 text-sm text-neutral-500">
            Ojalá siga siendo así el mayor tiempo posible.
          </p>
        </div>
      )}

      {animals !== null && animals.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {animals.map((animal) => (
            <article
              key={animal.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <img
                src={animal.photos[0]}
                alt={animal.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/placeholder-animal.svg';
                }}
                className="aspect-square w-full object-cover grayscale"
              />
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-neutral-800">{animal.name}</p>
                {animal.story && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{animal.story}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
