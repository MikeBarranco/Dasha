import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Heart, AlertCircle, RefreshCw, PawPrint } from 'lucide-react';
import { getAdoptedAnimals, getMyAdoptedAnimals } from '../lib/api';
import type { Animal } from '../data/mockAnimals';
import { useAuth } from '../lib/useAuth';
import { AdoptadoSheet } from '../components/adoptados/AdoptadoSheet';

export function AdoptadosPage() {
  const { user } = useAuth();
  const [gallery, setGallery] = useState<Animal[] | null>(null);
  const [galleryError, setGalleryError] = useState(false);
  const [mine, setMine] = useState<Animal[]>([]);
  const [selected, setSelected] = useState<Animal | null>(null);

  const loadGallery = () => {
    getAdoptedAnimals()
      .then((data) => {
        setGallery(data);
        setGalleryError(false);
      })
      .catch(() => {
        setGalleryError(true);
        setGallery([]);
      });
  };

  const loadMine = () => {
    if (!user) return;
    getMyAdoptedAnimals()
      .then(setMine)
      .catch(() => setMine([]));
  };

  useEffect(() => {
    loadGallery();
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const mineIds = new Set(mine.map((animal) => animal.id));
  const editableSelected = selected ? mineIds.has(selected.id) : false;

  const refresh = () => {
    loadGallery();
    loadMine();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-cobalto">
        <Heart className="h-6 w-6 text-purpura" /> Álbum de adoptados
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Los finales felices de Dasha. Cada uno pasó de la calle a un hogar; sus familias siguen
        compartiendo cómo van creciendo.
      </p>

      {mine.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-cobalto">Mis adoptados</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mine.map((animal) => (
              <button
                key={animal.id}
                type="button"
                onClick={() => setSelected(animal)}
                className="overflow-hidden rounded-2xl border border-purpura/30 bg-purpura/5 text-left"
              >
                <img
                  src={animal.photos[0]}
                  alt={animal.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-neutral-800">{animal.name}</p>
                  <p className="text-xs font-medium text-purpura">Agregar un momento</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        {mine.length > 0 && (
          <h2 className="mb-3 text-sm font-semibold text-cobalto">Todos los finales felices</h2>
        )}

        {gallery === null && !galleryError && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="aspect-square animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {galleryError && (
          <div className="flex flex-col items-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No pudimos cargar el álbum</p>
            <button
              type="button"
              onClick={loadGallery}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Reintentar
            </button>
          </div>
        )}

        {gallery !== null && !galleryError && gallery.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <PawPrint className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">Aún no hay adoptados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando un rescatado encuentre hogar, su historia aparecerá aquí.
            </p>
          </div>
        )}

        {gallery !== null && gallery.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((animal) => (
              <button
                key={animal.id}
                type="button"
                onClick={() => setSelected(animal)}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-shadow hover:shadow-md"
              >
                <img
                  src={animal.photos[0]}
                  alt={animal.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-neutral-800">{animal.name}</p>
                  {animal.story && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{animal.story}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selected && (
          <AdoptadoSheet
            animal={selected}
            editable={editableSelected}
            onClose={() => setSelected(null)}
            onAdded={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
