import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AnimalDetail } from '../components/rehab/AnimalDetail';
import { mockAnimals, type Animal } from '../data/mockAnimals';

export function RehabilitacionPage() {
  const [selected, setSelected] = useState<Animal | null>(null);

  return (
    <div>
      <PageHeader
        title="En rehabilitación"
        subtitle="Conoce a los animales rescatados y apadrina su recuperación."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockAnimals.map((animal, index) => (
          <motion.button
            key={animal.id}
            type="button"
            onClick={() => setSelected(animal)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-shadow hover:shadow-md"
          >
            <img src={animal.photo} alt={animal.name} className="h-40 w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-cobalto">{animal.name}</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  {animal.species === 'perro' ? 'Perro' : 'Gato'}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">{animal.status}</p>
              <div className="mt-3">
                <ProgressBar raised={animal.totalRaised} needed={animal.totalNeeded} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
