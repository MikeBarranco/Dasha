import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Dog, Search, X, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ReportChooserProps = {
  open: boolean;
  onClose: () => void;
};

type Option = {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  accent: string;
  iconBg: string;
  iconColor: string;
};

const options: Option[] = [
  {
    to: '/reportar',
    icon: Dog,
    title: 'Reportar perro de calle',
    subtitle: 'Viste un animal que necesita ayuda',
    accent: 'hover:border-naranja',
    iconBg: 'bg-naranja/10',
    iconColor: 'text-naranja',
  },
  {
    to: '/reportar-perdida',
    icon: Search,
    title: 'Busco mi mascota perdida',
    subtitle: 'Tu compañero se perdió y quieres encontrarlo',
    accent: 'hover:border-purpura',
    iconBg: 'bg-purpura/10',
    iconColor: 'text-purpura',
  },
];

export function ReportChooser({ open, onClose }: ReportChooserProps) {
  const navigate = useNavigate();

  const choose = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-cobalto">¿Qué quieres reportar?</h2>
                <p className="mt-0.5 text-sm text-neutral-500">Elige una opción para empezar.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <motion.button
                  key={option.to}
                  type="button"
                  onClick={() => choose(option.to)}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 + index * 0.06, ease: 'easeOut' }}
                  className={`flex w-full items-center gap-4 rounded-2xl border border-neutral-200 p-4 text-left transition-colors ${option.accent}`}
                >
                  <span
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${option.iconBg}`}
                  >
                    <option.icon className={`h-6 w-6 ${option.iconColor}`} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-neutral-800">{option.title}</span>
                    <span className="mt-0.5 block text-sm text-neutral-500">{option.subtitle}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-300" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
