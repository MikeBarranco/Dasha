import { motion } from 'motion/react';
import { X, Share, SquarePlus, Check } from 'lucide-react';

type InstallInstructionsProps = {
  onClose: () => void;
};

const steps = [
  {
    icon: Share,
    text: 'Toca el botón Compartir en la barra de tu navegador.',
  },
  {
    icon: SquarePlus,
    text: 'Elige “Añadir a pantalla de inicio”.',
  },
  {
    icon: Check,
    text: 'Confirma y Dasha quedará como una app en tu teléfono.',
  },
];

// Instrucciones para instalar la PWA en iOS (Safari no ofrece el instalador
// automático, hay que hacerlo a mano desde Compartir).
export function InstallInstructions({ onClose }: InstallInstructionsProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">Instala Dasha</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-neutral-600">
            Tenla siempre a la mano, como una app, y recibe avisos de los animalitos que sigues.
          </p>

          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-center gap-3 rounded-2xl bg-lino p-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="font-display font-bold text-cobalto">{index + 1}.</span>
                  {step.text}
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
}
