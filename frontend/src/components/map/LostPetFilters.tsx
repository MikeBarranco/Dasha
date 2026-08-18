import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/cn';

// Especie de la mascota perdida. Reutilizamos el mismo tipo que LostPet.
export type LostSpecies = 'perro' | 'gato';

const speciesOptions: { value: LostSpecies; label: string; color: string }[] = [
  { value: 'perro', label: 'Perros', color: '#1C4E80' },
  { value: 'gato', label: 'Gatos', color: '#F2780B' },
];

type LostPetFiltersProps = {
  activeSpecies: LostSpecies[];
  onChange: (species: LostSpecies[]) => void;
};

// Filtro de especie para el modo Perdidos, con la misma forma que AllyFilters:
// chips de selección múltiple; sin selección se muestran todas.
export function LostPetFilters({ activeSpecies, onChange }: LostPetFiltersProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: LostSpecies) => {
    onChange(
      activeSpecies.includes(value)
        ? activeSpecies.filter((s) => s !== value)
        : [...activeSpecies, value],
    );
  };

  return (
    <div className="relative min-w-0">
      <div className="flex items-center justify-end gap-3">
        {activeSpecies.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-xs font-medium text-cobalto transition-colors hover:text-cobalto/80"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
          Filtros
          {activeSpecies.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cobalto px-1.5 text-[11px] font-semibold text-white">
              {activeSpecies.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[78vw] rounded-2xl border border-neutral-200 bg-white shadow-lg"
          >
            <div className="p-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Especie
              </p>
              <div className="flex flex-wrap gap-2">
                {speciesOptions.map((option) => {
                  const active = activeSpecies.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-cobalto bg-cobalto text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: active ? '#ffffff' : option.color }}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-neutral-400">
                Sin seleccionar, se muestran todas.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
