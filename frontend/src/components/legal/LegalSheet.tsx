import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { TerminosContent, AvisoPrivacidadContent } from './LegalContent';

export type LegalDoc = 'terminos' | 'aviso';

type LegalSheetProps = {
  doc: LegalDoc;
  onClose: () => void;
};

const meta: Record<LegalDoc, string> = {
  terminos: 'Términos y Condiciones',
  aviso: 'Aviso de Privacidad',
};

// Muestra los Términos o el Aviso de Privacidad como hoja encima de la pantalla
// actual. Se usa desde el registro para que la persona los consulte SIN salir del
// formulario y sin perder lo que ya escribió (mismo patrón que GuiaSheet).
export function LegalSheet({ doc, onClose }: LegalSheetProps) {
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
            <h2 className="font-display text-lg font-bold text-cobalto">{meta[doc]}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Consúltalo sin salir del registro; tus datos se conservan.
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
          {doc === 'terminos' ? <TerminosContent linkToOther={false} /> : <AvisoPrivacidadContent />}
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-cobalto py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Volver a mi registro
          </button>
        </div>
      </motion.div>
    </div>
  );
}
