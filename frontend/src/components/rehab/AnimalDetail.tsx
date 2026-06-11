import { motion } from 'motion/react';
import { X, Heart, Gift, Stethoscope, MapPin } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import type { Animal } from '../../data/mockAnimals';

type AnimalDetailProps = {
  animal: Animal;
  onClose: () => void;
};

export function AnimalDetail({ animal, onClose }: AnimalDetailProps) {
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
          <img src={animal.photo} alt={animal.name} className="h-56 w-full object-cover" />
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

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purpura py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Heart className="h-5 w-5" /> Apadrinar
            </button>
            <button
              type="button"
              aria-label="Ofrecer recurso"
              className="flex items-center justify-center rounded-xl border border-neutral-200 px-4 text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Gift className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
