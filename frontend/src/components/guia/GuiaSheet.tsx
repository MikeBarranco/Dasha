import { motion } from 'motion/react';
import { X, ShieldCheck, Info } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { GuiaAccordion } from './GuiaAccordion';

type GuiaSheetProps = {
  // Situación que se abre primero (según lo que reportó el usuario).
  defaultOpenId?: string | null;
  onClose: () => void;
};

// Muestra la guía "qué hacer mientras llega la ayuda" como hoja encima de la
// pantalla actual. Se usa desde Reportar para que el usuario la consulte SIN
// salir del formulario y sin perder la foto ni los datos que ya llenó.
export function GuiaSheet({ defaultOpenId, onClose }: GuiaSheetProps) {
  useLockBodyScroll();

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">
              Qué hacer mientras llega ayuda
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Consulta la guía sin salir de tu reporte; tus datos se conservan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 text-sm text-neutral-600">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
            <p>
              Es orientación general de primeros auxilios;{' '}
              <span className="font-medium">no sustituye la atención veterinaria</span>. Ante
              cualquier duda o emergencia, contacta a un veterinario o aliado.
            </p>
          </div>

          <GuiaAccordion defaultOpenId={defaultOpenId} />

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Contenido de bienestar animal, pensado para validarse con un veterinario aliado.
          </p>
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-cobalto py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Volver a mi reporte
          </button>
        </div>
      </motion.div>
    </div>
  );
}
