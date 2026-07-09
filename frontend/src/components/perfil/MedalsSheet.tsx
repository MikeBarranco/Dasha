import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { cn } from '../../lib/cn';
import type { MedalInfo } from '../../data/medals';

type Medal = MedalInfo & { unlocked: boolean };

type MedalsSheetProps = {
  medals: Medal[];
  initialSelectedId?: string | null;
  onClose: () => void;
};

// Hoja con TODAS las medallas: las desbloqueadas a color, las bloqueadas con
// candado. Al tocar una se muestra su nombre y cómo conseguirla. Funciona como
// hoja inferior en móvil y como modal centrado en escritorio.
export function MedalsSheet({ medals, initialSelectedId = null, onClose }: MedalsSheetProps) {
  useLockBodyScroll();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const unlockedCount = medals.filter((medal) => medal.unlocked).length;
  const selected = medals.find((medal) => medal.id === selectedId) ?? null;

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
        className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">Medallas</h2>
            <p className="text-xs text-neutral-500">
              {unlockedCount} de {medals.length} desbloqueadas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {medals.map((medal) => {
              const active = medal.id === selectedId;
              return (
                <button
                  key={medal.id}
                  type="button"
                  onClick={() => setSelectedId(active ? null : medal.id)}
                  className={cn(
                    'flex flex-col items-center rounded-2xl p-2 text-center transition-colors',
                    active && 'bg-cobalto/5',
                  )}
                >
                  <div className="relative h-16 w-16">
                    <img
                      src={medal.image}
                      alt={medal.name}
                      className={cn(
                        'h-full w-full object-contain',
                        !medal.unlocked && 'opacity-40 grayscale',
                      )}
                    />
                    {!medal.unlocked && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900/70 shadow">
                          <Lock className="h-3.5 w-3.5 text-white" />
                        </span>
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-[11px] font-medium leading-tight',
                      medal.unlocked ? 'text-neutral-700' : 'text-neutral-400',
                    )}
                  >
                    {medal.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <p className="font-display text-sm font-bold text-cobalto">{selected.name}</p>
              {selected.unlocked ? (
                <span className="rounded-full bg-exito/10 px-2 py-0.5 text-[10px] font-semibold text-exito">
                  Desbloqueada
                </span>
              ) : (
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  Bloqueada
                </span>
              )}
            </div>
            {selected.unlocked ? (
              <p className="mt-1 text-xs text-neutral-600">{selected.description}</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-700">Cómo conseguirla: </span>
                {selected.description}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
