import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Heart, Gift, Stethoscope, MapPin, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import { cn } from '../../lib/cn';
import type { Animal } from '../../data/mockAnimals';

type AnimalDetailProps = {
  animal: Animal;
  onClose: () => void;
};

export function AnimalDetail({ animal, onClose }: AnimalDetailProps) {
  const total = animal.photos.length;
  const [activePhoto, setActivePhoto] = useState(total - 1);
  const [showFull, setShowFull] = useState(false);
  const photo = animal.photos[activePhoto];

  const goNext = () => setActivePhoto((index) => (index + 1) % total);
  const goPrev = () => setActivePhoto((index) => (index - 1 + total) % total);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFull(true)}
            className="block w-full"
            aria-label="Ver foto completa"
          >
            <img src={photo} alt={animal.name} className="h-64 w-full object-cover" />
          </button>
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-cobalto">
            {animal.status}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto px-5 pt-4">
            {animal.photos.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setActivePhoto(index)}
                className={cn(
                  'h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2',
                  index === activePhoto ? 'border-cobalto' : 'border-transparent',
                )}
              >
                <img src={item} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-cobalto">{animal.name}</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              {animal.species === 'perro' ? 'Perro' : 'Gato'}
            </span>
          </div>

          <p className="mt-3 text-sm text-neutral-600">{animal.story}</p>

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            <p className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-cobalto" /> {animal.diagnosis}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cobalto" /> {animal.vet}
            </p>
          </div>

          <div className="mt-5">
            <ProgressBar raised={animal.totalRaised} needed={animal.totalNeeded} />
          </div>

          {animal.timeline && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Su historia</p>
              <ol className="space-y-3">
                {animal.timeline.map((event) => (
                  <li key={event.title} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cobalto" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      <p className="text-xs text-neutral-400">{event.when}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {animal.status === 'Buscando hogar' && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-exito py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Home className="h-5 w-5" /> Quiero adoptar a {animal.name}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl bg-purpura py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Heart className="h-5 w-5" /> Apadrinar
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Gift className="h-5 w-5" /> Donar cosas
              </button>
            </div>
            <p className="text-center text-xs text-neutral-400">
              Apadrina con la cantidad que quieras. También puedes donar croquetas, transporte u
              hogar temporal.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showFull && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFull(false)}
          >
            <img
              src={photo}
              alt={animal.name}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-xl object-contain"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {activePhoto + 1} / {total}
                </span>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowFull(false)}
              aria-label="Cerrar foto"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
